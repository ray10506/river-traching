<template>
  <Teleport to="body">
    <div class="card-overlay" @click="$emit('close')"></div>
    <div class="popup" :style="popupStyle">
      <div class="arrow" :class="arrowSide"></div>
      <div class="popup-header">
        <div class="header-left">
          <span class="name">{{ station.name }}</span>
          <span class="station-id">({{ station.station_id }})</span>
          <span v-if="distance != null" class="dist-badge">{{ distance.toFixed(1) }} km</span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="badge-row">
        <button :class="['period-btn', { active: mode === 'live' }]" @click="selectMode('live')">{{ locale === 'en' ? 'Live' : '即時' }}</button>
        <button :class="['period-btn', { active: mode === '7' }]" @click="selectMode('7')">{{ locale === 'en' ? '7 days' : '近 7 天' }}</button>
        <button :class="['period-btn', { active: mode === '14' }]" @click="selectMode('14')">{{ locale === 'en' ? '14 days' : '近 14 天' }}</button>
      </div>

      <div class="popup-body">
        <div v-if="loading" class="state">{{ locale === 'en' ? 'Loading...' : '載入中...' }}</div>
        <template v-else-if="error">
          <div class="state error">{{ error }}</div>
          <button class="retry-btn" @click="fetchData">{{ locale === 'en' ? 'Retry' : '重試' }}</button>
        </template>
        <template v-else-if="mode === 'live' && data">
          <div class="row" v-for="item in rainItems" :key="item.label">
            <span class="row-label">{{ item.label }}</span>
            <span class="row-value">{{ item.value }}</span>
          </div>
          <div v-if="data.updateTime" class="update-time">{{ data.updateTime }} {{ locale === 'en' ? 'updated' : '更新' }}</div>
        </template>
        <template v-else-if="currentHistory">
          <div class="history-total">{{ currentHistory.total }} {{ currentHistory.unit }}</div>
          <div class="history-range">{{ currentHistory.from }} - {{ currentHistory.to }}</div>
          <div class="update-time">{{ currentHistory.daysIncluded }} {{ locale === 'en' ? 'days included' : '日資料' }}</div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { RainfallStation } from '../lib/rainfall'
import { fetchRainfallData, fetchRainfallHistory, type RainfallData, type RainfallHistoryData } from '../lib/rainfallData'
import { clamp } from '../lib/clamp'
import { locale } from '../lib/locale'

const CARD_W = 240
const CARD_OFFSET = 28
const MARGIN = 12
const ESTIMATED_H = 360

const props = defineProps<{
  station: RainfallStation
  pos: { x: number; y: number }
  distance?: number
}>()
defineEmits<{ close: [] }>()

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<RainfallData | null>(null)
const mode = ref<'live' | '7' | '14'>('live')
const historyCache = ref<Record<'7' | '14', RainfallHistoryData | null>>({ '7': null, '14': null })

const arrowSide = computed(() => {
  return props.pos.x + CARD_OFFSET + CARD_W + MARGIN <= window.innerWidth ? 'arrow-left' : 'arrow-right'
})

const popupStyle = computed(() => {
  const onRight = props.pos.x + CARD_OFFSET + CARD_W + MARGIN <= window.innerWidth
  let left = onRight ? props.pos.x + CARD_OFFSET : props.pos.x - CARD_OFFSET - CARD_W
  // iconAnchor=[14,26] → anchor at bottom; icon centre is 13px above anchor
  // arrow css top:36px, arrow height 8px → arrow centre at cardTop+44
  // want cardTop+44 = pos.y-13  →  cardTop = pos.y-57
  let top = props.pos.y - 57

  left = clamp(left, MARGIN, window.innerWidth - CARD_W - MARGIN)
  top = clamp(top, MARGIN, window.innerHeight - ESTIMATED_H - MARGIN)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${CARD_W}px`,
  }
})

const rainItems = computed(() => {
  if (!data.value) return []
  const en = locale.value === 'en'
  return [
    { label: en ? '10 min'   : '十分鐘', value: `${data.value.past10min} mm` },
    { label: en ? '1 hr'     : '一小時',  value: `${data.value.past1hr} mm` },
    { label: en ? '3 hr'     : '三小時',  value: `${data.value.past3hr} mm` },
    { label: en ? '6 hr'     : '六小時',  value: `${data.value.past6hr} mm` },
    { label: en ? '12 hr'    : '12 小時', value: `${data.value.past12hr} mm` },
    { label: en ? '24 hr'    : '24 小時', value: `${data.value.past24hr} mm` },
    { label: en ? '2 days'   : '二日',    value: `${data.value.past2days} mm` },
    { label: en ? '3 days'   : '三日',    value: `${data.value.past3days} mm` },
  ]
})

const currentHistory = computed(() => mode.value === 'live' ? null : historyCache.value[mode.value])

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    if (mode.value === 'live') data.value = await fetchRainfallData(props.station.station_id)
    else historyCache.value[mode.value] = await fetchRainfallHistory(props.station.station_id, Number(mode.value) as 7 | 14)
  } catch (e) {
    error.value = e instanceof Error ? e.message : (locale.value === 'en' ? 'Unable to load rainfall data' : '雨量資料暫時無法載入')
  } finally {
    loading.value = false
  }
}

function selectMode(next: 'live' | '7' | '14') {
  mode.value = next
  error.value = null // clear stale error from previous mode before checking cache
  const cached = next === 'live' ? data.value : historyCache.value[next]
  if (!cached) fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.card-overlay {
  position: fixed;
  inset: 0;
  z-index: 1999;
}

.popup {
  position: fixed;
  z-index: 2000;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  overflow: visible;
}

.arrow {
  position: absolute;
  top: 36px;
  width: 0;
  height: 0;
}

.arrow-left {
  left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #12122a;
  filter: drop-shadow(-2px 0 3px rgba(0,0,0,0.4));
}

.arrow-right {
  right: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 8px solid #12122a;
  filter: drop-shadow(2px 0 3px rgba(0,0,0,0.4));
}

.popup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 12px 6px;
  gap: 6px;
}

.header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
}

.name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.station-id {
  font-size: 0.75rem;
  color: #888;
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
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1;
}
.close-btn:hover { background: #1e1e3a; color: #aaa; }
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.badge-row {
  display: flex;
  gap: 4px;
  padding: 0 12px 8px;
}

.period-btn {
  flex: 1;
  font-size: 0.7rem;
  border: 1px solid #2a2a4a;
  background: #181832;
  color: #aaa;
  border-radius: 4px;
  padding: 3px 4px;
  cursor: pointer;
}

.period-btn.active {
  border-color: #5b9cf6;
  color: #fff;
  background: #1e2d6b;
}

.popup-body {
  padding: 0 12px 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #1e1e3a;
  font-size: 0.875rem;
}
.row:last-of-type { border-bottom: none; }

.row-label { color: #888; }
.row-value { font-weight: 600; color: #e0e0e0; }

.history-total {
  color: #fff;
  font-size: 1.7rem;
  font-weight: 700;
  text-align: center;
  padding: 12px 0 2px;
}

.history-range {
  color: #aaa;
  font-size: 0.75rem;
  text-align: center;
  padding-bottom: 6px;
}

.state {
  font-size: 0.875rem;
  color: #888;
  padding: 12px 0;
  text-align: center;
}
.state.error { color: #e05c5c; }

.update-time {
  font-size: 0.7rem;
  color: #aaa;
  text-align: right;
  padding-top: 6px;
}
</style>
