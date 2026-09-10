<template>
  <Teleport to="body">
    <div class="card-overlay" @click="$emit('close')"></div>
    <div class="popup" :style="popupStyle">
      <div class="arrow" :class="arrowSide" :style="arrowStyle"></div>
      <div class="drag-handle" aria-hidden="true"></div>
      <div class="popup-header">
        <div class="header-left">
          <span class="name">{{ station.name }}</span>
          <span class="station-id">({{ station.station_id }})</span>
          <span v-if="distance != null" class="dist-badge">{{ locale === 'en' ? 'From route' : '距路線' }} {{ distance.toFixed(1) }} km</span>
        </div>
        <button class="close-btn" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
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
          <div class="history-total">
            <span>{{ currentHistory.total }}</span>
            <small>{{ currentHistory.unit }}</small>
          </div>
          <div class="history-actions">
            <div class="history-range">{{ currentHistory.from }} - {{ currentHistory.to }}</div>
            <button class="download-btn" @click="downloadHistoryImage">{{ locale === 'en' ? 'PNG' : '下載 PNG' }}</button>
          </div>
          <WaterLevelChart
            ref="chartRef"
            :series="historySeries"
            type="bar"
            :height-px="180"
            :y-label="locale === 'en' ? 'Daily accumulated rainfall (mm)' : '每日累積雨量 (mm)'"
          />
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
import WaterLevelChart from './WaterLevelChart.vue'
import type { ChartSeries } from '../lib/chart'

const LIVE_CARD_W = 240
const HISTORY_CARD_W = 420
const CARD_OFFSET = 28
const MARGIN = 16
const ICON_CENTER_OFFSET_Y = 13
const ARROW_HALF_H = 8
const ARROW_SAFE_PAD = 24

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

const popupWidth = computed(() => {
  const wanted = mode.value === 'live' ? LIVE_CARD_W : HISTORY_CARD_W
  return Math.min(wanted, window.innerWidth - MARGIN * 2)
})

const estimatedHeight = computed(() => {
  if (loading.value || error.value) return 160
  return mode.value === 'live' ? 430 : 520
})

const openOnRight = computed(() => props.distance == null && props.pos.x + CARD_OFFSET + popupWidth.value + MARGIN <= window.innerWidth)
const arrowSide = computed(() => openOnRight.value ? 'arrow-left' : 'arrow-right')

const popupLayout = computed(() => {
  const width = popupWidth.value
  const height = Math.min(estimatedHeight.value, Math.max(120, window.innerHeight - MARGIN * 2))
  const onRight = openOnRight.value
  let left = onRight ? props.pos.x + CARD_OFFSET : props.pos.x - CARD_OFFSET - width
  let top = props.pos.y - ICON_CENTER_OFFSET_Y - 44

  left = clamp(left, MARGIN, window.innerWidth - width - MARGIN)
  top = clamp(top, MARGIN, window.innerHeight - height - MARGIN)

  const targetY = props.pos.y - ICON_CENTER_OFFSET_Y
  const arrowTop = clamp(targetY - top - ARROW_HALF_H, ARROW_SAFE_PAD, height - ARROW_SAFE_PAD)

  return { left, top, width, height, arrowTop }
})

const popupStyle = computed(() => {
  const { left, top, width, height } = popupLayout.value
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: window.innerWidth <= 640 ? undefined : `${width}px`,
    maxHeight: window.innerWidth <= 640 ? undefined : `${height}px`,
    minHeight: loading.value || error.value ? `${height}px` : undefined,
  }
})

const arrowStyle = computed(() => ({ top: `${popupLayout.value.arrowTop}px` }))

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

const historySeries = computed<ChartSeries[]>(() => {
  const history = currentHistory.value
  if (!history?.daily?.length) return []
  return [{
    label: history.unit,
    color: '#5b9cf6',
    points: history.daily.map(item => ({ time: item.date, value: item.value })),
  }]
})

const chartRef = ref<InstanceType<typeof WaterLevelChart> | null>(null)

// ponytail: exported PNG is just the chart canvas, not the station-name/total header the old
// hand-drawn version baked in. Re-add by drawing an overlay onto the exported blob if that's missed.
function downloadHistoryImage() {
  const history = currentHistory.value
  if (!history) return
  chartRef.value?.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.station.station_id}-rainfall-${history.days}d.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })
}

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
  display: flex;
  flex-direction: column;
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
  padding: 8px;
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
  overflow-y: auto;
  min-height: 0;
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
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 4px;
  padding: 12px 0 2px;
}

.history-total small {
  font-size: 0.75rem;
  color: #aaa;
  font-weight: 600;
}

.history-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 2px 0 8px;
}

.download-btn {
  border: 1px solid #2a2a4a;
  background: #181832;
  color: #d6defd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.7rem;
  cursor: pointer;
}

.download-btn:hover {
  border-color: #5b9cf6;
  color: #fff;
}

.download-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.history-range {
  color: #aaa;
  font-size: 0.75rem;
  min-width: 0;
}

.state {
  font-size: 0.875rem;
  color: #888;
  padding: 12px 0;
  text-align: center;
}
.state.error { color: #e05c5c; }

.retry-btn {
  display: block;
  margin: 6px auto 10px;
  padding: 5px 18px;
  background: none;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: #aaa;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.retry-btn:hover        { border-color: #6c8ef5; color: #6c8ef5; }
.retry-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.update-time {
  font-size: 0.7rem;
  color: #aaa;
  text-align: right;
  padding-top: 6px;
}

@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* Drag handle: hidden on desktop, shown on mobile */
.drag-handle {
  display: none;
  width: 40px;
  height: 4px;
  background: #2a2a4a;
  border-radius: 2px;
  margin: 10px auto 4px;
  flex-shrink: 0;
}

/* ── Mobile: bottom sheet ── */
@media (max-width: 640px) {
  .popup {
    width: 100%;
    max-width: 100%;
    left: 0 !important;
    top: auto !important;
    bottom: 0;
    max-height: 85dvh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    border-left: none;
    border-right: none;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    animation: sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .arrow { display: none; }

  .drag-handle { display: block; }
}
</style>
