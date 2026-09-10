<template>
  <div class="chart-wrap" :style="heightPx ? { height: `${heightPx}px`, minHeight: 0, maxHeight: 'none' } : undefined">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, registerables, Tooltip } from 'chart.js'
import type { ChartType, TooltipPositionerFunction } from 'chart.js'
import type { ChartSeries } from '../lib/chart'
import { taipeiParts } from '../lib/waterLevel'
import { theme } from '../lib/theme'

Chart.register(...registerables)

declare module 'chart.js' {
  interface TooltipPositionerMap {
    primaryPoint: TooltipPositionerFunction<ChartType>
  }
}

// Anchors the tooltip to the primary (water level) series point so it tracks that line on hover.
Tooltip.positioners.primaryPoint = (items) => {
  const item = items.find(i => i.datasetIndex === 0) ?? items[0]
  if (!item) return false
  return { x: item.element.x, y: item.element.y }
}

const props = withDefaults(defineProps<{
  series: ChartSeries[]
  yLabel?: string
  type?: 'line' | 'bar'
  heightPx?: number
}>(), { type: 'line' })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

// Bar mode plots one point per day — no hour to show.
function formatLabel(iso: string) {
  const parts = taipeiParts(iso)
  const date = `${parts.month}/${parts.day}`
  return props.type === 'bar' ? date : `${date} ${parts.hour}:${parts.minute}`
}

function formatTooltipTitle(iso: string) {
  const parts = taipeiParts(iso)
  const date = `${parts.year}/${parts.month}/${parts.day}`
  return props.type === 'bar' ? date : `${date} ${parts.hour}:${parts.minute}`
}

function computeYRange(series: ChartSeries[]) {
  // Bars imply a zero baseline; padding below the data min (as line charts get) would misread as negative values.
  if (props.type === 'bar') {
    let dataMax = 0
    for (const p of series[0]?.points ?? []) {
      if (p.value != null && p.value > dataMax) dataMax = p.value
    }
    return { min: 0, max: Math.max(dataMax * 1.15, 1) }
  }

  const primary = series.find(s => !s.dashed) ?? series[0]
  let dataMin = Infinity
  let dataMax = -Infinity
  for (const p of primary?.points ?? []) {
    if (p.value == null) continue
    if (p.value < dataMin) dataMin = p.value
    if (p.value > dataMax) dataMax = p.value
  }
  if (!isFinite(dataMin) || !isFinite(dataMax)) return {}
  const range = dataMax - dataMin
  const padding = range > 0 ? range * 0.1 : (Math.abs(dataMax) * 0.1 || 0.1)
  return { min: dataMin - padding, max: dataMax + padding }
}

function buildConfig() {
  const labels = props.series[0]?.points.map(p => formatLabel(p.time)) ?? []
  const textColor = theme.value === 'light' ? '#475569' : '#ccc'
  const mutedColor = theme.value === 'light' ? '#64748b' : '#888'
  const gridColor = theme.value === 'light' ? '#dbe2ea' : '#2a2a4a'

  return {
    type: props.type,
    data: {
      labels,
      datasets: props.series.map(s => props.type === 'bar'
        ? { label: s.label, data: s.points.map(p => p.value), backgroundColor: s.color, borderRadius: 4, maxBarThickness: 28 }
        : {
            label: s.label,
            data: s.points.map(p => p.value),
            borderColor: s.color,
            backgroundColor: s.color,
            borderDash: s.dashed ? [5, 5] : undefined,
            pointRadius: 0,
            pointHitRadius: s.dashed ? 0 : 15,
            pointHoverRadius: s.dashed ? 0 : 4,
            borderWidth: s.dashed ? 1 : 2,
            spanGaps: true,
            tension: 0.2,
          }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: true, axis: 'x' as const },
      plugins: {
        legend: { labels: { color: textColor, font: { size: 11 }, boxWidth: 16 } },
        tooltip: {
          position: 'primaryPoint' as const,
          callbacks: {
            title: (items: { dataIndex: number }[]) => {
              const point = props.series[0]?.points[items[0]?.dataIndex]
              return point ? formatTooltipTitle(point.time) : ''
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: mutedColor, maxTicksLimit: 8, autoSkip: true, font: { size: 10 } },
          grid: { color: gridColor },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          ...computeYRange(props.series),
          title: { display: !!props.yLabel, text: props.yLabel, color: textColor },
          ticks: { color: mutedColor, font: { size: 10 } },
          grid: { color: gridColor },
        },
      },
    },
  }
}

function render() {
  chart?.destroy()
  if (!canvasRef.value) return
  chart = new Chart(canvasRef.value, buildConfig() as any)
}

onMounted(render)
watch([() => props.series, theme], render, { deep: true })
onUnmounted(() => chart?.destroy())

// Native canvas export — no need to redraw the chart a second time for a PNG.
defineExpose({
  toBlob: (cb: BlobCallback) => canvasRef.value?.toBlob(cb, 'image/png'),
})
</script>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 50vh;
  min-height: 320px;
  max-height: 480px;
}
</style>
