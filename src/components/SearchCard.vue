<template>
  <div class="search-card">
    <div class="card-header">
      <span class="card-title">{{ locale === 'en' ? 'Search & Filter' : '搜尋篩選' }}</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="search-label">{{ locale === 'en' ? 'Search in' : '搜尋範圍' }}</div>
    <div class="scope-row">
      <button v-for="scope in scopes" :key="scope.value" :class="['scope-btn', { active: searchType === scope.value }]" @click="searchType = scope.value">
        {{ locale === 'en' ? scope.en : scope.zh }}
      </button>
    </div>

    <!-- Region filter -->
    <div class="search-label">{{ locale === 'en' ? 'Region' : '區域' }}</div>
    <div class="region-row">
      <button :class="['region-btn', { active: selectedRegion.length === 0 }]" @click="emit('clearRegion')">{{ locale === 'en' ? 'All' : '全部' }}</button>
      <button
        v-for="r in regions"
        :key="r.value"
        :class="['region-btn', { active: selectedRegion.includes(r.value) }]"
        @click="emit('filterRegion', r.value)"
      >{{ localeRegion(r.value) }}</button>
    </div>

    <!-- Text search -->
    <div class="search-wrap">
      <input
        ref="inputRef"
        v-model="search"
        class="search-input"
        :placeholder="searchPlaceholder"
        @keydown.enter.prevent="emit('confirm')"
      />
      <button v-if="search" class="search-clear" @click="search = ''">✕</button>
    </div>

    <div v-if="searchResults.length" class="search-results">
      <button v-for="result in searchResults" :key="result.key" class="search-result" @click="selectResult(result)">
        <span class="result-icon" aria-hidden="true">
          <img v-if="result.kind === 'route'" src="/favicon-sidebar.png" alt="" />
          <img v-else-if="result.kind === 'water'" src="/water-level.svg" alt="" />
          <template v-else>🌂</template>
        </span>
        <span class="result-type">{{ result.type }}</span>
        <span class="result-name">{{ result.name }}</span>
        <small>{{ result.location }}</small>
      </button>
    </div>

    <!-- Grade filters -->
    <div v-if="searchType === 'all' || searchType === 'route'" class="filter-grid">
      <select v-model="v" class="filter-select">
        <option value="">{{ locale === 'en' ? 'V All' : 'V 全部' }}</option>
        <option v-for="opt in vOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="a" class="filter-select">
        <option value="">{{ locale === 'en' ? 'A All' : 'A 全部' }}</option>
        <option v-for="opt in aOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="t" class="filter-select">
        <option value="">{{ locale === 'en' ? 'T All' : 'T 全部' }}</option>
        <option v-for="opt in tOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="drop" class="filter-select">
        <option value="">{{ locale === 'en' ? 'Drop All' : '落差 全部' }}</option>
        <option value="≤20">≤ 20m</option>
        <option value="21-40">21–40m</option>
        <option value="41-60">41–60m</option>
        <option value=">60">> 60m</option>
      </select>
    </div>

    <!-- GPX filter -->
    <label v-if="searchType === 'all' || searchType === 'route'" class="gpx-toggle">
      <input type="checkbox" v-model="gpx" />
      <span class="gpx-label">{{ locale === 'en' ? 'Has GPX track' : '有完整 GPX 路線' }}</span>
    </label>

    <div class="search-actions">
    <button class="clear-btn" @click="emit('clearAll')">
      {{ locale === 'en' ? 'Clear All Filters' : '清除全部篩選' }}
    </button>
    <button class="confirm-btn" @click="emit('confirm')">
      {{ locale === 'en' ? 'Confirm' : '確認' }}
    </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed } from 'vue'
import { locale, localeRegion } from '../lib/locale'
import type { WaterStation } from '../lib/waterLevel'
import type { RainfallStation } from '../lib/rainfall'

const props = defineProps<{
  selectedRegion: string[]
  waterStations: WaterStation[]
  rainfallStations: RainfallStation[]
  routes: { id: string; name: string; region?: string }[]
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  filterRegion: [region: string]
  clearRegion: []
  clearAll: []
  selectWaterStation: [station: WaterStation]
  selectRainfallStation: [station: RainfallStation]
  selectRoute: [id: string]
}>()

const regions = [
  { value: '北部' },
  { value: '中部' },
  { value: '南部' },
  { value: '東部' },
]

// Bound straight to the parent's state — no local mirror to keep in sync.
const search = defineModel<string>('searchQuery', { required: true })
const v = defineModel<string>('v', { required: true })
const a = defineModel<string>('a', { required: true })
const t = defineModel<string>('t', { required: true })
const drop = defineModel<string>('drop', { required: true })
const gpx = defineModel<boolean>('gpx', { required: true })
const searchType = defineModel<'all' | 'route' | 'water' | 'rainfall'>('searchType', { required: true })

const inputRef = ref<HTMLInputElement | null>(null)
onMounted(() => nextTick(() => inputRef.value?.focus()))

const vOptions = ['V1','V2','V3','V4','V5','V6','V7']
const aOptions = ['A1','A2','A3','A4','A5','A6','A7']
const tOptions = ['I','II','III','IV','V','VI']

const scopes = [
  { value: 'all' as const, zh: '全部', en: 'All', placeholderZh: '搜尋路線、地名、溪名或測站...', placeholderEn: 'Route, place, river or station...' },
  { value: 'route' as const, zh: '路線', en: 'Routes', placeholderZh: '搜尋路線、溪名或地名...', placeholderEn: 'Route, canyon or place...' },
  { value: 'water' as const, zh: '水位站', en: 'Water', placeholderZh: '搜尋水位站、溪名或站號...', placeholderEn: 'Water station, river or ID...' },
  { value: 'rainfall' as const, zh: '雨量站', en: 'Rain', placeholderZh: '搜尋雨量站、地名或站號...', placeholderEn: 'Rainfall station, place or ID...' },
]

const searchPlaceholder = computed(() => {
  const scope = scopes.find(s => s.value === searchType.value) ?? scopes[0]
  return locale.value === 'en' ? scope.placeholderEn : scope.placeholderZh
})

type SearchResult =
  | { kind: 'route'; key: string; type: string; name: string; location: string; id: string }
  | { kind: 'water'; key: string; type: string; name: string; location: string; station: WaterStation }
  | { kind: 'rainfall'; key: string; type: string; name: string; location: string; station: RainfallStation }

const searchResults = computed<SearchResult[]>(() => {
  const results: SearchResult[] = []
  for (const route of props.routes) {
    results.push({ kind: 'route', key: `route-${route.id}`, type: locale.value === 'en' ? 'Route' : '路線', name: route.name, location: route.region ?? '', id: route.id })
  }
  for (const station of props.waterStations) {
      results.push({ kind: 'water', key: `water-${station.id}`, type: locale.value === 'en' ? 'Water level' : '水位站', name: station.name, location: station.address || station.river, station })
  }
  for (const station of props.rainfallStations) {
      results.push({ kind: 'rainfall', key: `rain-${station.station_id}`, type: locale.value === 'en' ? 'Rainfall' : '雨量站', name: station.name, location: `${station.county} ${station.town}`, station })
  }
  return results
})

function selectResult(result: SearchResult) {
  if (result.kind === 'route') emit('selectRoute', result.id)
  else if (result.kind === 'rainfall') emit('selectRainfallStation', result.station)
  else emit('selectWaterStation', result.station)
}
</script>

<style scoped>

.search-card {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1101;
  width: 280px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #6c8ef5;
}

.close-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-btn:hover { color: #aaa; }

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border-radius: 8px;
  border: 1px solid #3a3a5a;
  background: #12122a;
  color: #e0e0e0;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.search-input::placeholder { color: #555; }
.search-input:focus { border-color: #6c8ef5; }

.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #555;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s;
}
.search-clear:hover { color: #aaa; }

.search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.search-label {
  color: #888;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.scope-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.scope-btn {
  min-height: 34px;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  background: #12122a;
  color: #999;
  font-size: 0.72rem;
  cursor: pointer;
}
.scope-btn:hover { border-color: #6c8ef5; color: #ddd; }
.scope-btn.active { border-color: #6c8ef5; background: #1e2d6b; color: #fff; font-weight: 600; }

.search-result {
  display: grid;
  grid-template-columns: 22px auto minmax(0, 1fr);
  gap: 2px 8px;
  padding: 8px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #12122a;
  color: #ddd;
  text-align: left;
  cursor: pointer;
}
.search-result:hover { border-color: #6c8ef5; }
.result-type { color: #6c8ef5; font-size: 0.7rem; }
.result-icon { grid-row: span 2; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.result-icon img { width: 20px; height: 20px; object-fit: contain; }
.result-name { overflow-wrap: anywhere; }
.search-result small { grid-column: 2 / -1; color: #aaa; font-size: 0.7rem; overflow-wrap: anywhere; }

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.filter-select {
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid #3a3a5a;
  background: #12122a;
  color: #ccc;
  font-size: 0.75rem;
  cursor: pointer;
  outline: none;
}
.filter-select:focus { border-color: #6c8ef5; }

.region-row {
  display: flex;
  gap: 6px;
}

.region-btn {
  flex: 1;
  padding: 5px 4px;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.region-btn:hover { border-color: #6c8ef5; color: #ccc; }
.region-btn.active { background: #6c8ef5; border-color: #6c8ef5; color: #fff; font-weight: 600; }


.gpx-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 2px 0;
}

.gpx-toggle input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #6c8ef5;
  cursor: pointer;
  flex-shrink: 0;
}

.gpx-label {
  font-size: 0.8rem;
  color: #aaa;
  user-select: none;
}

.gpx-toggle:hover .gpx-label { color: #ddd; }

.clear-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #3a3a5a;
  background: transparent;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.clear-btn:hover { border-color: #e05c5c; color: #e05c5c; }

.search-actions { display: flex; gap: 8px; flex-shrink: 0; }
.search-actions .clear-btn { flex: 1; width: auto; }
.confirm-btn { padding: 8px 20px; min-height: 40px; border: 1px solid #6c8ef5; border-radius: 8px; background: #6c8ef5; color: #12122a; font-weight: 700; cursor: pointer; }
.confirm-btn:hover { background: #8aa5ff; }
.search-actions button:focus-visible { outline: 2px solid #b5c6ff; outline-offset: 2px; }

@media (max-width: 640px) {
  .search-card {
    top: 8px;
    right: 8px;
    left: 8px;
    width: auto;
  }
}
</style>
