<template>
  <div class="app-layout">
    <div v-if="loading" class="loading-overlay">
      <span>{{ locale === "en" ? "Loading..." : "載入資料中..." }}</span>
    </div>
    <div v-else-if="loadError" class="loading-overlay error">
      <span>{{
        locale === "en" ? "Unable to load data" : "資料暫時無法載入"
      }}</span>
      <button class="retry-btn" @click="fetchRoutes(true)">
        {{ locale === "en" ? "Retry" : "重試" }}
      </button>
    </div>
    <template v-else>
      <div
        :class="[
          'sidebar-wrap',
          { closed: !sidebarOpen, resizing: isResizing },
        ]"
        :style="{ width: sidebarWidth + 'px', minWidth: sidebarWidth + 'px' }"
      >
        <CanyonList
          :canyon-routes="filteredRoutes"
          :routes-loading="routesLoading"
          :selected-id="selectedId"
          :selected-route-id="selectedRouteId"
          @select="selectedId = $event"
          @close="sidebarOpen = false"
          @show-detail="detailItem = $event"
        />
        <div
          v-if="sidebarOpen"
          class="resize-handle"
          @mousedown="startResize"
        />
      </div>
      <div class="map-container">
        <button
          v-if="!sidebarOpen"
          class="sidebar-open-btn"
          @click="sidebarOpen = true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <Map
          :selected-id="selectedId"
          :focus-point="routeFocusPoint"
          :route-track="routeTrack"
          :canyon-route-markers="canyonRouteMarkers"
          :selected-route-id="selectedRouteId"
          :nearby-anchor="nearbyAnchor"
          @select-route="onSelectRoute"
          @select-water-station="
            (s, d) => (waterStationDetail = { station: s, days: 7, distance: d })
          "
          @select-rainfall-station="
            (s, p, d) => (rainfallStationDetail = { station: s, pos: p, distance: d })
          "
        />
      </div>
      <RouteDetail
        v-if="detailItem"
        :item="detailItem"
        :init-pos="cardInitPos"
        @close="detailItem = null"
      />
      <WaterStationDetail
        v-if="waterStationDetail"
        :station="waterStationDetail.station"
        :days="waterStationDetail.days"
        :distance="waterStationDetail.distance"
        @close="waterStationDetail = null"
      />
      <RainfallStationDetail
        v-if="rainfallStationDetail"
        :station="rainfallStationDetail.station"
        :pos="rainfallStationDetail.pos"
        :distance="rainfallStationDetail.distance"
        @close="rainfallStationDetail = null"
      />

      <!-- Dismiss backdrop for search card -->
      <div v-if="activePanel === 'search'" class="panel-dismiss" @click="activePanel = null" />

      <!-- Search card (top-right floating) -->
      <SearchCard
        v-if="activePanel === 'search'"
        v-model:search-query="searchQuery"
        v-model:v="routeFilter.v"
        v-model:a="routeFilter.a"
        v-model:t="routeFilter.t"
        v-model:drop="routeFilter.drop"
        v-model:gpx="filterGpx"
        :selected-region="selectedRegion"
        @close="activePanel = null"
        @filter-region="toggleRegion($event)"
        @clear-all="clearAllFilters"
      />

      <!-- Settings panel -->
      <SettingsPanel
        v-if="activePanel === 'settings'"
        @close="activePanel = null"
      />

      <!-- Active filter chips — visible when card is closed and filters are on -->
      <transition name="chips">
        <div
          v-if="activeFilters.length && activePanel !== 'search'"
          class="filter-chips"
        >
          <button
            v-for="f in activeFilters"
            :key="f.label"
            class="filter-chip"
            @click="f.clear()"
          >
            {{ f.label }} ✕
          </button>
          <button
            v-if="activeFilters.length > 1"
            class="filter-chip filter-chip--clear"
            @click="clearAllFilters"
          >
            {{ locale === "en" ? "Clear all" : "全部清除" }}
          </button>
        </div>
      </transition>

      <!-- Bottom toolbar -->
      <div class="bottom-bar">
        <button
          :class="[
            'bar-btn',
            { active: activePanel === 'search' || activeFilters.length > 0 },
          ]"
          @click="activePanel = activePanel === 'search' ? null : 'search'"
          :title="locale === 'en' ? 'Search' : '搜尋'"
        >
          <div class="bar-btn-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span
              v-if="activeFilters.length && activePanel !== 'search'"
              class="filter-badge"
              >{{ activeFilters.length }}</span
            >
          </div>
          <span>{{ locale === "en" ? "Search" : "搜尋" }}</span>
        </button>
        <button
          :class="['bar-btn', { active: activePanel === 'settings' }]"
          @click="activePanel = activePanel === 'settings' ? null : 'settings'"
          :title="locale === 'en' ? 'Settings' : '設定'"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
          <span>{{ locale === "en" ? "Settings" : "設定" }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { locale, localeRegion } from "./lib/locale";
import Map from "./components/Map.vue";
import CanyonList from "./components/CanyonList.vue";
import RouteDetail from "./components/RouteDetail.vue";
import WaterStationDetail from "./components/WaterStationDetail.vue";
import RainfallStationDetail from "./components/RainfallStationDetail.vue";
import SearchCard from "./components/SearchCard.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { pb } from "./lib/pb";
import { clamp } from "./lib/clamp";
import { fetchElevation } from "./lib/elevation";
import type { WaterStation } from "./lib/waterLevel";
import type { RainfallStation } from "./lib/rainfall";

const sidebarOpen = ref(window.innerWidth > 640);
const activePanel = ref<"search" | "settings" | null>(null);
const detailItem = ref<{ kind: "canyon" | "route"; data: any } | null>(null);
const sidebarWidth = ref(280);
const waterStationDetail = ref<{ station: WaterStation; days: number; distance?: number } | null>(
  null,
);
const rainfallStationDetail = ref<{
  station: RainfallStation;
  pos: { x: number; y: number };
  distance?: number;
} | null>(null);

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const routeFocusPoint = computed((): [number, number] | null => {
  if (detailItem.value?.kind !== "route") return null;
  const gps = detailItem.value.data.gps?.trim();
  if (!gps) return null;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length >= 2 && isValidLatLng(parts[0], parts[1]))
    return [parts[0], parts[1]];
  return null;
});

const cardInitPos = computed((): { x: number; y: number } | null => {
  if (detailItem.value?.kind !== "route") return null;
  if (window.innerWidth <= 640) return null; // mobile: CSS bottom sheet handles positioning
  const gps = detailItem.value.data.gps?.trim();
  if (!gps) return null;

  const mapLeft = sidebarOpen.value ? sidebarWidth.value : 0;
  const mapCenterX = mapLeft + (window.innerWidth - mapLeft) / 2;
  const mapCenterY = window.innerHeight / 2;
  const cardW = 380;
  const cardH = 420;
  const gap = 24;

  const rawX =
    mapCenterX + gap + cardW <= window.innerWidth
      ? mapCenterX + gap
      : mapCenterX - gap - cardW;

  const x = clamp(rawX, 0, window.innerWidth - cardW);
  const y = clamp(mapCenterY + gap, 0, window.innerHeight - cardH - gap);
  return { x, y };
});
const isResizing = ref(false);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  e.preventDefault();
  const onMove = (ev: MouseEvent) => {
    const max = window.innerWidth / 2;
    sidebarWidth.value = Math.min(Math.max(ev.clientX, 200), max);
  };
  const onUp = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

const loading = ref(true);
const loadError = ref(false);

const canyonRoutes = ref<any[]>([]);
const routesLoaded = ref(false);
const routesLoading = ref(false);
const routeFilter = ref({ v: "", a: "", t: "", drop: "" });
const filterGpx = ref(false);

const selectedId = ref<string | null>(null);
const searchQuery = ref("");
const selectedRegion = ref<string[]>([]);

const routeTrack = computed(() => {
  if (detailItem.value?.kind !== "route") return null;
  const d = detailItem.value.data;
  if (!d.gpx_track) return null;
  try {
    const mapLeft = sidebarOpen.value ? sidebarWidth.value : 0;
    const mapCenterX = mapLeft + (window.innerWidth - mapLeft) / 2;
    const cardW = 380;
    const gap = 24;
    const cardOnRight = mapCenterX + gap + cardW <= window.innerWidth;
    return {
      track: JSON.parse(d.gpx_track),
      waypoints: d.gpx_waypoints ? JSON.parse(d.gpx_waypoints) : [],
      pad: cardOnRight
        ? {
            paddingTopLeft: [mapLeft + 40, 40] as [number, number],
            paddingBottomRight: [cardW + gap * 2, 40] as [number, number],
          }
        : {
            paddingTopLeft: [mapLeft + cardW + gap * 2, 40] as [number, number],
            paddingBottomRight: [40, 40] as [number, number],
          },
    };
  } catch (e) {
    console.warn("[routeTrack] failed to parse gpx data for route", d.id, e);
    return null;
  }
});

// Anchor for nearby-station filtering: route GPS + sampled GPX track points
const nearbyAnchor = computed((): { lat: number; lon: number; pts?: [number, number][] } | null => {
  if (detailItem.value?.kind !== "route") return null;
  const d = detailItem.value.data;
  const gps = d.gps?.trim();
  if (!gps) return null;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return null;
  let pts: [number, number][] | undefined;
  if (d.gpx_track) {
    try {
      const parsed = JSON.parse(d.gpx_track);
      const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
      const allPts: number[][] = isSegmented ? (parsed as number[][][]).flat() : parsed;
      // Sample every 20 pts (~100-200 points). nearestDistKm always checks anchor.lat/lon first,
      // but we also include the first/last GPX point so endpoints are never skipped.
      const sampled = allPts.filter((_: number[], i: number) => i % 20 === 0);
      if (allPts.length > 0 && !sampled.includes(allPts[allPts.length - 1]))
        sampled.push(allPts[allPts.length - 1]);
      pts = sampled.map((p: number[]) => [p[0], p[1]] as [number, number]);
    } catch {}
  }
  return { lat: parts[0], lon: parts[1], pts };
});

const canyonRouteMarkers = computed(() => {
  return filteredRoutes.value.flatMap((r) => {
    const gps = r["gps"]?.trim();
    if (!gps) return [];
    const parts = gps.split(/[,\s]+/).map(Number);
    if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return [];
    return [{ id: r["id"], lat: parts[0], lon: parts[1], name: r["name"] }];
  });
});

function onSelectRoute(id: string) {
  const route = canyonRoutes.value.find((r) => r.id === id);
  if (route) detailItem.value = { kind: "route", data: route };
}

const REGION_KEYWORDS: Record<string, string[]> = {
  北部: [
    "台北",
    "臺北",
    "新北",
    "基隆",
    "桃園",
    "新竹",
    "宜蘭",
    "Taipei",
    "New Taipei",
    "Keelung",
    "Taoyuan",
    "Hsinchu",
    "Yilan",
  ],
  中部: [
    "苗栗",
    "台中",
    "臺中",
    "彰化",
    "南投",
    "雲林",
    "Miaoli",
    "Taichung",
    "Changhua",
    "Nantou",
    "Yunlin",
  ],
  南部: [
    "嘉義",
    "台南",
    "臺南",
    "高雄",
    "屏東",
    "澎湖",
    "Chiayi",
    "Tainan",
    "Kaohsiung",
    "Pingtung",
    "Penghu",
  ],
  東部: ["花蓮", "台東", "臺東", "Hualien", "Taitung"],
};

function toggleRegion(region: string) {
  const i = selectedRegion.value.indexOf(region);
  if (i === -1) selectedRegion.value.push(region);
  else selectedRegion.value.splice(i, 1);
}

function matchRegion(text: string, regions: string[]): boolean {
  if (regions.length === 0) return true;
  return regions.some((r) =>
    (REGION_KEYWORDS[r] ?? []).some((k) => text.includes(k)),
  );
}

const selectedRouteId = computed(() =>
  detailItem.value?.kind === "route" ? detailItem.value.data.id : null,
);

watch(detailItem, (item) => {
  if (!item) selectedId.value = null;
});

// Sync route/search/filter state to URL so results are shareable
watch(
  [detailItem, searchQuery, routeFilter, selectedRegion, filterGpx],
  ([item]) => {
    const url = new URL(location.href);
    if (item?.kind === "route") url.searchParams.set("route", item.data.id);
    else url.searchParams.delete("route");
    if (searchQuery.value.trim())
      url.searchParams.set("q", searchQuery.value.trim());
    else url.searchParams.delete("q");
    for (const k of ["v", "a", "t", "drop"] as const) {
      if (routeFilter.value[k]) url.searchParams.set(k, routeFilter.value[k]);
      else url.searchParams.delete(k);
    }
    if (filterGpx.value) url.searchParams.set("gpx", "1");
    else url.searchParams.delete("gpx");
    url.searchParams.delete("region");
    for (const r of selectedRegion.value) url.searchParams.append("region", r);
    history.replaceState(null, "", url);
  },
  { deep: true },
);

// Auto-fetch elevation for routes that have a GPS coord but no usable elevation data.
watch(detailItem, async (item) => {
  if (item?.kind !== "route") return;
  const route = item.data;
  if (route.elevation > 0) return; // already stored in PocketBase (0 = default unset)

  // Check whether GPX track already carries elevation (third coord)
  if (route.gpx_track) {
    try {
      const parsed = JSON.parse(route.gpx_track);
      const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
      const allPts: number[][] = isSegmented
        ? (parsed as number[][][]).flat()
        : parsed;
      const eles = allPts
        .map((p) => p[2])
        .filter((e) => e != null && !isNaN(e));
      if (eles.length >= 2) return; // track has elevation → computed locally
    } catch {}
  }

  // Check whether waypoints carry elevation
  if (route.gpx_waypoints) {
    try {
      const wps = JSON.parse(route.gpx_waypoints);
      const eles = (wps as any[])
        .map((p) => p.ele)
        .filter((e) => typeof e === "number");
      if (eles.length > 0) return; // waypoints have elevation
    } catch {}
  }

  const gps = route.gps?.trim();
  if (!gps) return;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return;
  const [lat, lon] = parts;
  const ele = await fetchElevation(lat, lon);
  if (ele == null) return;
  try {
    await pb.collection("canyon_routes").update(route.id, { elevation: ele });
  } catch {
    /* silent — still apply locally */
  }
  // Patch in-memory record so it survives card close/reopen within the session
  const idx = canyonRoutes.value.findIndex((r) => r.id === route.id);
  if (idx !== -1) canyonRoutes.value[idx]["elevation"] = ele;
  // Patch the open card so RouteDetail renders it immediately
  if (
    detailItem.value?.kind === "route" &&
    detailItem.value.data.id === route.id
  ) {
    detailItem.value.data.elevation = ele;
  }
});

async function fetchRoutes(showOverlay: boolean) {
  if (showOverlay) {
    loading.value = true;
    loadError.value = false;
  }
  routesLoading.value = true;
  try {
    const isEn = locale.value === "en";
    const nameF = isEn ? "name_en" : "name";
    const regionF = isEn ? "region_en" : "region";
    const fields = `id,${nameF},${regionF},grading,max_drop,approach,total_time,gps,gpx_track,gpx_waypoints,elevation,deep_pool,ab_shuttle,note`;
    const records = await pb.collection("canyon_routes").getFullList({
      sort: nameF,
      filter: "type = '溪降'",
      fields,
    });
    // Normalise: always expose .name / .region regardless of source field
    canyonRoutes.value = isEn
      ? records.map((r) => ({
          ...r,
          name: (r as any).name_en ?? "",
          region: (r as any).region_en ?? "",
        }))
      : records;
    routesLoaded.value = true;
  } catch {
    if (showOverlay) loadError.value = true;
  } finally {
    routesLoading.value = false;
    if (showOverlay) loading.value = false;
  }
}

// Re-fetch with new locale when language is switched; update open card data
watch(locale, async () => {
  await fetchRoutes(false);
  if (detailItem.value?.kind === "route") {
    const id = detailItem.value.data.id;
    const route = canyonRoutes.value.find((r) => r.id === id);
    if (route) detailItem.value = { kind: "route", data: route };
  }
});

onMounted(async () => {
  // Restore filter state from URL before loading
  const sp = new URLSearchParams(location.search);
  if (sp.get("q")) searchQuery.value = sp.get("q")!;
  for (const k of ["v", "a", "t", "drop"] as const)
    if (sp.get(k)) routeFilter.value[k] = sp.get(k)!;
  if (sp.get("gpx") === "1") filterGpx.value = true;
  const regions = sp.getAll("region");
  if (regions.length) selectedRegion.value = regions;

  await fetchRoutes(true);

  // Restore selected route from URL
  const routeId = sp.get("route");
  if (routeId) {
    const route = canyonRoutes.value.find((r) => r.id === routeId);
    if (route) detailItem.value = { kind: "route", data: route };
  }
});

function parseMeters(val: string): number {
  const m = (val ?? "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

const filteredRoutes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const { v, a, t, drop } = routeFilter.value;
  return canyonRoutes.value
    .filter((r) => {
      const hasGps = r["gps"]?.trim();
      if (!hasGps) return false;
      if (!matchRegion(r["region"] ?? "", selectedRegion.value)) return false;
      const matchSearch =
        !q ||
        r["name"]?.toLowerCase().includes(q) ||
        r["region"]?.toLowerCase().includes(q);
      const grading = (r["grading"] ?? "").split(/\s+/);
      const matchV = !v || grading.some((p: string) => p === v);
      const matchA = !a || grading.some((p: string) => p === a);
      const matchT = !t || grading.some((p: string) => p === t);
      const d = parseMeters(r["max_drop"]);
      const matchDrop =
        !drop ||
        (drop === "≤20" && d <= 20) ||
        (drop === "21-40" && d > 20 && d <= 40) ||
        (drop === "41-60" && d > 40 && d <= 60) ||
        (drop === ">60" && d > 60);
      const matchGpx = !filterGpx.value || !!r["gpx_track"];
      return matchSearch && matchV && matchA && matchT && matchDrop && matchGpx;
    })
    .sort((a, b) => {
      const ag = a["grading"] ?? "";
      const bg = b["grading"] ?? "";
      const vA = parseInt(ag.match(/V(\d+)/)?.[1] ?? "999");
      const vB = parseInt(bg.match(/V(\d+)/)?.[1] ?? "999");
      if (vA !== vB) return vA - vB;
      const aA = parseInt(ag.match(/A(\d+)/)?.[1] ?? "999");
      const aB = parseInt(bg.match(/A(\d+)/)?.[1] ?? "999");
      if (aA !== aB) return aA - aB;
      const T_ORDER: Record<string, number> = {
        I: 1,
        II: 2,
        III: 3,
        IV: 4,
        V: 5,
        VI: 6,
      };
      const findT = (g: string) =>
        T_ORDER[
          g.split(/\s+/).find((p) => /^(I{1,3}|IV|VI?)$/.test(p)) ?? ""
        ] ?? 999;
      return findT(ag) - findT(bg);
    });
});

watch(searchQuery, () => {
  selectedId.value = null;
});

function clearAllFilters() {
  searchQuery.value = "";
  routeFilter.value = { v: "", a: "", t: "", drop: "" };
  filterGpx.value = false;
  selectedRegion.value = [];
  selectedId.value = null;
}

// Active filter chips — each entry can clear itself
type FilterKey = "v" | "a" | "t" | "drop";
const FILTER_KEYS: [FilterKey, string][] = [
  ["v", ""],
  ["a", ""],
  ["t", ""],
  ["drop", "m"],
];

const activeFilters = computed(() => {
  const items: { label: string; clear: () => void }[] = [];
  if (searchQuery.value.trim())
    items.push({
      label: `"${searchQuery.value.trim()}"`,
      clear: () => {
        searchQuery.value = "";
        selectedId.value = null;
      },
    });
  for (const [k, suffix] of FILTER_KEYS)
    if (routeFilter.value[k])
      items.push({
        label: routeFilter.value[k] + suffix,
        clear: () => (routeFilter.value = { ...routeFilter.value, [k]: "" }),
      });
  if (filterGpx.value)
    items.push({ label: locale.value === "en" ? "Has GPX" : "有 GPX", clear: () => (filterGpx.value = false) });
  for (const r of selectedRegion.value)
    items.push({ label: localeRegion(r), clear: () => toggleRegion(r) });
  return items;
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
}

.sidebar-wrap {
  /* ponytail: overlay instead of push — compositor-only transform, no layout reflow on open/close */
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1200; /* above Leaflet and bottom toolbar while open */
  height: 100%;
  width: 280px;
  min-width: 280px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  overflow: visible;
}

.sidebar-wrap.closed {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
}

.sidebar-wrap.resizing {
  transition: none;
  user-select: none;
}

@media (max-width: 640px) {
  .sidebar-wrap {
    width: 100% !important;
    min-width: 100% !important;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  background: transparent;
}

.resize-handle:hover,
.sidebar-wrap.resizing .resize-handle {
  background: #6c8ef5;
  opacity: 0.5;
}

.map-container {
  flex: 1;
  position: relative;
}

.sidebar-open-btn {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  background: #1a1a2e;
  color: #6c8ef5;
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 16px 8px;
  cursor: pointer;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
  transition: background 0.15s;
}

.sidebar-open-btn:hover {
  background: #252545;
}
.sidebar-open-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.loading-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 1rem;
  color: #888;
  background: #0f172a;
}

.loading-overlay.error {
  color: #e05c5c;
}

/* ── Active filter chips ────────────────────────────────────────────── */
.filter-chips {
  position: fixed;
  bottom: 92px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 1049;
  max-width: calc(100vw - 32px);
  overflow-x: auto;
  padding: 2px 4px;
  /* hide scrollbar */
  scrollbar-width: none;
}
.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: #1a1a2e;
  border: 1px solid #6c8ef5;
  border-radius: 20px;
  color: #6c8ef5;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: all 0.15s;
}
.filter-chip:hover {
  background: #6c8ef5;
  color: #fff;
}

.filter-chip--clear {
  border-color: #e05c5c;
  color: #e05c5c;
}
.filter-chip--clear:hover {
  background: #e05c5c;
  color: #fff;
}

/* slide-up transition */
.chips-enter-active,
.chips-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.chips-enter-from,
.chips-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* ── Bottom toolbar ─────────────────────────────────────────────────── */
.bottom-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(18, 18, 42, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(42, 42, 74, 0.8);
  border-radius: 50px;
  padding: 8px 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
  z-index: 1050;
}

.panel-dismiss {
  position: fixed;
  inset: 0;
  z-index: 1100;
}

.bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: #888;
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 40px;
  transition: all 0.15s;
  letter-spacing: 0.3px;
}
.bar-btn:hover {
  color: #d0d0e8;
  background: rgba(255, 255, 255, 0.08);
}
.bar-btn.active {
  color: #6c8ef5;
  background: rgba(108, 142, 245, 0.15);
}
.bar-btn-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.filter-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #6c8ef5;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 2px solid rgba(18, 18, 42, 0.92);
}
</style>
