import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const computed = fn => ({ get value() { return fn(); } });
const run = (source, context) => vm.runInNewContext(ts.transpile(source), context);
const detail = read('src/components/RouteDetail.vue');
const weather = { computed, cwaTowns: json('src/data/cwa-towns.json'), d: { value: {} }, locale: { value: 'zh' } };
run(detail.slice(detail.indexOf('const WEATHER_COUNTY_IDS'), detail.indexOf('function parseGradePart')) + '\nglobalThis.result = weatherForecastUrl;', weather);
for (const [region, tid] of [
  ['高雄 六龜', '6403200'], ['高雄 桃源', '6403700'], ['新北市 汐止', '6501100'],
  ['台中 和平', '6602900'], ['南投 仁愛', '1000813'], ['屏東 霧台', '1001327'],
  ['嘉義 阿里山', '1001018'], ['新竹 五峰', '1000413'], ['烏來', '6502900'],
  ['New Taipei - Xizhi', '6501100'], ["Nantou · Ren'ai", '1000813'],
]) {
  weather.d.value = { region };
  assert.ok(weather.result.value.endsWith(`TID=${tid}`), region);
}
weather.d.value = { region: '屏東 茂林' };
assert.ok(weather.result.value.endsWith('CID=10013'));
weather.d.value = { region: 'Unknown' };
assert.equal(weather.result.value, null);
weather.locale.value = 'en';
weather.d.value = { region: 'wrong translation', region_zh: '高雄 六龜' };
assert.ok(weather.result.value.includes('/E/W/Town/Town.html?TID=6403200'));

const app = read('src/App.vue');
const search = { computed, searchQuery: { value: '阿蓮' }, searchType: { value: 'water' }, selectedRegion: { value: [] },
  waterStations: json('src/data/water-stations.json'), rainfallStations: json('src/data/rainfall-stations.json') };
run(app.slice(app.indexOf('const REGION_KEYWORDS'), app.indexOf('function toggleRegion')) +
  app.slice(app.indexOf('function matchRegion'), app.indexOf('\n}', app.indexOf('function matchRegion')) + 2) +
  '\nglobalThis.result = stationSearch;', search);
assert.equal(search.result.value.water.length, 2);
assert.equal(search.result.value.rainfall.length, 0);
search.searchType.value = 'rainfall';
search.searchQuery.value = '六龜';
assert.equal(search.result.value.rainfall.length, 6);
assert.equal(search.result.value.water.length, 0);
search.selectedRegion.value = ['北部'];
assert.equal(search.result.value.rainfall.length, 0);
search.searchType.value = 'route';
assert.equal(search.result.value, null);
Object.assign(search, {
  canyonRoutes: { value: [{ id: 'route', name: 'Shangping Creek', name_zh: '上坪溪', name_en: 'Shangping Creek', region: 'Hsinchu · Wufeng', region_zh: '新竹 五峰', region_en: 'Hsinchu · Wufeng', gps: '24,121' }] },
  routeFilter: { value: { v: '', a: '', t: '', drop: '' } }, filterGpx: { value: false },
});
run(app.slice(app.indexOf('function parseMeters'), app.indexOf('watch(searchQuery,')) + '\nglobalThis.routes = filteredRoutes;', search);
for (const query of ['上坪溪', '新竹', 'shangping', 'Hsinchu']) {
  search.searchQuery.value = query;
  assert.equal(search.routes.value.length, 1, query);
}
search.searchType.value = 'water';
assert.equal(search.routes.value.length, 0);
console.log('Weather links, station search and bilingual route search checks passed.');

const mapSource = read('src/components/Map.vue');
const fits = [];
const focus = {
  props: { searchPoints: [[24.5, 121], [24.8, 121.2]], searchPanelOpen: true },
  map: { getSize: () => ({ x: 1000 }), stop() {}, fitBounds: (bounds, options) => fits.push({ bounds, options }) },
  L: { latLngBounds: points => points },
};
run(mapSource.slice(mapSource.indexOf('function focusSearchResults()'), mapSource.indexOf("watch(() => props.searchPoints")), focus);
focus.focusSearchResults();
assert.equal(fits[0].bounds, focus.props.searchPoints);
assert.equal(fits[0].options.paddingBottomRight[0], 328);
focus.props.searchPanelOpen = false;
focus.focusSearchResults();
assert.equal(fits[1].options.paddingBottomRight[0], 48);
focus.props.searchPoints = [];
focus.focusSearchResults();
assert.equal(fits.length, 2);
console.log('Search map focus and empty results checks passed.');
