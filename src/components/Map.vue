<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <select
      class="map-mode-select"
      :value="selectedTile"
      @change="onTileChange"
    >
      <option v-for="t in tileOptions" :key="t.key" :value="t.key">
        {{ locale === "en" ? t.labelEn : t.label }}
      </option>
    </select>
    <button
      class="layers-fab"
      @click="showLayersPanel = !showLayersPanel"
      :class="{ active: showLayersPanel }"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </button>
    <div
      v-if="showLayersPanel"
      class="panel-overlay"
      @click="showLayersPanel = false"
    ></div>
    <div v-if="showLayersPanel" class="layers-panel">
      <div class="layers-header">
        <span class="layers-title">{{
          locale === "en" ? "Layers" : "圖層"
        }}</span>
        <button class="layers-close" @click="showLayersPanel = false">✕</button>
      </div>
      <div class="layers-list">
        <div class="layer-row">
          <img class="layer-icon" src="/water-level.svg" alt="" />
          <span class="layer-label">{{
            locale === "en" ? "River Level" : "水位站"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showWaterStations" />
            <span class="toggle-track" :class="{ on: showWaterStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        <div class="layer-row">
          <svg class="layer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 14.5a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.7A4.5 4.5 0 0 0 7 14.5h10z" />
            <path d="M8 18v1.5M12 18v1.5M16 18v1.5" />
          </svg>
          <span class="layer-label">{{
            locale === "en" ? "Rain Gauge" : "雨量站"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showRainfallStations" />
            <span class="toggle-track" :class="{ on: showRainfallStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        <div class="layer-divider"></div>
        <div class="layer-row">
          <svg class="layer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span class="layer-label">{{
            locale === "en" ? "Locations" : "地點"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showLocationMarkers" />
            <span class="toggle-track" :class="{ on: showLocationMarkers }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selectedWp" class="wp-card" @click.stop>
        <div class="wp-card-top">
          <div class="wp-badge">
            {{
              selectedWp.seq != null
                ? String(selectedWp.seq).padStart(2, "0")
                : "·"
            }}
          </div>
          <button class="wp-close" @click="selectedWpIndex = null">✕</button>
        </div>
        <div class="wp-name">
          <span v-if="selectedWp.time" class="wp-time"
            >{{ fmtTime(selectedWp.time) }} | </span
          >{{ selectedWp.name }}
        </div>
        <div class="wp-meta">
          <span v-if="selectedWp.ele != null">H {{ selectedWp.ele }} m</span>
          <span v-if="selectedWp.ele != null" class="wp-sep">|</span>
          <span class="wp-coords"
            >({{ selectedWp.lat.toFixed(5) }},
            {{ selectedWp.lon.toFixed(5) }})</span
          >
        </div>
        <div class="wp-footer">
          <button class="wp-copy-btn" @click="copyCoords">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              />
            </svg>
            {{ locale === "en" ? "Copy Coords" : "複製座標" }}
          </button>
          <div class="wp-nav">
            <button
              class="wp-nav-btn"
              :disabled="selectedWpIndex === 0"
              @click="goPrev"
            >
              &lt;
            </button>
            <button
              class="wp-nav-btn"
              :disabled="selectedWpIndex === currentWaypoints.length - 1"
              @click="goNext"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import { locale } from "../lib/locale";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Canyon } from "../data/canyon";
import waterStations from "../data/water-stations.json";
import type { WaterStation } from "../lib/waterLevel";
import { rainfallStations, type RainfallStation } from "../lib/rainfall";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface WaypointData {
  lat: number;
  lon: number;
  name: string;
  seq?: number;
  time?: string;
  ele?: number;
}
interface RouteTrack {
  track: [number, number][] | [number, number][][];
  waypoints: WaypointData[];
  pad?: {
    paddingTopLeft: [number, number];
    paddingBottomRight: [number, number];
  };
}

interface RouteMarker {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

interface NearbyAnchor {
  lat: number
  lon: number
  pts?: [number, number][]
}

const props = withDefaults(
  defineProps<{
    canyons?: Canyon[];
    selectedId: string | null;
    focusPoint: [number, number] | null;
    routeTrack: RouteTrack | null;
    canyonRouteMarkers: RouteMarker[];
    selectedRouteId: string | null;
    nearbyAnchor: NearbyAnchor | null;
    stationSearch: { water: WaterStation[]; rainfall: RainfallStation[] } | null;
    searchPoints: [number, number][] | null;
    searchPanelOpen: boolean;
  }>(),
  { canyons: () => [], nearbyAnchor: null },
);

const emit = defineEmits<{
  selectRoute: [id: string];
  selectWaterStation: [station: WaterStation, pos: { x: number; y: number }, distance: number | undefined];
  selectRainfallStation: [
    station: RainfallStation,
    pos: { x: number; y: number },
    distance: number | undefined,
  ];
}>();

let map: L.Map | null = null;
let markers: L.Marker[] = [];
let focusMarker: L.Marker | null = null;
let trackLayer: L.Polyline | null = null;
let waypointMarkers: L.Marker[] = [];
let routeMarkerLayers: L.Marker[] = [];
let waterStationLayer: L.LayerGroup | null = null;
let rainfallStationLayer: L.LayerGroup | null = null;
let canyonCluster: L.MarkerClusterGroup | null = null;
let routeCluster: L.MarkerClusterGroup | null = null;

const tileOptions = [
  {
    key: "carto",
    label: "清晰模式",
    labelEn: "Clear",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
  },
  {
    key: "osm",
    label: "標準模式",
    labelEn: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  {
    key: "topo",
    label: "地形模式",
    labelEn: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
  },
  {
    key: "satellite",
    label: "衛星模式",
    labelEn: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
  },
];

let currentTile: L.TileLayer | null = null;
const selectedTile = ref("topo");
const showWaterStations = ref(false);
const showRainfallStations = ref(false);
const waterVisible = computed(() => props.stationSearch !== null ? props.stationSearch.water.length > 0 : showWaterStations.value);
const rainfallVisible = computed(() => props.stationSearch !== null ? props.stationSearch.rainfall.length > 0 : showRainfallStations.value);
const showLayersPanel = ref(false);
const showLocationMarkers = ref(true);

const selectedWpIndex = ref<number | null>(null);
const currentWaypoints = ref<WaypointData[]>([]);
const selectedWp = computed(() =>
  selectedWpIndex.value !== null
    ? (currentWaypoints.value[selectedWpIndex.value] ?? null)
    : null,
);

function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
}
function copyCoords() {
  if (!selectedWp.value) return;
  navigator.clipboard.writeText(
    `${selectedWp.value.lat.toFixed(5)}, ${selectedWp.value.lon.toFixed(5)}`,
  );
}
function wpIcon(label: string, focused: boolean) {
  return L.divIcon({
    className: "",
    html: focused
      ? `<div style="width:26px;height:26px;border-radius:50%;background:#e63946;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 0 3px #e63946,0 2px 6px rgba(0,0,0,.5)">${label}</div>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:#111;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5)">${label}</div>`,
    iconSize: focused ? [26, 26] : [22, 22],
    iconAnchor: focused ? [13, 13] : [11, 11],
  });
}

function labelIcon(name: string, selected = false) {
  const escapedName = name.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]!,
  );
  return L.divIcon({
    className: "",
    html: `<div class="route-label${selected ? " route-label--selected" : ""}">${escapedName}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

watch(selectedWpIndex, (next, prev) => {
  if (prev !== null && waypointMarkers[prev]) {
    const wp = currentWaypoints.value[prev];
    const label =
      wp?.seq != null
        ? String(wp.seq).padStart(2, "0")
        : (wp?.name.match(/^\d+/)?.[0] ?? "·");
    waypointMarkers[prev].setIcon(wpIcon(label, false));
  }
  if (next !== null && waypointMarkers[next]) {
    const wp = currentWaypoints.value[next];
    const label =
      wp?.seq != null
        ? String(wp.seq).padStart(2, "0")
        : (wp?.name.match(/^\d+/)?.[0] ?? "·");
    waypointMarkers[next].setIcon(wpIcon(label, true));
  }
});

function panToWp(index: number) {
  const wp = currentWaypoints.value[index];
  if (wp && map) map.panTo([wp.lat, wp.lon]);
}
function goPrev() {
  if (selectedWpIndex.value !== null && selectedWpIndex.value > 0) {
    selectedWpIndex.value--;
    panToWp(selectedWpIndex.value);
  }
}
function goNext() {
  if (
    selectedWpIndex.value !== null &&
    selectedWpIndex.value < currentWaypoints.value.length - 1
  ) {
    selectedWpIndex.value++;
    panToWp(selectedWpIndex.value);
  }
}

const waterStationIcon = L.divIcon({
  className: "",
  html: '<div class="water-station-marker"><img src="/water-level.svg" alt=""></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const rainfallStationIcon = L.divIcon({
  className: "",
  html: '<div style="width:28px;height:28px;background:rgba(255,255,255,0.92);border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">🌂</div>',
  iconSize: [28, 26],
  iconAnchor: [14, 26],
});

function nearestDistKm(lat: number, lon: number, anchor: NearbyAnchor): number {
  // Always check the anchor GPS point itself (entry/exit point), then sampled GPX pts.
  // ponytail: linear scan over sampled track pts (≤200), fast enough
  const pts: [number, number][] = [[anchor.lat, anchor.lon], ...(anchor.pts ?? [])];
  const target = L.latLng(lat, lon);
  return pts.reduce((min, [pLat, pLon]) => Math.min(min, L.latLng(pLat, pLon).distanceTo(target) / 1000), Infinity);
}

function filterByAnchor<T extends { lat: number; lon: number }>(
  items: T[],
  anchor: NearbyAnchor | null,
): { item: T; dist: number | undefined }[] {
  if (!anchor) return items.map(item => ({ item, dist: undefined }));
  const withDist = items.map(item => ({ item, dist: nearestDistKm(item.lat, item.lon, anchor) }));
  const in10 = withDist.filter(x => x.dist <= 10);
  return (in10.length ? in10 : withDist.filter(x => x.dist <= 20));
}

function renderWaterStations() {
  if (!map) return;
  waterStationLayer?.remove();
  waterStationLayer = props.nearbyAnchor && !props.stationSearch
    ? L.layerGroup()
    : L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            className: "",
            html: `<div class="water-cluster">${count}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
        },
      });
  filterByAnchor(props.stationSearch?.water ?? waterStations as WaterStation[], props.stationSearch ? null : props.nearbyAnchor).forEach(({ item: s, dist }) => {
    const label = dist != null ? `${s.name}（${s.river}） · ${dist.toFixed(1)} km` : `${s.name}（${s.river}）`;
    L.marker([s.lat, s.lon], { icon: waterStationIcon })
      .bindTooltip(
        Object.assign(document.createElement("span"), { textContent: label }),
        { direction: "top", offset: [0, -6] },
      )
      .on("click", (e: L.LeafletMouseEvent) => {
        const rect = document.getElementById("map")!.getBoundingClientRect();
        const pt = map!.latLngToContainerPoint(e.latlng);
        emit("selectWaterStation", s, { x: rect.left + pt.x, y: rect.top + pt.y }, dist);
      })
      .addTo(waterStationLayer!);
  });
}

watch(waterVisible, (show) => {
  if (!map) return;
  if (show) {
    if (!waterStationLayer) renderWaterStations(); // lazy build; anchor re-renders are driven by nearbyAnchor watcher
    waterStationLayer?.addTo(map);
  } else {
    waterStationLayer?.remove();
  }
});

function renderRainfallStations() {
  if (!map) return;
  rainfallStationLayer?.remove();
  rainfallStationLayer = props.nearbyAnchor && !props.stationSearch
    ? L.layerGroup()
    : L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            className: "",
            html: `<div class="rainfall-cluster">${count}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
        },
      });
  filterByAnchor(props.stationSearch?.rainfall ?? rainfallStations, props.stationSearch ? null : props.nearbyAnchor).forEach(({ item: s, dist }) => {
    const label = dist != null ? `${s.name}（${s.county}${s.town}） · ${dist.toFixed(1)} km` : `${s.name}（${s.county}${s.town}）`;
    L.marker([s.lat, s.lon], { icon: rainfallStationIcon })
      .bindTooltip(label, { direction: "top", offset: [0, -6] })
      .on("click", (e: L.LeafletMouseEvent) => {
        const rect = document.getElementById("map")!.getBoundingClientRect();
        const pt = map!.latLngToContainerPoint(e.latlng);
        emit("selectRainfallStation", s, { x: rect.left + pt.x, y: rect.top + pt.y }, dist);
      })
      .addTo(rainfallStationLayer!);
  });
}

watch(rainfallVisible, (show) => {
  if (!map) return;
  if (show) {
    if (!rainfallStationLayer) renderRainfallStations();
    rainfallStationLayer?.addTo(map);
  } else {
    rainfallStationLayer?.remove();
  }
});

// Track whether we auto-enabled each layer so we can restore state on route close.
let autoEnabledWater = false;
let autoEnabledRain = false;

// When a route is selected: auto-enable both station layers with distance filter.
// When deselected: turn off only the layers we auto-enabled, then rebuild unfiltered.
// Extracted so onMounted can call it for URL-restored routes (watcher fires too early).
function syncNearbyAnchor(anchor: NearbyAnchor | null) {
  if (!map) return;
  if (anchor) {
    // Only auto-enable if the filter actually yields stations within range
    const hasWater = filterByAnchor(waterStations as WaterStation[], anchor).length > 0;
    const hasRain = filterByAnchor(rainfallStations, anchor).length > 0;
    if (hasWater && !showWaterStations.value) { showWaterStations.value = true; autoEnabledWater = true; }
    if (hasRain && !showRainfallStations.value) { showRainfallStations.value = true; autoEnabledRain = true; }
  } else {
    // Route closed — restore the state that was in place before we intervened
    if (autoEnabledWater) { showWaterStations.value = false; autoEnabledWater = false; }
    if (autoEnabledRain) { showRainfallStations.value = false; autoEnabledRain = false; }
  }
  // Rebuild both layers to apply/remove the distance filter.
  // renderWaterStations/renderRainfallStations each call .remove() internally before rebuilding.
  if (waterVisible.value) {
    renderWaterStations();
    waterStationLayer?.addTo(map);
  } else {
    waterStationLayer?.remove();
    waterStationLayer = null;
  }
  if (rainfallVisible.value) {
    renderRainfallStations();
    rainfallStationLayer?.addTo(map);
  } else {
    rainfallStationLayer?.remove();
    rainfallStationLayer = null;
  }
}
watch(() => props.nearbyAnchor, syncNearbyAnchor);
watch(() => props.stationSearch, () => {
  syncNearbyAnchor(props.nearbyAnchor);
});

function focusSearchResults() {
  if (!map || !props.searchPoints?.length) return;
  const rightPadding = props.searchPanelOpen && map.getSize().x > 640 ? 328 : 48;
  map.stop();
  map.fitBounds(L.latLngBounds(props.searchPoints), {
    paddingTopLeft: [48, 48], paddingBottomRight: [rightPadding, 110], maxZoom: 14, animate: false,
  });
}
watch(() => props.searchPoints, focusSearchResults, { flush: 'post' });
defineExpose({ focusSearchResults });

function onTileChange(e: Event) {
  if (!map) return;
  const key = (e.target as HTMLSelectElement).value;
  selectedTile.value = key;
  const opt = tileOptions.find((t) => t.key === key)!;
  currentTile?.remove();
  currentTile = L.tileLayer(opt.url, {
    attribution: opt.attribution,
    maxZoom: 19,
  });
  currentTile.addTo(map);
}

function renderMarkers() {
  if (!map) return;
  markers.forEach((m) => m.remove());
  canyonCluster?.clearLayers();
  if (!canyonCluster) {
    canyonCluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "",
          html: `<div class="canyon-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });
  }
  markers = props.canyons.map((canyon) =>
    L.marker(canyon.coordinates, {
      icon: labelIcon(canyon.name, canyon.id === props.selectedId),
    }).bindPopup(`
        <div>
          <h3><strong>${canyon.name}</strong></h3>
          <p>地點：${canyon.location}</p>
          <p>難度：${"★".repeat(canyon.difficulty)}${"☆".repeat(5 - canyon.difficulty)}</p>
          <p>適合季節：${canyon.season.join("、")}</p>
          <p>${canyon.description}</p>
        </div>
      `),
  );
  if (showLocationMarkers.value) {
    markers.forEach((m) => canyonCluster!.addLayer(m));
    if (!map.hasLayer(canyonCluster!)) canyonCluster!.addTo(map);
  } else {
    canyonCluster.remove();
    const selIdx = props.canyons.findIndex((c) => c.id === props.selectedId);
    if (selIdx !== -1) markers[selIdx].addTo(map);
  }
}

const TAIWAN_BOUNDS = L.latLngBounds(
  L.latLng(21.8, 119.9),
  L.latLng(25.4, 122.1),
);

onMounted(() => {
  map = L.map("map", {
    maxBounds: TAIWAN_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 8,
    zoomControl: false,
  }).setView([23.9871, 121.6015], 9);

  const defaultTile = tileOptions.find((t) => t.key === "topo")!;
  currentTile = L.tileLayer(defaultTile.url, {
    attribution: defaultTile.attribution,
    maxZoom: 19,
  });
  currentTile.addTo(map);

  map.on("click", () => {
    selectedWpIndex.value = null;
  });

  renderMarkers();
  renderRouteMarkers(props.canyonRouteMarkers, props.selectedRouteId);
  // Handle routes restored from URL (?route=...) — watcher fires before map exists
  syncNearbyAnchor(props.nearbyAnchor);
  focusSearchResults();
});

watch(() => props.canyons, renderMarkers);

watch(showLocationMarkers, (show) => {
  if (!map) return;
  if (show) {
    markers.forEach((m) => m.remove());
    canyonCluster?.clearLayers();
    markers.forEach((m) => canyonCluster!.addLayer(m));
    if (!map.hasLayer(canyonCluster!)) canyonCluster?.addTo(map);
  } else {
    canyonCluster?.remove();
    const selIdx = props.canyons.findIndex((c) => c.id === props.selectedId);
    markers.forEach((m, i) => (i === selIdx ? m.addTo(map!) : m.remove()));
  }
  renderRouteMarkers(props.canyonRouteMarkers, props.selectedRouteId);
});

watch(
  () => props.selectedId,
  (id, prevId) => {
    if (!map) return;
    // Update icon highlight
    if (prevId) {
      const pi = props.canyons.findIndex((c) => c.id === prevId);
      if (pi !== -1)
        markers[pi]?.setIcon(labelIcon(props.canyons[pi].name, false));
    }
    if (id) {
      const ni = props.canyons.findIndex((c) => c.id === id);
      if (ni !== -1)
        markers[ni]?.setIcon(labelIcon(props.canyons[ni].name, true));
    }
    // When not showing all, swap visible individual markers
    if (!showLocationMarkers.value) {
      if (prevId) {
        const pi = props.canyons.findIndex((c) => c.id === prevId);
        if (pi !== -1) markers[pi]?.remove();
      }
      if (id) {
        const ni = props.canyons.findIndex((c) => c.id === id);
        if (ni !== -1) markers[ni]?.addTo(map!);
      }
    }
    if (!id) {
      map.closePopup();
      return;
    }
    const idx = props.canyons.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const canyon = props.canyons[idx];
    map.flyTo(canyon.coordinates, 13, { duration: 1 });
    map.once("moveend", () => markers[idx]?.openPopup());
  },
);

watch(
  () => props.focusPoint,
  (coords) => {
    focusMarker?.remove();
    focusMarker = null;
    if (!coords || !map) return;
    map.flyTo(coords, 14, { duration: 1.2 });
  },
);

watch(
  () => props.routeTrack,
  (data) => {
    trackLayer?.remove();
    trackLayer = null;
    waypointMarkers.forEach((m) => m.remove());
    waypointMarkers = [];
    selectedWpIndex.value = null;
    currentWaypoints.value = [];
    if (!data || !map) return;
    currentWaypoints.value = data.waypoints;

    // Support both flat [lat,lon][] and segmented [lat,lon][][] formats
    const isPoint = (value: unknown): value is [number, number] =>
      Array.isArray(value) &&
      typeof value[0] === "number" &&
      typeof value[1] === "number";
    const rawTrack = data.track;
    const segments = Array.isArray(rawTrack)
      ? rawTrack.some(isPoint)
        ? [rawTrack as [number, number][]]
        : (rawTrack as [number, number][][])
      : [];
    if (segments.some((segment) => segment.some(isPoint))) {
      trackLayer = L.polyline(segments, {
        color: "#e63946",
        weight: 3,
        opacity: 0.85,
      }).addTo(map);
      map.flyToBounds(trackLayer.getBounds(), {
        ...(data.pad ?? { padding: [40, 40] }),
        maxZoom: 15,
        duration: 1.2,
      });
    }

    waypointMarkers = data.waypoints.map((wp, i) => {
      const label =
        wp.seq != null
          ? String(wp.seq).padStart(2, "0")
          : (wp.name.match(/^\d+/)?.[0] ?? "·");
      return L.marker([wp.lat, wp.lon], { icon: wpIcon(label, false) })
        .addTo(map!)
        .bindTooltip(wp.name, {
          permanent: false,
          direction: "top",
          offset: [0, -12],
        })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selectedWpIndex.value = i;
        });
    });
  },
);

function renderRouteMarkers(routeMarkers: RouteMarker[], selId: string | null) {
  routeMarkerLayers.forEach((m) => m.remove());
  routeCluster?.clearLayers();
  routeMarkerLayers = [];
  if (!map || !routeMarkers.length) {
    routeCluster?.remove();
    return;
  }
  if (!routeCluster) {
    routeCluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "",
          html: `<div class="route-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });
  }
  routeMarkerLayers = routeMarkers.map((r) => {
    const m = L.marker([r.lat, r.lon], {
      icon: labelIcon(r.name, r.id === selId),
    }).on("click", () => emit("selectRoute", r.id));
    if (r.id === selId) (m as any).setZIndexOffset(1000);
    return m;
  });
  if (showLocationMarkers.value) {
    routeMarkerLayers.forEach((m) => routeCluster!.addLayer(m));
    if (!map.hasLayer(routeCluster!)) routeCluster!.addTo(map);
  } else {
    routeCluster.remove();
    routeMarkerLayers.forEach((m, i) => {
      if (routeMarkers[i].id === selId) m.addTo(map!);
    });
  }
}

watch(
  () => [props.canyonRouteMarkers, props.selectedRouteId] as const,
  ([routeMarkers, selId]) => {
    renderRouteMarkers(routeMarkers, selId);
  },
  { deep: true },
);
</script>

<style scoped>
.map-wrapper {
  position: relative;
  flex: 1;
}

:global(#map) {
  width: 100%;
  height: 100dvh;
}

.map-mode-select {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  padding: 7px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #333;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  outline: none;
}
.map-mode-select:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.layers-fab {
  position: absolute;
  top: 56px;
  right: 12px;
  z-index: 1000;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #444;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition:
    background 0.15s,
    color 0.15s;
}
.layers-fab:hover {
  background: #f0f0f0;
}
.layers-fab.active {
  background: #1a1a2e;
  color: #fff;
}
.layers-fab:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.layers-panel {
  position: absolute;
  top: 56px;
  right: 56px;
  z-index: 1000;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.layers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

.layers-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}

.layers-close {
  background: none;
  border: none;
  color: #666;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
}
.layers-close:hover {
  background: #2a2a4a;
  color: #fff;
}
.layers-close:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.layers-list {
  padding: 6px 0;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  transition: background 0.12s;
}
.layer-row:hover {
  background: #252545;
}

.layer-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #6c8ef5;
}

.layer-label {
  flex: 1;
  font-size: 0.875rem;
  color: #ccc;
}

.layer-divider {
  height: 1px;
  background: #2a2a4a;
  margin: 2px 0;
}

.toggle-switch {
  flex-shrink: 0;
  cursor: pointer;
}
.toggle-switch input {
  /* visually hidden but keyboard-accessible */
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.toggle-switch input:focus-visible + .toggle-track {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
  border-radius: 11px;
}

.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #3a3a5a;
  position: relative;
  transition: background 0.2s;
}
.toggle-track.on {
  background: #6c8ef5;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: left 0.2s;
}
.toggle-track.on .toggle-thumb {
  left: 21px;
}

:global(.water-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(8, 145, 178, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

:global(.water-station-marker) {
  width: 28px;
  height: 28px;
  padding: 3px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

:global(.water-station-marker img) {
  display: block;
  width: 100%;
  height: 100%;
}

:global(.rainfall-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

/* Canyon / route label chip — name shown directly on map */
:global(.route-label) {
  position: relative;
  display: inline-block;
  /* shift up so arrow tip lands on the coordinate */
  transform: translate(-50%, calc(-100% - 8px));
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a2e;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  border: 1.5px solid #6c8ef5;
  line-height: 1.5;
  cursor: pointer;
  pointer-events: auto;
}
/* Outer (border-coloured) downward arrow */
:global(.route-label::before) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-top: 7px solid #6c8ef5;
  border-bottom: 0;
}
/* Inner (white fill) downward arrow — sits on top of ::before */
:global(.route-label::after) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top: 5px solid rgba(255, 255, 255, 0.95);
  border-bottom: 0;
}

/* Selected: same white+blue, slightly stronger glow to hint at focus */
:global(.route-label--selected) {
  border-width: 2px;
  box-shadow:
    0 0 0 2px rgba(108, 142, 245, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.28);
}

:global(.canyon-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(245, 160, 48, 0.88);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

:global(.route-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(108, 142, 245, 0.88);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

.wp-card {
  position: fixed;
  bottom: max(32px, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  padding: 14px 16px 12px;
  min-width: 260px;
  max-width: 340px;
  color: #111;
  font-family: inherit;
}
.wp-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.wp-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wp-close {
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}
.wp-close:hover {
  color: #333;
}
.wp-close:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
.wp-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
  margin-bottom: 5px;
  line-height: 1.3;
}
.wp-time {
  color: #555;
  font-weight: 400;
}
.wp-meta {
  font-size: 0.75rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.wp-sep {
  color: #ccc;
}
.wp-coords {
  color: #555;
}
.wp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wp-copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f3f3f3;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}
.wp-copy-btn:hover {
  background: #e5e5e5;
}
.wp-copy-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
.wp-nav {
  display: flex;
  gap: 4px;
}
.wp-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wp-nav-btn:hover:not(:disabled) {
  background: #f3f3f3;
}
.wp-nav-btn:disabled {
  color: #ccc;
  cursor: default;
}
.wp-nav-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
</style>

<style src="leaflet/dist/leaflet.css"></style>
