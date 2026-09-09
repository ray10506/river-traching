# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + Vite + TypeScript + Leaflet + PocketBase + Chart.js；部署在 Vercel。

## Users

台灣溪降愛好者，在**行前計畫階段**使用：確認路線難度、查即時水位與雨量、評估是否出發。次要受眾：同一社群的溪降同好（分享連結）。

## Product Purpose

整合台灣溪降路線資料與即時水文資訊（水位站、雨量站）的互動式地圖工具。讓玩家在出發前，在同一個畫面上看到路線 GPX 軌跡、難度分級（V/A/羅馬數字）、以及當下水文狀況，減少在多個政府網站間切換的摩擦。

## Positioning

唯一整合 GPX 路線軌跡 + 台灣官方水文資料（WRA 水位、CWA 雨量）+ 溪降分級（V/A/I–VI）的工具，專為溪降行前決策設計，而不是通用登山 app 或政府水文入口的複製。

## Operating Context

- 使用情境：出發前一晚或當天早上，在電腦或手機上查詢
- 使用者熟悉溪降分級系統（V/A/羅馬數字代表什麼）
- 資料來源依賴外部 API（WRA 水利署、CWA 氣象署），偶有停機
- 路線資料存在 PocketBase，由管理者（目前為作者本人）維護

## Capabilities and Constraints

- 路線清單支援依 V → A → 羅馬數字難度排序與篩選
- 地圖顯示 GPX 軌跡、起點標記、水位站與雨量站
- 水位資料來自 WRA（gweb.wra.gov.tw），API 偶有不穩
- 雨量資料來自 CWA OpenData API（需 API key）
- 路線資料（gpx_track、gpx_waypoints）存 PocketBase，JSON 格式
- 尚無正式對外名稱；目前為個人 side project，計畫分享給溪降社群
- 無會員系統，無登入牆

## Brand Commitments

尚無正式名稱與視覺識別。現有介面採深色調（`#1a1a2e` 背景、`#6c8ef5` 主色）。

## Evidence on Hand

- `/src/components/`：CanyonList、Map、RouteDetail、WaterStationDetail、RainfallStationDetail 等元件
- `/api/`：Vercel serverless functions 代理 WRA 與 CWA API
- `/scripts/import-gpx.mjs`：GPX 批次匯入 PocketBase 腳本
- 路線 GPX 軌跡已匯入多筆（藏龍峽谷、高義瀑布群、綠寶石、溫泉溪鬼斧神工、美雅谷、大智瀑布等）

## Product Principles

1. **水文優先**：資料即時性與準確性比視覺豐富度更重要，若 API 掛掉要明確告知。
2. **行前決策**：介面應在 30 秒內讓使用者判斷「這條路線今天適合去嗎」。
3. **溪降社群語境**：術語（V/A/溯溪/溪降）用台灣社群慣用說法，不翻譯成通用登山語彙。
4. **輕量管理**：路線資料由單一管理者維護，工具不需要複雜的 CMS 功能。
5. **可分享**：URL 狀態與路線細節卡片設計應考慮截圖分享給 Line/FB 社群。

## Backlog

- [ ] 統一水位與雨量資訊的判讀體驗：在 `RouteDetail.vue` 加入鄰近水位站與雨量站的簡短狀態列，並讓 `RainfallStationDetail.vue` 依 24／72 小時累積雨量顯示與水位卡一致的提示卡。提示應呈現實際數值與「近期降雨較少／請留意／累積雨量偏高」等資料判讀，不直接宣稱溪谷安全或危險。
