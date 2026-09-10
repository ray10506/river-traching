<template>
  <div class="settings-backdrop" @click="$emit('close')" />

  <div class="settings-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <button v-if="view !== 'main'" class="back-btn" :aria-label="t('返回', 'Back')" @click="view = 'main'">
          ←
        </button>
        <span class="panel-title">
          {{
            view === "main"
              ? t("設定", "Settings")
              : view === "feedback"
                ? t("問題回報", "Report an Issue")
                : t("路線回報", "Submit a Route")
          }}
        </span>
      </div>
      <button class="close-btn" :aria-label="t('關閉', 'Close')" @click="$emit('close')">✕</button>
    </div>

    <!-- ── Main view ── -->
    <template v-if="view === 'main'">
      <div class="setting-row">
        <span class="setting-label">{{ t("語言", "Language") }}</span>
        <div class="lang-toggle">
          <button
            :class="['lang-opt', { active: locale === 'zh' }]"
            @click="locale = 'zh'"
          >
            中文
          </button>
          <button
            :class="['lang-opt', { active: locale === 'en' }]"
            @click="locale = 'en'"
          >
            English
          </button>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">{{ t("外觀", "Appearance") }}</span>
        <div class="lang-toggle">
          <button
            :class="['lang-opt', { active: theme === 'dark' }]"
            :aria-pressed="theme === 'dark'"
            @click="theme = 'dark'"
          >
            {{ t("深色", "Dark") }}
          </button>
          <button
            :class="['lang-opt', { active: theme === 'light' }]"
            :aria-pressed="theme === 'light'"
            @click="theme = 'light'"
          >
            {{ t("淺色", "Light") }}
          </button>
        </div>
      </div>

      <div class="divider" />

      <div class="menu-btns">
        <button class="menu-btn" @click="view = 'feedback'">
          <span class="menu-icon">🐛</span>
          <div class="menu-text">
            <strong>{{ t("問題回報", "Report an Issue") }}</strong>
            <small>{{ t("錯誤、功能建議", "Bugs, errors, UX feedback") }}</small>
          </div>
          <span class="menu-arrow">›</span>
        </button>
        <button class="menu-btn" @click="view = 'route'">
          <span class="menu-icon">🗺️</span>
          <div class="menu-text">
            <strong>{{ t("路線回報", "Submit a Route") }}</strong>
            <small>{{ t("回報新路線資訊", "Add a new canyon route") }}</small>
          </div>
          <span class="menu-arrow">›</span>
        </button>
      </div>
    </template>

    <!-- ── Feedback view ── -->
    <template v-else-if="view === 'feedback'">
      <div v-if="fbState === 'sent'" class="sent-msg">
        {{ t("✓ 已送出，謝謝你的回報！", "✓ Sent! Thanks for your feedback.") }}
      </div>
      <template v-else>
        <div class="type-row">
          <button
            v-for="opt in fbTypes"
            :key="opt.value"
            :class="['type-btn', { active: fbType === opt.value }]"
            @click="fbType = opt.value"
          >
            {{ t(opt.zh, opt.en) }}
          </button>
        </div>
        <textarea
          class="field-input"
          v-model="fbMsg"
          rows="4"
          :placeholder="t('描述問題或建議…', 'Describe the issue or suggestion…')"
        />
        <input
          class="field-input"
          v-model="fbEmail"
          type="email"
          :placeholder="t('你的信箱（可不填）', 'Your email (optional)')"
        />
        <div v-if="fbState === 'error'" class="error-msg">{{ fbError }}</div>
        <button
          class="submit-btn"
          :disabled="fbState === 'sending' || !fbMsg.trim()"
          @click="submitFeedback"
        >
          {{ fbState === "sending" ? t("送出中…", "Sending…") : t("送出", "Send") }}
        </button>
      </template>
    </template>

    <!-- ── Route view ── -->
    <template v-else-if="view === 'route'">
      <div v-if="rtState === 'sent'" class="sent-msg">
        {{ t("✓ 已送出，感謝你的路線回報！", "✓ Sent! We'll review your route submission.") }}
      </div>
      <template v-else>
        <div class="form-section">
          <div class="form-group-label">{{ t("必填", "Required") }}</div>

          <label class="field-label">{{ t("路線名稱", "Route name") }} *</label>
          <input
            class="field-input"
            v-model="rt.name"
            :placeholder="t('例：南湖溪', 'e.g. 南湖溪')"
          />

          <label class="field-label">{{ t("縣市", "County") }} *</label>
          <select class="field-input" v-model="rt.region">
            <option value="">{{ t("選擇縣市…", "Select county…") }}</option>
            <option v-for="c in counties" :key="c" :value="c">{{ c }}</option>
          </select>

          <label class="field-label">{{ t("難度", "Difficulty (grading)") }} *</label>
          <input
            class="field-input"
            v-model="rt.grading"
            :placeholder="t('例：V3 A2 III ★★', 'e.g. V3 A2 III ★★')"
          />
          <p class="field-hint">
            {{ t("V 難度 · A 難度 · 時間（I–VI）· 星等", "V-grade · A-grade · time (I–VI) · stars") }}
          </p>

          <label class="field-label">{{ t("GPS 座標（入口）", "GPS (entry point)") }} *</label>
          <input
            class="field-input"
            v-model="rt.gps"
            :placeholder="t('緯度, 經度', '24.123456, 121.654321')"
          />
        </div>

        <div class="divider" />

        <div class="form-section">
          <div class="form-group-label">{{ t("選填", "Optional") }}</div>

          <label class="field-label">{{ t("英文名稱", "English name") }}</label>
          <input
            class="field-input"
            v-model="rt.name_en"
            placeholder="e.g. Nanhu Creek"
          />

          <label class="field-label">{{ t("類型", "Route type") }}</label>
          <select class="field-input" v-model="rt.type">
            <option value="">—</option>
            <option value="溪降">溪降</option>
            <option value="溯溪">溯溪</option>
            <option value="野溪溫泉">野溪溫泉</option>
          </select>

          <label class="field-label">{{ t("最大落差", "Max drop") }}</label>
          <input
            class="field-input"
            v-model="rt.max_drop"
            :placeholder="t('例：50m', 'e.g. 50m')"
          />

          <label class="field-label">{{ t("入口方式", "Approach / entry") }}</label>
          <input
            class="field-input"
            v-model="rt.approach"
            :placeholder="t('', 'e.g. 1.5 hr hike')"
          />

          <label class="field-label">{{ t("總時間", "Total time") }}</label>
          <input
            class="field-input"
            v-model="rt.total_time"
            :placeholder="t('例：6-8 小時', 'e.g. 6–8 hrs')"
          />

          <label class="field-label">{{ t("深水區", "Deep pool") }}</label>
          <select class="field-input" v-model="rt.deep_pool">
            <option value="">—</option>
            <option value="有">有</option>
            <option value="無">無</option>
            <option value="不確定">不確定</option>
          </select>

          <label class="field-label">{{ t("接駁", "AB Shuttle") }}</label>
          <input
            class="field-input"
            v-model="rt.ab_shuttle"
            :placeholder="t('不需要 / 方式說明', 'Shuttle details or Not required')"
          />

          <label class="field-label">{{ t("GPX 檔案", "GPX file") }}</label>
          <div class="file-upload">
            <input ref="gpxInput" type="file" accept=".gpx" class="file-input-hidden" @change="onGpxFile" />
            <button type="button" class="file-btn" @click="gpxInput!.click()">
              {{ t("選擇檔案", "Choose file") }}
            </button>
            <span class="file-name">{{ rtGpxFile ? rtGpxFile.name : t("未選擇檔案", "No file chosen") }}</span>
            <button v-if="rtGpxFile" type="button" class="file-clear" :aria-label="t('清除檔案', 'Clear file')" @click="clearGpx">✕</button>
          </div>
          <p v-if="gpxError" class="error-msg" style="margin:0">{{ gpxError }}</p>

          <label class="field-label">{{ t("備注", "Notes") }}</label>
          <textarea
            class="field-input"
            v-model="rt.note"
            rows="3"
            :placeholder="t('其他資訊…', 'Any other info…')"
          />

          <label class="field-label">{{ t("你的信箱（可不填）", "Your email (optional)") }}</label>
          <input class="field-input" v-model="rtEmail" type="email" />
        </div>

        <div v-if="rtState === 'error'" class="error-msg">{{ rtError }}</div>
        <button
          class="submit-btn"
          :disabled="rtState === 'sending' || !rtValid"
          @click="submitRoute"
        >
          {{ rtState === "sending" ? t("送出中…", "Sending…") : t("送出", "Send") }}
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { locale, t } from "../lib/locale";
import { theme } from "../lib/theme";

defineEmits<{ close: [] }>();

const view = ref<"main" | "feedback" | "route">("main");

// ── Feedback ──
const fbTypes = [
  { value: "bug", zh: "🐛 Bug", en: "🐛 Bug" },
  { value: "suggestion", zh: "💡 建議", en: "💡 Idea" },
  { value: "other", zh: "📝 其他", en: "📝 Other" },
];
const fbType = ref("bug");
const fbMsg = ref("");
const fbEmail = ref("");
const fbState = ref<"idle" | "sending" | "sent" | "error">("idle");
const fbError = ref("");

async function submitFeedback() {
  if (!fbMsg.value.trim() || fbState.value === "sending") return;
  fbState.value = "sending";
  try {
    const r = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportKind: "feedback",
        type: fbType.value,
        message: fbMsg.value,
        contactEmail: fbEmail.value || undefined,
      }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "Send failed");
    fbState.value = "sent";
  } catch (e) {
    fbError.value = e instanceof Error ? e.message : "送出失敗，請稍後再試";
    fbState.value = "error";
  }
}

// ── Route ──
const counties = [
  "新北市",
  "台北市",
  "桃園市",
  "台中市",
  "台南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "嘉義市",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義縣",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
  "澎湖縣",
  "連江縣",
  "金門縣",
];

const rt = reactive({
  name: "", name_en: "", region: "", type: "", grading: "", gps: "",
  max_drop: "", approach: "", total_time: "", deep_pool: "", ab_shuttle: "", note: "",
});
const rtEmail   = ref("");
const rtState   = ref<"idle" | "sending" | "sent" | "error">("idle");
const rtError   = ref("");
const rtGpxFile = ref<File | null>(null);
const gpxInput  = ref<HTMLInputElement | null>(null);
const gpxError  = ref("");

const rtValid = computed(
  () => rt.name.trim() && rt.region && rt.grading.trim() && rt.gps.trim(),
);

function onGpxFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  gpxError.value = ""
  if (!file) return
  if (!file.name.toLowerCase().endsWith(".gpx")) {
    gpxError.value = t("只接受 .gpx 格式的檔案。", "Only .gpx files are accepted.")
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    gpxError.value = t("檔案過大（上限 5 MB）。", "File too large (max 5 MB).")
    return
  }
  rtGpxFile.value = file
}

function clearGpx() {
  rtGpxFile.value = null
  gpxError.value = ""
  if (gpxInput.value) gpxInput.value.value = ""
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function submitRoute() {
  if (!rtValid.value || rtState.value === "sending") return;
  rtState.value = "sending";
  try {
    const gpxFile = rtGpxFile.value
      ? { name: rtGpxFile.value.name, content: await fileToBase64(rtGpxFile.value) }
      : undefined
    const r = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportKind: "route",
        route: { ...rt },
        gpxFile,
        contactEmail: rtEmail.value || undefined,
      }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "Send failed");
    rtState.value = "sent";
  } catch (e) {
    rtError.value = e instanceof Error ? e.message : "送出失敗，請稍後再試";
    rtState.value = "error";
  }
}
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
}

.settings-panel {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1201;
  width: min(340px, calc(100vw - 32px));
  max-height: calc(100dvh - 140px);
  overflow-y: auto;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Header ── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #6c8ef5;
}

.back-btn {
  background: none;
  border: none;
  color: #6c8ef5;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.back-btn:hover {
  color: #8aaaf8;
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
.close-btn:hover {
  color: #aaa;
}

/* ── Language ── */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.setting-label {
  font-size: 0.875rem;
  color: #aaa;
  flex-shrink: 0;
}
.lang-toggle {
  display: flex;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  overflow: hidden;
}
.lang-opt {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.lang-opt + .lang-opt {
  border-left: 1px solid #3a3a5a;
}
.lang-opt.active {
  background: #6c8ef5;
  color: #fff;
  font-weight: 600;
}

.divider {
  border: none;
  border-top: 1px solid #252545;
  flex-shrink: 0;
}

/* ── Main menu ── */
.menu-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: #131328;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
}
.menu-btn:hover {
  border-color: #6c8ef5;
}

.menu-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-text strong {
  font-size: 0.875rem;
  color: #d0d0e8;
  font-weight: 600;
}
.menu-text small {
  font-size: 0.72rem;
  color: #666;
}

.menu-arrow {
  color: #444;
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* ── Form shared ── */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}

.field-label {
  font-size: 0.78rem;
  color: #888;
  margin-top: 6px;
}
.field-label:first-of-type {
  margin-top: 0;
}

.field-input {
  width: 100%;
  background: #131328;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #d0d0e8;
  font-size: 0.82rem;
  font-family: inherit;
  padding: 8px 10px;
  box-sizing: border-box;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus {
  border-color: #6c8ef5;
}
.field-input::placeholder {
  color: #444;
}
select.field-input {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.field-hint {
  font-size: 0.72rem;
  color: #555;
  margin: 0;
}

/* ── Feedback type buttons ── */
.type-row {
  display: flex;
  gap: 6px;
}
.type-btn {
  flex: 1;
  font-size: 0.72rem;
  padding: 5px 4px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  background: #131328;
  color: #888;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.type-btn.active {
  border-color: #6c8ef5;
  color: #c0ccff;
}

/* ── Submit / status ── */
.submit-btn {
  align-self: flex-end;
  padding: 7px 20px;
  background: #6c8ef5;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 4px;
}
.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.submit-btn:not(:disabled):hover {
  opacity: 0.85;
}

.error-msg {
  font-size: 0.78rem;
  color: #e05c5c;
}

.sent-msg {
  font-size: 0.85rem;
  color: #5ecb6f;
  padding: 16px 0;
  text-align: center;
}

/* ── File upload ── */
.file-upload { display: flex; align-items: center; gap: 8px; }
.file-input-hidden { display: none; }

.file-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  background: #131328;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #aaa;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.file-btn:hover { border-color: #6c8ef5; color: #c0ccff; }

.file-name {
  font-size: 0.75rem;
  color: #666;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.file-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #555;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  border-radius: 3px;
}
.file-clear:hover { color: #e05c5c; }
</style>
