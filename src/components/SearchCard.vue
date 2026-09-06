<template>
  <div class="search-card">
    <div class="card-header">
      <span class="card-title">{{ locale === 'en' ? 'Search & Filter' : '搜尋篩選' }}</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- Region filter -->
    <div class="region-row">
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
        :placeholder="locale === 'en' ? 'Name or city...' : '地點名稱或縣市...'"
      />
      <button v-if="search" class="search-clear" @click="search = ''">✕</button>
    </div>

    <!-- Grade filters -->
    <div class="filter-grid">
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
    <label class="gpx-toggle">
      <input type="checkbox" v-model="gpx" />
      <span class="gpx-label">{{ locale === 'en' ? 'Has GPX track' : '有完整 GPX 路線' }}</span>
    </label>

    <button class="clear-btn" @click="emit('clearAll')">
      {{ locale === 'en' ? 'Clear All Filters' : '清除全部篩選' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { locale, localeRegion } from '../lib/locale'

defineProps<{ selectedRegion: string[] }>()

const emit = defineEmits<{
  close: []
  filterRegion: [region: string]
  clearAll: []
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

const inputRef = ref<HTMLInputElement | null>(null)
onMounted(() => nextTick(() => inputRef.value?.focus()))

const vOptions = ['V1','V2','V3','V4','V5','V6','V7']
const aOptions = ['A1','A2','A3','A4','A5','A6','A7']
const tOptions = ['I','II','III','IV','V','VI']
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

@media (max-width: 640px) {
  .search-card {
    top: 8px;
    right: 8px;
    left: 8px;
    width: auto;
  }
}
</style>
