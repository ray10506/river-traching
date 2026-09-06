<template>
  <Teleport to="body">
    <div
      ref="panelRef"
      class="panel"
      :class="{ dragging: isDragging }"
      :style="pos ? { left: pos.x + 'px', top: pos.y + 'px', transform: 'none' } : {}"
      @click.stop
    >
        <div class="panel-header" @mousedown.prevent="startDrag">
          <div class="header-left">
            <span class="route-name">{{ title }}</span>
            <span v-if="item.kind === 'canyon'" :class="['kind-badge', item.kind]">{{ kindLabel }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="panel-body">

          <!-- Canyon Route（溪降）-->
          <template v-if="item.kind === 'route'">
            <div v-if="d.deep_pool || (d.ab_shuttle && d.ab_shuttle !== '不需要') || maxEle != null" class="tag-row">
              <span v-if="d.deep_pool" class="info-tag pool">{{ d.deep_pool === '有' ? (locale === 'en' ? 'Deep Pool' : '有深潭') : d.deep_pool === '無' ? (locale === 'en' ? 'No Deep Pool' : '無深潭') : d.deep_pool }}</span>
              <span v-if="d.ab_shuttle && d.ab_shuttle !== '不需要'" class="info-tag shuttle">{{ locale === 'en' ? 'A-B Shuttle' : '需要 AB 車' }}</span>
              <span v-if="maxEle != null" class="info-tag ele">{{ locale === 'en' ? 'Elevation' : '海拔高度' }} {{ maxEle }}m</span>
            </div>
            <div v-if="d.region" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Region' : '地區' }}</span>
              <span class="row-value">{{ d.region }}</span>
            </div>
            <div v-if="d.grading" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Grade' : '分級' }}</span>
              <span class="row-value">
                <span v-if="ropeGrade !== '—'" :class="['grade-tag', 'rope', ropeGradeClass]" :data-tooltip="(locale === 'en' ? ROPE_TIPS_EN : ROPE_TIPS)[ropeGrade]" tabindex="0">{{ ropeGrade }}</span>
                <span v-if="waterGrade !== '—'" class="grade-tag water" :data-tooltip="(locale === 'en' ? WATER_TIPS_EN : WATER_TIPS)[waterGrade]" tabindex="0">{{ waterGrade }}</span>
                <span v-if="timeGrade !== '—'" class="grade-tag time" :data-tooltip="(locale === 'en' ? TIME_TIPS_EN : TIME_TIPS)[timeGrade]" tabindex="0">{{ timeGrade }}</span>
                <span v-if="gradingStars" class="grade-stars" :data-tooltip="starTip ?? undefined" tabindex="0">{{ gradingStars }}</span>
              </span>
            </div>
            <div v-if="d.max_drop" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Max Rappel' : '最高瀑高' }}</span>
              <span class="row-value">{{ d.max_drop }}</span>
            </div>
            <div v-if="d.approach" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Approach' : '接近時間' }}</span>
              <span class="row-value">{{ d.approach }}</span>
            </div>
            <div v-if="d.total_time" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Total Time' : '全程時間' }}</span>
              <span class="row-value">{{ d.total_time }}</span>
            </div>
            <div v-if="d.gps" class="row">
              <span class="row-label">{{ d.gpx_track ? (locale === 'en' ? 'Parking GPS' : '停車點 GPS') : 'GPS' }}</span>
              <a v-if="d.gpx_track" class="row-value coord gps-link" :href="mapsUrl(d.gps.trim())" target="_blank" rel="noopener">{{ d.gps }} ↗</a>
              <span v-else class="row-value coord">{{ d.gps }}</span>
            </div>
            <div v-if="d.gpx_track || noteGpxLinks.length" class="row">
              <span class="row-label">GPX</span>
              <span class="row-value gpx-row-value">
                <button v-if="d.gpx_track" class="gpx-dl-btn" @click="downloadGpx">
                  {{ locale === 'en' ? '⬇ Download GPX' : '⬇ 下載 GPX' }}
                </button>
                <a v-for="link in noteGpxLinks" :key="link" :href="link" target="_blank" rel="noopener" class="note-link">
                  {{ locale === 'en' ? 'Route GPX' : '路線 gpx' }} ↗
                </a>
              </span>
            </div>
            <div v-if="noteHasVideo || noteHasText" class="row">
              <span class="row-label">{{ locale === 'en' ? 'Notes' : '附註' }}</span>
              <span class="row-value">
                <template v-for="(seg, i) in parseNote(d.note)" :key="i">
                  <a v-if="seg.isUrl && seg.isYoutube" :href="seg.text" target="_blank" rel="noopener" class="note-link">
                    {{ locale === 'en' ? 'Route Video' : '路線影片' }} ↗
                  </a>
                  <span v-else-if="!seg.isUrl">{{ seg.text }}</span>
                </template>
              </span>
            </div>
          </template>

          <!-- Elevation profile (shown for route kind when gpx_track has elevation) -->
          <div v-if="elevationData" class="elevation-section">
            <div class="ele-header">
              <span class="ele-title">{{ locale === 'en' ? 'Elevation Profile' : '海拔高度變化' }}</span>
              <div class="ele-stats">
                <span class="ele-up">↑ {{ elevationData.gain }}m</span>
                <span class="ele-down">↓ {{ elevationData.loss }}m</span>
              </div>
            </div>
            <div class="ele-chart-wrap">
              <div class="ele-y-labels">
                <span>{{ elevationData.maxEle }}m</span>
                <span>{{ elevationData.minEle }}m</span>
              </div>
              <svg class="ele-svg" viewBox="0 0 280 60" preserveAspectRatio="none">
                <polygon :points="elePolygon" fill="rgba(230,57,70,0.18)" />
                <polyline :points="elePolyline" fill="none" stroke="#e63946" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
          </div>

        </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { clamp } from '../lib/clamp'
import { vGradeClass } from '../lib/grade'
import { locale } from '../lib/locale'

const props = defineProps<{
  item: { kind: 'canyon' | 'route', data: any }
  initPos?: { x: number; y: number } | null
}>()
defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const pos = ref<{ x: number; y: number } | null>(props.initPos ?? null)
const isDragging = ref(false)

const MARGIN = 10

async function clampToViewport() {
  await nextTick()
  if (!pos.value || !panelRef.value) return
  const w = panelRef.value.offsetWidth
  const h = panelRef.value.offsetHeight
  pos.value = {
    x: clamp(pos.value.x, MARGIN, window.innerWidth - w - MARGIN),
    y: clamp(pos.value.y, MARGIN, window.innerHeight - h - MARGIN),
  }
}

onMounted(clampToViewport)

watch(() => props.item, async () => {
  pos.value = props.initPos ?? null
  await clampToViewport()
})

function startDrag(e: MouseEvent) {
  if (!panelRef.value) return
  if (!pos.value) {
    const r = panelRef.value.getBoundingClientRect()
    pos.value = { x: r.left, y: r.top }
  }
  isDragging.value = true
  const offset = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y }

  function onMove(ev: MouseEvent) {
    const w = panelRef.value?.offsetWidth ?? 380
    const h = panelRef.value?.offsetHeight ?? 420
    pos.value = {
      x: clamp(ev.clientX - offset.x, MARGIN, window.innerWidth - w - MARGIN),
      y: clamp(ev.clientY - offset.y, MARGIN, window.innerHeight - h - MARGIN),
    }
  }
  function onUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const d = computed(() => props.item.data)

const title     = computed(() => d.value.name)
const kindLabel = computed(() => props.item.kind === 'canyon' ? d.value.type : (locale.value === 'en' ? 'Canyon' : '溪降'))

const URL_RE = /https?:\/\/[^\s]+/gi
const YT_RE  = /youtu(?:be\.com|\.be)\//

function isSafeHttpUrl(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function parseNote(val: string) {
  const segments: { text: string, isUrl: boolean, isYoutube?: boolean }[] = []
  let last = 0
  for (const m of val.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?）)】\]'"]+$/, '')
    if (m.index! > last) segments.push({ text: val.slice(last, m.index), isUrl: false })
    segments.push({ text: url, isUrl: isSafeHttpUrl(url), isYoutube: YT_RE.test(url) })
    last = m.index! + url.length
  }
  if (last < val.length) segments.push({ text: val.slice(last), isUrl: false })
  return segments
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function parseGradePart(grading: string, pattern: RegExp) {
  return grading?.split(/\s+/).find((p: string) => pattern.test(p)) ?? '—'
}
const ropeGrade      = computed(() => parseGradePart(d.value.grading, /^V\d/))
const ropeGradeClass = computed(() => vGradeClass(ropeGrade.value))
const waterGrade = computed(() => parseGradePart(d.value.grading, /^A\d/))
const timeGrade  = computed(() => parseGradePart(d.value.grading, /^(I{1,3}|IV|VI?)$/))

const gradingStars = computed(() =>
  (d.value.grading ?? '')
    .replace(/\b(V\d+|A\d+|I{1,3}|IV|VI?)\b/g, '')
    .trim()
)

const ROPE_TIPS: Record<string, string> = {
  V1: '垂降 V1｜落差小、確保點明確，適合入門',
  V2: '垂降 V2｜中等落差，需熟練下降技術',
  V3: '垂降 V3｜落差大或地形複雜，需豐富垂降經驗',
  V4: '垂降 V4｜需雙繩下降或技術性確保',
  V5: '垂降 V5｜極高難度，專業垂降技術',
}
const ROPE_TIPS_EN: Record<string, string> = {
  V1: 'Rope V1 | Small drops, clear anchors — beginner friendly',
  V2: 'Rope V2 | Moderate drops, solid rappel skills needed',
  V3: 'Rope V3 | Large drops or complex terrain, extensive experience required',
  V4: 'Rope V4 | Double-rope or technical belay required',
  V5: 'Rope V5 | Extreme difficulty, expert-level rappelling',
}
const WATER_TIPS: Record<string, string> = {
  A0: '水域 A0｜無需游泳，全程可涉水通過',
  A1: '水域 A1｜靜水或緩流，簡單泳渡',
  A2: '水域 A2｜流動水域，需具備游泳能力',
  A3: '水域 A3｜激流或深潭，需繩索輔助或強游泳技術',
  A4: '水域 A4｜危險激流，需高水平技術與保護',
}
const WATER_TIPS_EN: Record<string, string> = {
  A0: 'Water A0 | No swimming needed, wadeable throughout',
  A1: 'Water A1 | Calm or gentle current, easy swim crossings',
  A2: 'Water A2 | Moving water, swimming ability required',
  A3: 'Water A3 | Whitewater or deep pools, rope assist or strong swimmer',
  A4: 'Water A4 | Dangerous current, high-level skills required',
}
const TIME_TIPS: Record<string, string> = {
  I:   '整體 I｜非常容易，適合溪降新手',
  II:  '整體 II｜容易，需基本溪降技術',
  III: '整體 III｜中等，需具備溪降技術與經驗',
  IV:  '整體 IV｜困難，需豐富溪降經驗',
  V:   '整體 V｜非常困難，專業級路線',
  VI:  '整體 VI｜極限路線，頂尖技術',
}
const TIME_TIPS_EN: Record<string, string> = {
  I:   'Overall I | Very easy, suitable for beginners',
  II:  'Overall II | Easy, basic canyoning skills needed',
  III: 'Overall III | Moderate, canyoning experience required',
  IV:  'Overall IV | Difficult, extensive canyoning experience needed',
  V:   'Overall V | Very difficult, professional-level route',
  VI:  'Overall VI | Extreme, top-tier technical skills',
}

const STAR_TIPS: Record<number, string> = {
  1: '★ 一般｜具基本可玩性',
  2: '★★ 不錯｜值得一遊',
  3: '★★★ 優秀｜強烈推薦',
  4: '★★★★ 精彩｜必訪路線',
  5: '★★★★★ 經典｜台灣溪降聖地',
}
const STAR_TIPS_EN: Record<number, string> = {
  1: '★ Average | Decent fun',
  2: '★★ Good | Worth the trip',
  3: '★★★ Excellent | Highly recommended',
  4: '★★★★ Outstanding | Must-do route',
  5: '★★★★★ Classic | Taiwan canyoning icon',
}
const starTip = computed(() => {
  const count = (gradingStars.value.match(/★/g) ?? []).length
  return (locale.value === 'en' ? STAR_TIPS_EN : STAR_TIPS)[count] ?? null
})


/** Max elevation from GPX waypoints (fallback when track has no ele data). */
const maxEleFromWaypoints = computed(() => {
  if (!d.value.gpx_waypoints) return null
  try {
    const wps = JSON.parse(d.value.gpx_waypoints)
    const eles = (wps as any[]).map((p: any) => p.ele).filter((e: any) => typeof e === 'number')
    return eles.length ? Math.round(Math.max(...eles)) : null
  } catch { return null }
})

/** Best available max elevation: track > waypoints > stored elevation field. */
const maxEle = computed(() =>
  elevationData.value?.maxEle
  ?? maxEleFromWaypoints.value
  ?? (typeof d.value.elevation === 'number' && d.value.elevation > 0 ? d.value.elevation : null)
)

const noteSegs = computed(() => d.value.note ? parseNote(d.value.note) : [])
const noteGpxLinks = computed(() => noteSegs.value.filter(s => s.isUrl && !s.isYoutube).map(s => s.text))
const noteHasVideo = computed(() => noteSegs.value.some(s => s.isUrl && s.isYoutube))
const noteHasText  = computed(() => noteSegs.value.some(s => !s.isUrl && s.text.trim()))

const elevationData = computed(() => {
  if (props.item.kind !== 'route' || !d.value.gpx_track) return null
  try {
    const parsed = JSON.parse(d.value.gpx_track)
    // Support flat [lat,lon,ele][] and segmented [lat,lon,ele][][]
    const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0])
    const allPts: number[][] = isSegmented ? (parsed as number[][][]).flat() : parsed
    const eles = allPts.map((p: number[]) => p[2]).filter((e: number) => e != null && !isNaN(e))
    if (eles.length < 2) return null
    const minEle = Math.min(...eles)
    const maxEle = Math.max(...eles)
    let gain = 0, loss = 0
    for (let i = 1; i < eles.length; i++) {
      const diff = eles[i] - eles[i - 1]
      if (diff > 3) gain += diff
      else if (diff < -3) loss += Math.abs(diff)
    }
    return { eles, minEle, maxEle, gain: Math.round(gain), loss: Math.round(loss) }
  } catch { return null }
})

const elePolyline = computed(() => {
  if (!elevationData.value) return ''
  const { eles, minEle, maxEle } = elevationData.value
  const W = 280, H = 54, padT = 3
  const rangeEle = maxEle - minEle || 1
  return eles.map((e, i) => {
    const x = (i / (eles.length - 1)) * W
    const y = padT + (1 - (e - minEle) / rangeEle) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const elePolygon = computed(() => {
  if (!elevationData.value) return ''
  const { eles, minEle, maxEle } = elevationData.value
  const W = 280, H = 54, padT = 3
  const rangeEle = maxEle - minEle || 1
  const pts = eles.map((e, i) => {
    const x = (i / (eles.length - 1)) * W
    const y = padT + (1 - (e - minEle) / rangeEle) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `${pts.join(' ')} ${W},${padT + H} 0,${padT + H}`
})

function downloadGpx() {
  const route = d.value
  if (!route.gpx_track) return

  const name = route.name ?? 'route'
  const parsed: number[][] | number[][][] = JSON.parse(route.gpx_track)
  const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0])
  const segments: number[][][] = isSegmented ? (parsed as number[][][]) : [parsed as number[][]]

  const wpts: any[] = route.gpx_waypoints ? JSON.parse(route.gpx_waypoints) : []

  const trksegs = segments.map(seg => {
    const pts = seg.map((p: number[]) => {
      const ele = p[2] != null ? `\n        <ele>${p[2].toFixed(1)}</ele>` : ''
      return `      <trkpt lat="${p[0]}" lon="${p[1]}">${ele}\n      </trkpt>`
    }).join('\n')
    return `    <trkseg>\n${pts}\n    </trkseg>`
  }).join('\n')

  const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const wptXml = wpts.map((w: any) => {
    const ele = w.ele != null ? `\n    <ele>${(+w.ele).toFixed(1)}</ele>` : ''
    const wname = w.name ? `\n    <name>${escXml(w.name)}</name>` : ''
    return `  <wpt lat="${w.lat}" lon="${w.lon}">${ele}${wname}\n  </wpt>`
  }).join('\n')

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Taiwan Canyoning Map" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escXml(name)}</name></metadata>
${wptXml ? wptXml + '\n' : ''}  <trk>
    <name>${escXml(name)}</name>
${trksegs}
  </trk>
</gpx>`

  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }))
  a.download = `${name}.gpx`
  a.click()
  URL.revokeObjectURL(a.href)
}

</script>

<style scoped>
.panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1500;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
  cursor: grab;
}

.panel.dragging .panel-header { cursor: grabbing; }
.panel.dragging { user-select: none; }

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.route-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.kind-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.kind-badge.canyon  { background: #1e2d6b; color: #6c8ef5; }
.kind-badge.route   { background: #3a2800; color: #f5a030; }

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.panel-body {
  padding: 8px 0;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(80dvh - 60px); /* 60px ≈ header height */
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #1e1e38;
}
.row:last-child { border-bottom: none; }

.row-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 0.75rem;
  color: #888;
}

.row-value {
  font-size: 0.875rem;
  color: #ccc;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stars { color: #f0a030; letter-spacing: 2px; }
.level-text { font-size: 0.75rem; color: #888; }

.coord { font-family: monospace; font-size: 0.875rem; color: #6abf8a; }

.gps-link { text-decoration: none; }
.gps-link:hover { text-decoration: underline; }

.gpx-row-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gpx-dl-btn {
  background: none;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  color: #6c8ef5;
  font-size: 0.78rem;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.gpx-dl-btn:hover { border-color: #6c8ef5; background: #1e2d6b; }

.note-link {
  color: #6c8ef5;
  text-decoration: none;
  font-size: 0.875rem;
}
.note-link:hover { text-decoration: underline; }

.grade-stars {
  font-size: 0.75rem;
  color: #f0a030;
  letter-spacing: 1px;
}
.grade-stars[data-tooltip] { position: relative; cursor: default; }

.grade-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.grade-tag.rope  { background: #1e2d6b; color: #6c8ef5; } /* fallback */
.grade-tag.rope:is(.v1,.v2,.v3,.v4,.v5,.v6) { background: var(--vg-bg); color: var(--vg-fg); }
.grade-tag.water { background: #0e2a3a; color: #38bdf8; }
.grade-tag.time  { background: #2a1e0e; color: #f5a030; }

.grade-tag[data-tooltip],
.grade-stars[data-tooltip] { position: relative; cursor: default; }

.grade-tag[data-tooltip]::after,
.grade-stars[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  transform: none;
  white-space: nowrap;
  background: #1a1a2e;
  color: #e0e0f0;
  font-size: 0.7rem;
  font-weight: 400;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #2e2e52;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 9999;
}
.grade-tag[data-tooltip]:hover::after,
.grade-tag[data-tooltip]:focus::after,
.grade-stars[data-tooltip]:hover::after,
.grade-stars[data-tooltip]:focus::after { opacity: 1; }

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid #1e1e38;
}

.info-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
}

.info-tag.pool    { background: #0e2a3a; color: #38bdf8; }
.info-tag.shuttle { background: #1a2e1a; color: #6abf8a; }
.info-tag.ele     { background: #1e1a2e; color: #a78bfa; }

.elevation-section {
  padding: 12px 20px 16px;
  border-top: 1px solid #1e1e38;
}

.ele-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ele-title {
  font-size: 0.75rem;
  color: #666;
}

.ele-stats {
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.ele-up   { color: #e63946; }
.ele-down { color: #38bdf8; }

.ele-chart-wrap {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.ele-y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #555;
  text-align: right;
  width: 34px;
  flex-shrink: 0;
  padding-bottom: 2px;
}

.ele-svg {
  flex: 1;
  height: 70px;
  display: block;
}

@media (max-width: 640px) {
  .panel {
    /* bottom sheet on mobile */
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 72dvh;
    overflow-y: auto;
    transform: none;
  }

  /* outer panel handles scroll on mobile — remove nested scroll from body */
  .panel-body {
    overflow-y: visible;
    max-height: none;
  }

  .panel-header {
    cursor: default;
    position: sticky;
    top: 0;
    background: #12122a;
    z-index: 1;
  }
}
</style>
