<template>
  <Teleport to="body">
    <div class="overlay" @click="$emit('close')">
      <div class="panel" @click.stop>
        <div class="panel-header">
          <div class="header-left">
            <span class="station-name">{{ station.name }}</span>
            <span class="river-badge">{{ station.river || '—' }}</span>
            <span v-if="distance != null" class="dist-badge">{{ distance.toFixed(1) }} km</span>
            <span class="period-badge">{{ locale === 'en' ? 'Live' : '即時' }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="panel-body">
          <div class="meta-row">
            <span>{{ locale === 'en' ? 'ID' : '站號' }} {{ station.id }}</span>
            <span v-if="station.address">{{ station.address }}</span>
          </div>

          <div v-if="loading" class="state-msg">{{ locale === 'en' ? 'Loading water level...' : '載入水位資料中...' }}</div>
          <template v-else-if="error">
            <div class="state-msg error">{{ error }}</div>
            <button class="retry-btn" @click="load">{{ locale === 'en' ? 'Retry' : '重試' }}</button>
          </template>
          <template v-else-if="series">
            <div v-if="latest != null" class="latest-row">
              {{ locale === 'en' ? 'Current level' : '目前水位' }} <strong>{{ latest }} m</strong>
              <span class="latest-time">{{ latestTime }}</span>
            </div>
            <div v-if="levelStatus" class="status-card" :class="`status-${levelStatus.tone}`">
              <div class="status-title">{{ levelStatus.title }}</div>
              <div class="status-note">{{ levelStatus.note }}</div>
              <div v-if="hasAlertLevels" class="alert-levels">
                <span v-if="station.alert1 != null">{{ locale === 'en' ? 'Lv.1' : '一級' }} {{ formatLevel(station.alert1) }}m</span>
                <span v-if="station.alert2 != null">{{ locale === 'en' ? 'Lv.2' : '二級' }} {{ formatLevel(station.alert2) }}m</span>
                <span v-if="station.alert3 != null">{{ locale === 'en' ? 'Lv.3' : '三級' }} {{ formatLevel(station.alert3) }}m</span>
              </div>
            </div>
            <WaterLevelChart v-if="series.points.length > 1" :series="chartSeries" :y-label="locale === 'en' ? 'Level (m)' : '水位 (m)'" />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import WaterLevelChart from './WaterLevelChart.vue'
import { fetchWaterLevel, type WaterLevelSeries, type WaterStation } from '../lib/waterLevel'
import type { ChartSeries } from '../lib/chart'
import { locale } from '../lib/locale'

const props = withDefaults(defineProps<{ station: WaterStation; days?: number; distance?: number }>(), {
  days: 7,
})
defineEmits<{ close: [] }>()

const loading = ref(false)
const error = ref<string | null>(null)
const series = ref<WaterLevelSeries | null>(null)
let loadRequestId = 0

async function load() {
  const stationId = props.station.id
  const days = props.days
  const requestId = ++loadRequestId
  const isCurrentRequest = () => requestId === loadRequestId && props.station.id === stationId && props.days === days

  loading.value = true
  error.value = null
  series.value = null
  try {
    const nextSeries = await fetchWaterLevel(stationId, days)
    if (!isCurrentRequest()) return
    series.value = nextSeries
  } catch (e) {
    if (!isCurrentRequest()) return
    error.value = e instanceof Error ? e.message : (locale.value === 'en' ? 'Unable to load water level data' : '水位資料暫時無法載入')
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

onMounted(load)
watch(() => [props.station.id, props.days], load)

const latest = computed(() => {
  const points = series.value?.points
  if (!points) return null
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].value
    if (v != null) return v
  }
  return null
})

const latestTime = computed(() => {
  const points = series.value?.points
  if (!points) return ''
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value != null) {
      const d = new Date(points[i].time)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
    }
  }
  return ''
})

const hasAlertLevels = computed(() => [props.station.alert1, props.station.alert2, props.station.alert3].some(level => level != null))

function formatLevel(level: number) {
  return String(parseFloat(level.toFixed(2)))
}

const levelStatus = computed(() => {
  const value = latest.value
  const isEn = locale.value === 'en'
  if (value == null) return null
  if (!hasAlertLevels.value) {
    return {
      tone: 'unknown',
      title: isEn ? 'No alert level set' : '未設定警戒水位',
      note: isEn ? 'Use upstream rainfall and weather before deciding.' : '請搭配上游雨量與天氣判斷。',
    }
  }
  if (props.station.alert1 != null && value >= props.station.alert1) {
    return {
      tone: 'danger',
      title: isEn ? 'Above Alert Lv.1' : '已達一級警戒',
      note: isEn ? 'Do not enter the canyon.' : '不建議進入溪谷。',
    }
  }
  if (props.station.alert2 != null && value >= props.station.alert2) {
    return {
      tone: 'warning',
      title: isEn ? 'Above Alert Lv.2' : '已達二級警戒',
      note: isEn ? 'Water level is already high.' : '水位已偏高，請避免下溪。',
    }
  }
  if (props.station.alert3 != null && value >= props.station.alert3) {
    return {
      tone: 'watch',
      title: isEn ? 'Above Alert Lv.3' : '已達三級警戒',
      note: isEn ? 'Conditions may change quickly.' : '溪況可能快速變化，需保守判斷。',
    }
  }

  const nextAlert = [
    { level: props.station.alert3, label: isEn ? 'Lv.3' : '三級警戒' },
    { level: props.station.alert2, label: isEn ? 'Lv.2' : '二級警戒' },
    { level: props.station.alert1, label: isEn ? 'Lv.1' : '一級警戒' },
  ]
    .filter((item): item is { level: number; label: string } => item.level != null && item.level > value)
    .sort((a, b) => a.level - b.level)[0]

  return {
    tone: 'normal',
    title: isEn ? 'Below alert level' : '低於警戒水位',
    note: nextAlert
      ? (isEn ? `${formatLevel(nextAlert.level - value)}m below ${nextAlert.label}.` : `距離${nextAlert.label}還有 ${formatLevel(nextAlert.level - value)}m。`)
      : (isEn ? 'Use upstream rainfall and weather before deciding.' : '仍需搭配上游雨量與天氣判斷。'),
  }
})

const chartSeries = computed<ChartSeries[]>(() => {
  const points = series.value?.points
  if (!points) return []
  const result: ChartSeries[] = [
    { label: '水位 (m)', color: '#43AEDB', points },
  ]
  const addAlert = (level: number | null, label: string, color: string) => {
    if (level == null) return
    result.push({
      label,
      color,
      dashed: true,
      points: points.map(p => ({ time: p.time, value: level })),
    })
  }
  const isEn = locale.value === 'en'
  addAlert(props.station.alert3, isEn ? 'Alert Lv.3' : '三級警戒', '#f0d977')
  addAlert(props.station.alert2, isEn ? 'Alert Lv.2' : '二級警戒', '#ff8076')
  addAlert(props.station.alert1, isEn ? 'Alert Lv.1' : '一級警戒', '#e63946')
  return result
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.panel {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 880px;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2a2a4a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.station-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.river-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #1e2d6b;
  color: #6c8ef5;
}

.period-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #2a2a4a;
  color: #aaa;
}

.dist-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #1a2a1a;
  color: #5ecb6f;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.panel-body {
  padding: 18px 24px 24px;
  overflow-y: auto;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.875rem;
  color: #888;
  margin-bottom: 14px;
}

.state-msg {
  font-size: 0.875rem;
  color: #888;
  padding: 24px 0;
  text-align: center;
}
.state-msg.error { color: #e05c5c; }

.latest-row {
  font-size: 0.95rem;
  color: #ccc;
  margin-bottom: 12px;
}
.latest-row strong {
  color: #43AEDB;
  font-size: 1.2rem;
}
.latest-time {
  margin-left: 8px;
  font-size: 0.75rem;
  color: #666;
}

.status-card {
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: #171733;
}

.status-title {
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.status-note {
  font-size: 0.875rem;
  color: #bbb;
}

.alert-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.75rem;
  color: #999;
}

.alert-levels span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #222244;
}

.status-normal { border-color: #2f8f5b; }
.status-watch { border-color: #b59b2a; }
.status-warning { border-color: #c86a35; }
.status-danger { border-color: #e05c5c; }
.status-unknown { border-color: #44445f; }
</style>
