<template>
  <aside class="sidebar">
    <div class="title-row">
      <img src="/favicon-sidebar.png" class="sidebar-logo" alt="" />
      <h2 class="title">{{ locale === 'en' ? 'Taiwan Canyoning' : '台灣溪降地圖' }}</h2>
      <button class="close-sidebar-btn" @click="$emit('close')" :title="locale === 'en' ? 'Collapse' : '收合'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
    </div>

    <DifficultyGuide v-if="showGuide" :records="difficultyRecords" :loading="difficultyLoading" @close="showGuide = false" />

    <div class="guide-row">
      <button class="guide-btn" @click.stop="openGuide">{{ locale === 'en' ? 'Grading Guide' : '難度說明' }}</button>
    </div>

    <!-- 溪降路線列表 -->
    <div v-if="!routesLoading" class="list-count">
      <span>{{ canyonRoutes.length }} {{ locale === 'en' ? 'routes' : '條路線' }}</span>
      <span class="sort-note">{{ locale === 'en' ? 'Easiest first' : '由易到難' }}</span>
    </div>
    <ul ref="routeListRef" class="canyon-list">
      <li v-if="routesLoading" class="empty">{{ locale === 'en' ? 'Loading...' : '載入中...' }}</li>
      <template v-else>
        <li
          v-for="route in canyonRoutes"
          :key="route.id"
          :class="['canyon-item', { active: props.selectedRouteId === route.id }]"
          @click.stop="emit('showDetail', { kind: 'route', data: route })"
        >
          <div class="canyon-item-inner">
            <div class="canyon-right">
              <div class="canyon-name-row">
                <span class="canyon-name">{{ route.name }}</span>
                <span v-if="route.max_drop" class="canyon-drop">
                  <span class="drop-label">{{ locale === 'en' ? 'Drop' : '瀑高' }}</span>
                  {{ route.max_drop }}
                </span>
              </div>
              <div class="grade-badges">
                <span v-if="vPart(route.grading)" :class="['v-pill', vGradeClass(vPart(route.grading))]">{{ vPart(route.grading) }}</span>
                <span v-if="aPart(route.grading)" class="a-pill">{{ aPart(route.grading) }}</span>
                <span v-if="timePart(route.grading)" class="time-pill">{{ timePart(route.grading) }}</span>
                <span v-if="starsPart(route.grading)" class="stars-pill">{{ starsPart(route.grading) }}</span>
                <span v-if="!route.grading" class="type-badge type-badge--canyon">—</span>
              </div>
              <span class="canyon-location">{{ route.region }}</span>
            </div>
          </div>
        </li>
        <li v-if="canyonRoutes.length === 0" class="empty">{{ locale === 'en' ? 'No routes found, adjust filters' : '找不到符合的路線，請調整篩選條件' }}</li>
      </template>
    </ul>
    <button class="mobile-close-btn" @click="$emit('close')">{{ locale === 'en' ? 'Close ✕' : '收起 ✕' }}</button>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { vGradeClass } from '../lib/grade'
import DifficultyGuide from './DifficultyGuide.vue'
import { pb } from '../lib/pb'
import { locale } from '../lib/locale'

const showGuide = ref(false)
const difficultyRecords = ref<any[]>([])
const difficultyLoaded = ref(false)
const difficultyLoading = ref(false)

async function openGuide() {
  showGuide.value = true
  if (!difficultyLoaded.value) {
    difficultyLoading.value = true
    try {
      difficultyRecords.value = await pb.collection('difficulty_levels').getFullList({ sort: 'sort_order' })
      difficultyLoaded.value = true
    } finally {
      difficultyLoading.value = false
    }
  }
}

const props = defineProps<{
  canyonRoutes: any[]
  routesLoading: boolean
  selectedId: string | null
  selectedRouteId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  close: []
  showDetail: [item: { kind: 'canyon' | 'route', data: any }]
}>()

const routeListRef = ref<HTMLElement | null>(null)

watch(() => props.selectedRouteId, async (id) => {
  if (!id || !routeListRef.value) return
  await nextTick()
  routeListRef.value.querySelector('.canyon-item.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

// Grade component parsers — each token renders as its own pill
function vPart(grading: string): string { return grading?.match(/\bV\d+/)?.[0] ?? '' }
function aPart(grading: string): string { return grading?.match(/\bA\d+/)?.[0] ?? '' }
function timePart(grading: string): string { return grading?.match(/\b(I{1,3}|IV|VI?)\b/)?.[0] ?? '' }
function starsPart(grading: string): string {
  return (grading ?? '').replace(/\b(V\d+|A\d+|I{1,3}|IV|VI?)\b/g, '').trim()
}



</script>

<style scoped>
.sidebar {
  width: 100%;
  min-width: 0;
  height: 100dvh;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #2a2a4a;
}

.sidebar-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #6c8ef5;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.route-filters {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-row {
  display: flex;
  gap: 6px;
}

.filter-select {
  flex: 1;
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

.guide-row {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.guide-btn {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid #3a3a5a;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}
.guide-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
.guide-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.title-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lang-btn {
  background: none;
  border: 1px solid #3a3a5a;
  color: #888;
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: all 0.15s;
}
.lang-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
.lang-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.close-sidebar-btn {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-sidebar-btn:hover { color: #aaa; }
.close-sidebar-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

/* Region tabs */
.region-tabs {
  display: flex;
  padding: 8px 12px;
  gap: 6px;
  border-bottom: 1px solid #2a2a4a;
}

.region-tab {
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
.region-tab:hover { border-color: #6c8ef5; color: #ccc; }
.region-tab.active { background: #6c8ef5; border-color: #6c8ef5; color: #fff; font-weight: 600; }
.region-tab:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

/* Type tabs */
.type-tabs {
  display: flex;
  border-bottom: 1px solid #2a2a4a;
}

.type-tab {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: transparent;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.type-tab:hover {
  color: #ccc;
}

.type-tab.active {
  color: #fff;
  font-weight: 600;
}

.type-tab--river.active   { border-bottom-color: #6c8ef5; color: #6c8ef5; }
.type-tab--canyon.active  { border-bottom-color: #f5a030; color: #f5a030; }
.type-tab--hotspring.active { border-bottom-color: #f56c8e; color: #f56c8e; }
.type-tab:focus-visible { outline: 2px solid #6c8ef5; outline-offset: -2px; }

/* Search */
.search-section {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

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
  line-height: 1;
  border-radius: 3px;
  transition: color 0.15s;
}
.search-clear:hover { color: #aaa; }
.search-clear:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

/* List */
.canyon-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}


.list-count {
  padding: 6px 16px;
  font-size: 0.8rem;
  color: #999;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sort-note {
  color: #6c8ef5;
  font-size: 0.72rem;
  white-space: nowrap;
}

.canyon-item {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background 0.15s;
}

.canyon-item:hover { background: #252545; }
.canyon-item.active { background: #1e2d6b; border-left: 3px solid #6c8ef5; }

.canyon-item-inner {
  display: flex;
}

.canyon-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.canyon-name-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.canyon-drop {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f5a030;
  line-height: 1.3;
}

.drop-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: #9aa3b8;
}

.canyon-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #fff;
  line-height: 1.3;
  white-space: pre-line;
}

.grade-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* V-grade difficulty color scale: V1 (green/safe) → V6 (purple/extreme) */
.v-pill {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.v-pill:is(.v1,.v2,.v3,.v4,.v5,.v6) { background: var(--vg-bg); color: var(--vg-fg); }

/* A-grade: sky blue (matches RouteDetail water tag) */
.a-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0e2a3a;
  color: #38bdf8;
}
/* Time grade: orange (matches RouteDetail time tag) */
.time-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #2a1e0e;
  color: #f5a030;
}
/* Stars: gold, no bg — they're decoration not data */
.stars-pill {
  font-size: 0.7rem;
  color: #f0a030;
  letter-spacing: 1px;
}

.type-badge {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.type-badge--river     { background: #1e2d6b; color: #6c8ef5; }
.type-badge--canyon    { background: #3a2800; color: #f5a030; }
.type-badge--hotspring { background: #3a1020; color: #f56c8e; }

.canyon-location { font-size: 0.72rem; color: #666; }

.empty {
  padding: 20px 16px;
  color: #999;
  font-size: 0.875rem;
  text-align: center;
}

.mobile-close-btn {
  display: none;
}

@media (max-width: 640px) {
  .mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 18px;
    background: #12122a;
    border: none;
    border-top: 1px solid #2a2a4a;
    color: #888;
    font-size: 0.95rem;
    cursor: pointer;
    position: sticky;
    bottom: 0;
    flex-shrink: 0;
  }
  .mobile-close-btn:hover { color: #ccc; }
}
</style>
