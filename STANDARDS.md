# 台灣溪降地圖 — 開發標準

> 這份文件列出專案的技術標準、架構慣例與開發規範。
> 每次新增功能或修改前先對照，避免不一致。

---

## 一、專案定位

台灣溪降地圖（Taiwan Canyoneering Map）是一個 Progressive Web App，整合：

- **溪降路線資料** — 難度、GPS、地區、季節、接駁等
- **即時水位** — 水利署開放資料 + PocketBase 歷史紀錄
- **即時雨量** — 氣象署 (CWA) 開放資料 API
- **搜尋** — 路線 / 水位站 / 雨量站三種類型統一搜尋
- **回報系統** — 問題回報、路線新增回報（含 GPX 上傳）

目標用戶：計畫溪降的玩家，需要在手機上查看地圖、水位、雨況。

---

## 二、技術棧

| 層 | 技術 |
|---|---|
| UI 框架 | Vue 3 (Composition API + `<script setup>`) |
| 語言 | TypeScript（全 `.ts` / `.vue`，不用 `.js`） |
| 打包 | Vite 5 |
| 地圖 | Leaflet 1.x + leaflet.markercluster |
| 圖表 | Chart.js 4 |
| 壓縮 | JSZip（GPX 下載） |
| 後端資料 | PocketBase（`raych-pocketbase.fly.dev`） |
| Serverless | Vercel Functions（`api/` 目錄，`.js` 格式） |
| Email | Resend API（`onboarding@resend.dev`，免費 100 封/天） |
| 部署 | Vercel（前端 + API functions） |

---

## 三、目錄結構

```
src/
  App.vue               # 根元件：地圖、搜尋、側邊欄、URL state
  style.css             # 全域 CSS + CSS variable 主題 token
  main.ts               # 應用進入點
  components/
    Map.vue             # Leaflet 地圖、圖層、marker cluster
    CanyonList.vue      # 路線列表 + 篩選器
    RouteDetail.vue     # 路線詳情卡
    SearchCard.vue      # 搜尋結果卡（路線 / 水位站 / 雨量站）
    WaterStationDetail.vue   # 水位站詳情 + 7/14 天圖表
    WaterLevelChart.vue      # Chart.js 折線圖元件
    RainfallStationDetail.vue # 雨量站詳情 + 歷史雨量
    DifficultyGuide.vue # 難度說明面板
    SettingsPanel.vue   # 設定：語言 / 主題 / 問題回報 / 路線回報
  lib/
    locale.ts           # i18n：locale ref + t() + localeRegion()
    theme.ts            # 主題：dark/light ref + localStorage
    pb.ts               # PocketBase 客戶端
    waterLevel.ts       # 水位站資料型別 + fetch 函式
    rainfall.ts         # 雨量站型別 + 站點列表
    rainfallData.ts     # 雨量歷史資料 fetch
    elevation.ts        # 高程查詢
    grade.ts            # 溪降難度等級工具
    chart.ts            # Chart.js 共用設定
    clamp.ts            # 數值工具
  data/
    canyon.ts           # Canyon 介面定義（型別來源）
    rainfall-stations.json  # 雨量站靜態清單
api/
  report.js             # POST /api/report — 問題 / 路線回報，送 Resend
  wra/[...path].js      # 水利署 API proxy（CORS）
  cwa/rainfall/[stationId].js      # CWA 即時雨量 proxy
  cwa/rainfall-history/[stationId].js # CWA 歷史雨量（Vercel + 本地 dev 共用）
```

---

## 四、環境變數

### 前端（Vite，`VITE_` prefix）

| 變數 | 用途 | 預設值 |
|---|---|---|
| `VITE_PB_URL` | PocketBase 伺服器 URL | `http://localhost:8090` |

### Serverless / 後端（Vercel env，`process.env`）

| 變數 | 用途 |
|---|---|
| `CWA_API_KEY` | 氣象署開放資料 API 金鑰 |
| `RESEND_API_KEY` | Resend Email API 金鑰 |

> **安全規則**：credentials 只能從環境變數讀取，絕對不寫死在程式碼裡。
> PocketBase 生產位址：`https://raych-pocketbase.fly.dev`

---

## 五、語言 / i18n 標準

- **預設語言**：繁體中文（`zh`）
- **切換**：`locale` ref 來自 `src/lib/locale.ts`，同步至 URL `?lang=en`
- **翻譯函式**：`t(zh, en)` — 所有 UI 文字使用此函式，不用 ternary
  ```ts
  import { t } from '../lib/locale'
  // 正確
  t('搜尋路線', 'Search routes')
  // 禁止
  locale.value === 'en' ? 'Search routes' : '搜尋路線'
  ```
- **地區名稱**：`localeRegion(name)` 轉英文縣市名
- 錯誤訊息、placeholder、label 全部雙語

---

## 六、主題 / 樣式標準

- **預設主題**：Dark（`dark`）
- **切換**：`theme` ref 來自 `src/lib/theme.ts`，寫入 `localStorage`，同步 `document.documentElement.dataset.theme`
- **CSS variables**：定義在 `style.css` 的 `:root`，dark first
  - Light 覆蓋：`:root[data-theme="light"]` 區塊
  - 不直接用 `@media (prefers-color-scheme)`，以 `data-theme` 為主
- **不用 Tailwind**（已移除，不要重新加入）
- **Scoped CSS**：元件內部樣式用 `<style scoped>`
- **手機優先**：mobile (`max-width: 640px`) 版面要先確保可用

---

## 七、URL 狀態標準

所有可分享的狀態都要同步進 URL（`history.replaceState`），讓連結可以直接還原。

| URL 參數 | 值 | 說明 |
|---|---|---|
| `q` | 搜尋字串 | 目前的搜尋 query |
| `type` | `route,water,rainfall` 的組合 | 搜尋類型（預設 `route` 時省略） |
| `route` | route id | 目前展開的路線 |
| `lang` | `en` | 語言（zh 時省略） |
| `region` | 縣市名（可多個） | 地區篩選 |
| `v`, `a`, `t`, `drop` | 篩選值 | 路線篩選器 |
| `gpx` | `1` | 只顯示有 GPX 的路線 |

---

## 八、資料來源標準

### 路線資料
- 來源：PocketBase `routes` collection
- 必填：`name`, `region`, `grading`, GPS 座標
- 選填：`name_en`, `type`, `max_drop`, `approach`, `total_time`, `deep_pool`, `ab_shuttle`, `gpx_link`, `note`

### 水位資料
- 即時：水利署開放資料 API（WRA Realtime）→ `api/wra/` proxy
- 歷史：PocketBase `water_level_observations` collection（自動排程收集）

### 雨量資料
- 站點清單：靜態 `src/data/rainfall-stations.json`
- 即時：CWA API → `api/cwa/rainfall/[stationId]` proxy
- 歷史：CWA API → `api/cwa/rainfall-history/[stationId]`（含本地 dev middleware）

---

## 九、API Serverless 函式標準

位置：`api/` 目錄，Vercel Functions 格式。

```js
// 必須
export default async function handler(req, res) { ... }

// 需要處理大 body（如 GPX base64）時
export const config = { api: { bodyParser: { sizeLimit: '7mb' } } }
```

- Method 驗證：非 POST 回 `405`
- 缺環境變數：回 `500` + 明確訊息
- 上游錯誤：回 `502` + upstream 訊息
- 不要在 API function 裡硬編碼任何 credentials

---

## 十、元件設計標準

- `<script setup lang="ts">` — 統一使用
- Props 型別：用 `defineProps<{...}>()` interface 語法
- Emit：用 `defineEmits<{...}>()` 語法
- `ref` 命名：不加 `Ref` suffix（`const loading = ref(false)` 而非 `loadingRef`）
- Computed 放在對應 ref 旁邊
- 一個元件只做一件事；父子通訊優先 props/emit，跨層用 lib 的 ref（locale, theme）

---

## 十一、回報系統標準

兩種回報類型，都走 `POST /api/report`：

| 欄位 | 問題回報 (`feedback`) | 路線回報 (`route`) |
|---|---|---|
| `reportKind` | `"feedback"` | `"route"` |
| 必填 | `message` | `route.name`, `route.region`, `route.grading`, `route.gps` |
| 附件 | — | GPX 檔案（base64，最大 5MB） |
| 收件 | terry30136@gmail.com | terry30136@gmail.com |

GPX 上傳：僅接受 `.gpx` 格式，前端驗證 + base64 轉換後放入 `gpxFile.content`。

外部系統使用 `POST /api/routes/submit` 提交路線。此公開端點只建立待審通知並回傳 `202 pending_review`，不得直接寫入正式 `canyon_routes` collection。

---

## 十二、新功能 Checklist

加入任何新功能前確認：

- [ ] 有對應的狀態要放進 URL 嗎？（加進 watch + onMounted 讀取）
- [ ] UI 文字都用了 `t(zh, en)` 嗎？
- [ ] Dark / Light 兩種主題都測過嗎？
- [ ] 手機畫面（640px 以下）正常嗎？
- [ ] 新的 credentials 有放進環境變數（不寫死）嗎？
- [ ] 如果有新的 API proxy，有加 method 驗證和錯誤處理嗎？
- [ ] 元件新增了 prop 或 emit，有加型別嗎？
