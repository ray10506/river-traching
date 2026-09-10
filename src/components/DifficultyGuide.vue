<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ locale === 'en' ? 'Canyon Grading Guide' : '溪降難度分級說明' }}</h2>
          <button class="close-btn" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body" v-if="loading" style="display:flex;align-items:center;justify-content:center;color:#888;min-height:200px">
          {{ locale === 'en' ? 'Loading...' : '載入中...' }}
        </div>
        <div class="modal-body" v-else>
          <div class="grid">
            <!-- 繩索 -->
            <section class="col">
              <h3 class="col-title rope">{{ locale === 'en' ? 'Rope (V)' : '繩索（V）' }}</h3>
              <div v-for="level in ropeLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'rope', vGradeClass(level.code)]">{{ level.code }}</div>
                <div class="level-content">
                  <div class="level-name">{{ localeName(level) }}</div>
                  <ul>
                    <li v-for="item in localeItems(level)" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- 水域 -->
            <section class="col">
              <h3 class="col-title water">{{ locale === 'en' ? 'Aquatic (A)' : '水域（A）' }}</h3>
              <div v-for="level in waterLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'water']">{{ level.code }}</div>
                <div class="level-content">
                  <div class="level-name">{{ localeName(level) }}</div>
                  <ul>
                    <li v-for="item in localeItems(level)" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- 時間 -->
            <section class="col">
              <h3 class="col-title time">{{ locale === 'en' ? 'Commitment (T)' : '時間（T）' }}</h3>
              <div v-for="level in timeLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'time']">{{ level.code }}</div>
                <div class="level-content">
                  <ul>
                    <li v-for="item in localeItems(level)" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <!-- 附加說明 -->
              <div class="notes">
                <div class="note-item"><span class="tag tag-d">D</span>{{ locale === 'en' ? 'Drill required' : '須攜帶電鑽' }}</div>
                <div class="note-item"><span class="tag tag-u">U</span>{{ locale === 'en' ? 'Undeveloped' : '未開發完成' }}</div>
                <div class="note-divider"></div>
                <div class="note-item"><span class="note-label">{{ locale === 'en' ? 'Min rope' : '最短繩長' }}</span>{{ locale === 'en' ? 'Longest rappel length on route' : '標路線最長繩距的長度' }}</div>
                <div class="note-item"><span class="note-label danger">{{ locale === 'en' ? 'Hazardous flow' : '危險激流' }}</span>{{ locale === 'en' ? 'Recirculating, hydraulic, siphon, etc.' : '回流、翻滾流、水洞等' }}</div>
              </div>
            </section>
          </div>

          <!-- 星級路線 -->
          <div class="star-section">
            <h3 class="col-title star">{{ locale === 'en' ? 'Route Rating' : '路線星級' }}</h3>
            <div class="star-table">
              <!-- Row 1: icons -->
              <div class="star-row star-row--icons">
                <div v-for="s in starLevel" :key="s.stars" class="star-cell star-cell--icon">{{ s.stars }}</div>
              </div>
              <!-- Row 2: labels -->
              <div class="star-row star-row--labels">
                <div v-for="s in starLevel" :key="s.stars + '_l'" class="star-cell star-cell--label">
                  <span class="star-name">{{ s.name }}</span>
                  <span class="star-desc">{{ s.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { vGradeClass } from '../lib/grade'
import { locale } from '../lib/locale'

const props = defineProps<{ records: any[], loading: boolean }>()
defineEmits<{ close: [] }>()

// Pick locale-appropriate fields from each record
function localeName(r: any)  { return (locale.value === 'en' ? r.name_en  : r.name)  ?? r.name ?? '' }
function localeItems(r: any) { return (locale.value === 'en' ? r.items_en : r.items) ?? r.items ?? [] }

const ropeLevel  = computed(() => props.records.filter(r => r['type'] === 'rope'))
const waterLevel = computed(() => props.records.filter(r => r['type'] === 'water'))
const timeLevel  = computed(() => props.records.filter(r => r['type'] === 'time'))
const starLevel  = computed(() =>
  props.records.filter(r => r['type'] === 'star' && r['code'] !== '無星').map(r => ({
    stars: r['code'],
    name:  localeName(r),
    desc:  localeItems(r)[0] ?? '',
  }))
)
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }

.modal-body {
  overflow-y: auto;
  padding: 16px 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.col-title {
  font-size: 0.95rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}
.col-title.rope      { background: #1e2d6b; color: #6c8ef5; }
.col-title.water     { background: #0e2a3a; color: #38bdf8; }
.col-title.time      { background: #2a1e0e; color: #f5a030; }

.level-card {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.level-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
}
.level-badge.rope        { background: #1e2d6b; color: #6c8ef5; } /* fallback */
.level-badge.rope:is(.v1,.v2,.v3,.v4,.v5,.v6) { background: var(--vg-bg); color: var(--vg-fg); }
.level-badge.water { background: #0e2a3a; color: #38bdf8; }
.level-badge.time  { background: #2a1e0e; color: #f5a030; }

.level-content {
  flex: 1;
}

.level-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e8e8e8;
  margin-bottom: 4px;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

ul li {
  font-size: 0.875rem;
  color: #aaa;
  line-height: 1.6;
}

ul li::before {
  content: '· ';
  color: #777;
}

/* 附加說明 */
.notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: #aaa;
}

.note-divider { height: 1px; background: #2a2a4a; margin: 4px 0; }

.tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.tag-d { background: #1e3a1e; color: #6abf8a; }
.tag-u { background: #3a2800; color: #f5a030; }

.note-label {
  font-weight: 600;
  color: #ccc;
  flex-shrink: 0;
}
.note-label.danger { color: #f56c8e; }

/* 星級 */
.star-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #2a2a4a;
}

.col-title.star { background: #2a2400; color: #f5d030; margin-bottom: 12px; }

.star-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.star-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  min-width: 480px;
}

.star-cell {
  border: 1px solid #2a2a4a;
  border-right: none;
  background: #1a1a2e;
  text-align: center;
}
.star-cell:last-child { border-right: 1px solid #2a2a4a; }

.star-row--icons .star-cell {
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 8px 6px;
  font-size: 0.85rem;
  color: #f5d030;
  letter-spacing: 1px;
}

.star-row--labels .star-cell {
  border-radius: 0 0 8px 8px;
  padding: 6px 4px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.star-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #eee;
}

.star-desc {
  font-size: 0.7rem;
  color: #aaa;
  line-height: 1.3;
}
</style>
