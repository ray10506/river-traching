// Run with: node src/lib/rainfallData.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { fetchRainfallData } from './rainfallData.ts'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const detail = read('../components/RainfallStationDetail.vue')
const route = read('../components/RouteDetail.vue')
const context = {
  computed: fn => ({ get value() { return fn() } }),
  data: { value: null }, locale: { value: 'en' }, rainfall24hr: { value: null },
}
vm.runInNewContext(ts.transpile(
  detail.slice(detail.indexOf('const rainItems ='), detail.indexOf('const currentHistory =')) +
  route.slice(route.indexOf('const rainfallSummary ='), route.indexOf('const title =')) +
  '\nglobalThis.result = { rainItems, rainStatus, rainfallSummary };'
), context)

const keys = ['Past10Min', 'Past1hr', 'Past3hr', 'Past6hr', 'Past12hr', 'Past24hr', 'Past2days', 'Past3days']
const originalFetch = globalThis.fetch
let elements
globalThis.fetch = async () => ({ ok: true, json: async () => ({ records: { Station: [{ RainfallElement: elements }] } }) })
try {
  for (const raw of [-99, '-998', -0.1, null, undefined, '', 'invalid', 'Infinity', 0, '0', '12.34']) {
    elements = Object.fromEntries(keys.map(key => [key, { Precipitation: raw }]))
    const data = await fetchRainfallData('test')
    const expected = raw === '12.34' ? 12.3 : raw === 0 || raw === '0' ? 0 : null
    for (const key of keys) assert.equal(data[key.toLowerCase()], expected)
    context.data.value = data
    context.rainfall24hr.value = data.past24hr
    assert.equal(context.result.rainStatus.value.tone, expected == null ? 'muted' : 'normal')
    assert.equal(context.result.rainfallSummary.value.tone, expected == null ? 'muted' : expected > 0 ? 'watch' : 'normal')
    for (const item of context.result.rainItems.value) assert.equal(item.value, `${expected ?? '—'} mm`)
    if (expected == null) {
      assert.match(context.result.rainStatus.value.title, /unavailable/)
      assert.match(context.result.rainfallSummary.value.text, /unavailable/)
    }
  }
  for (elements of [undefined, {}, { Past24hr: {} }]) {
    const data = await fetchRainfallData('test')
    for (const key of keys) assert.equal(data[key.toLowerCase()], null)
  }
  elements = Object.fromEntries(keys.map(key => [key, { Precipitation: 0 }]))
  const dry = await fetchRainfallData('test')
  for (const key of ['past1hr', 'past3hr', 'past24hr', 'past3days']) {
    context.data.value = { ...dry, [key]: null }
    assert.equal(context.result.rainStatus.value.tone, 'muted', key)
  }
  for (const [key, value, tone] of [['past24hr', 200, 'danger'], ['past3hr', 100, 'danger'], ['past24hr', 80, 'warning'], ['past1hr', 40, 'warning'], ['past3days', 40, 'watch'], ['past24hr', 0, 'normal']]) {
    context.data.value = { ...dry, [key]: value }
    assert.equal(context.result.rainStatus.value.tone, tone)
  }
  for (const [value, tone] of [[0, 'normal'], [1, 'watch'], [80, 'warning'], [200, 'danger']]) {
    context.rainfall24hr.value = value
    assert.equal(context.result.rainfallSummary.value.tone, tone)
  }
  assert.match(detail, /data\.past24hr \?\? '—'/)
  assert.match(detail, /data\.past3days \?\? '—'/)
  console.log('Rainfall null preservation, assessment, display and route summary checks passed.')
} finally {
  globalThis.fetch = originalFetch
}
