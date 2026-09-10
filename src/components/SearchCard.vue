<template>
  <div class="search-card">
    <div class="card-header">
      <span class="card-title">{{ locale === 'en' ? 'Search & Filter' : '搜尋篩選' }}</span>
      <button class="close-btn" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
    </div>

    <div class="search-label">{{ locale === 'en' ? 'Search in' : '搜尋範圍' }}</div>
    <div class="scope-row">
      <button
        v-for="scope in scopes"
        :key="scope.value"
        :class="['scope-btn', { active: isScopeActive(scope.value) }]"
        :aria-pressed="isScopeActive(scope.value)"
        @click="toggleScope(scope.value)"
      >
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
      <button v-if="search" class="search-clear" :aria-label="locale === 'en' ? 'Clear search' : '清除搜尋'" @click="search = ''">✕</button>
    </div>

    <div v-if="suggestions.length" class="quick-suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="`${suggestion.kind}-${suggestion.id}`"
        class="quick-suggestion"
        @click="emit('selectSuggestion', suggestion)"
      >
        <span class="suggestion-icon" aria-hidden="true">
          <img v-if="suggestion.kind === 'route'" src="/favicon-sidebar.png" alt="" />
          <img v-else-if="suggestion.kind === 'water'" src="/water-level.svg" alt="" />
          <img v-else src="/rainfall.svg" alt="" />
        </span>
        <span class="suggestion-copy">
          <strong :class="{ matched: matchesQuery(suggestion.name) }">{{ suggestion.name }}</strong>
          <small :class="{ matched: matchesQuery(suggestion.location) }">{{ suggestion.location }}</small>
        </span>
      </button>
    </div>

    <div class="result-summary" aria-live="polite">
      {{ locale === 'en' ? `${resultCount} results` : `找到 ${resultCount} 筆結果` }}
      <span v-if="suggestions.length">{{ locale === 'en' ? ' · Quick suggestions' : ' · 快速建議' }}</span>
    </div>

    <!-- Grade filters -->
    <div v-if="hasRouteScope" class="filter-grid">
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
    <label v-if="hasRouteScope" class="gpx-toggle">
      <input type="checkbox" v-model="gpx" />
      <span class="gpx-label">{{ locale === 'en' ? 'Has GPX track' : '有完整 GPX 路線' }}</span>
    </label>

    <div class="search-actions">
    <button class="clear-btn" @click="emit('clearAll')">
      {{ locale === 'en' ? 'Clear All Filters' : '清除全部篩選' }}
    </button>
    <button class="confirm-btn" :disabled="resultCount === 0" @click="emit('confirm')">
      {{ locale === 'en' ? `Show ${resultCount} results` : `顯示 ${resultCount} 筆結果` }}
    </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed } from 'vue'
import { locale, localeRegion } from '../lib/locale'

type SearchType = 'route' | 'water' | 'rainfall'
type SearchSuggestion = {
  kind: SearchType
  id: string
  name: string
  location: string
}

defineProps<{
  selectedRegion: string[]
  suggestions: SearchSuggestion[]
  resultCount: number
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  filterRegion: [region: string]
  clearRegion: []
  clearAll: []
  selectSuggestion: [suggestion: SearchSuggestion]
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
type SearchScope = 'all' | SearchType
const searchTypes = defineModel<SearchType[]>('searchTypes', { required: true })

const inputRef = ref<HTMLInputElement | null>(null)
onMounted(() => nextTick(() => inputRef.value?.focus()))

function matchesQuery(value: string): boolean {
  const q = search.value.trim().toLowerCase().replace(/臺/g, '台')
  return !!q && value.toLowerCase().replace(/臺/g, '台').includes(q)
}

const vOptions = ['V1','V2','V3','V4','V5','V6','V7']
const aOptions = ['A1','A2','A3','A4','A5','A6','A7']
const tOptions = ['I','II','III','IV','V','VI']

const scopes = [
  { value: 'all' as const, zh: '全部', en: 'All' },
  { value: 'route' as const, zh: '路線', en: 'Routes' },
  { value: 'water' as const, zh: '水位站', en: 'Water' },
  { value: 'rainfall' as const, zh: '雨量站', en: 'Rain' },
]

const allSelected = computed(() => searchTypes.value.length === 3)
const hasRouteScope = computed(() => searchTypes.value.includes('route'))

function isScopeActive(scope: SearchScope) {
  return scope === 'all' ? allSelected.value : !allSelected.value && searchTypes.value.includes(scope)
}

function toggleScope(scope: SearchScope) {
  if (scope === 'all') {
    searchTypes.value = ['route', 'water', 'rainfall']
    return
  }
  if (allSelected.value) {
    searchTypes.value = [scope]
    return
  }
  if (searchTypes.value.includes(scope)) {
    if (searchTypes.value.length > 1) searchTypes.value = searchTypes.value.filter(type => type !== scope)
  } else {
    searchTypes.value = [...searchTypes.value, scope]
  }
}

const searchPlaceholder = computed(() => {
  if (allSelected.value) return locale.value === 'en' ? 'Route, place, river or station...' : '搜尋路線、地名、溪名或測站...'
  if (searchTypes.value.length > 1) return locale.value === 'en' ? 'Search selected categories...' : '搜尋所選範圍...'
  const scope = searchTypes.value[0]
  if (scope === 'route') return locale.value === 'en' ? 'Route, canyon or place...' : '搜尋路線、溪名或地名...'
  if (scope === 'water') return locale.value === 'en' ? 'Water station, river or ID...' : '搜尋水位站、溪名或站號...'
  return locale.value === 'en' ? 'Rainfall station, place or ID...' : '搜尋雨量站、地名或站號...'
})
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
  padding: 8px;
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

.quick-suggestions {
  display: grid;
  gap: 4px;
}

.quick-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #12122a;
  color: #ddd;
  text-align: left;
  cursor: pointer;
}

.quick-suggestion:hover { border-color: #6c8ef5; }
.quick-suggestion:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }
.suggestion-icon { width: 22px; display: grid; place-items: center; flex-shrink: 0; }
.suggestion-icon img { width: 20px; height: 20px; object-fit: contain; }
.suggestion-copy { min-width: 0; display: grid; gap: 1px; }
.suggestion-copy strong { overflow-wrap: anywhere; font-size: 0.78rem; }
.suggestion-copy small { color: #888; font-size: 0.68rem; overflow-wrap: anywhere; }
.suggestion-copy .matched { color: #b5c6ff; font-weight: 700; }
.suggestion-copy .matched { color: #b5c6ff; font-weight: 700; }

.result-summary {
  color: #aaa;
  font-size: 0.72rem;
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
.confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
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
