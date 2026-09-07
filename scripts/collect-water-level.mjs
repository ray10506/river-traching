import PocketBase from 'pocketbase'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const collection = 'water_level_observations'
const source = 'https://opendata.wra.gov.tw/api/v2/73c4c3de-4045-4765-abeb-89f9f9cd5ff0?format=JSON'
const stations = new Set(JSON.parse(readFileSync(new URL('../src/data/water-stations.json', import.meta.url))).map(s => s.id))

export function observation(record, now = Date.now()) {
  if (!stations.has(record.stationid) || ![true, 'true'].includes(record.checkresult)) return null
  if (typeof record.waterlevel !== 'number' && typeof record.waterlevel !== 'string') return null
  if (String(record.waterlevel).trim() === '') return null
  const level = Number(record.waterlevel)
  const rawTime = record.datetime
  if (typeof rawTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rawTime)) return null
  // WRA's offset-free timestamps use Taiwan time, including on UTC runners.
  const time = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(rawTime) ? rawTime : `${rawTime}+08:00`)
  if (!Number.isFinite(level) || level <= -999 || !Number.isFinite(time) || time > now + 300_000 || time < now - 90 * 86400_000) return null
  return { station_id: record.stationid, observed_at: new Date(time).toISOString(), level_m: level }
}

async function main() {
  const { PB_URL, PB_EMAIL, PB_PASSWORD } = process.env
  if (!PB_URL || !PB_EMAIL || !PB_PASSWORD) throw new Error('PB_URL, PB_EMAIL and PB_PASSWORD are required.')
  const pb = new PocketBase(PB_URL)
  await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD)
  if (process.argv.includes('--setup')) {
    try {
      await pb.collections.getOne(collection)
    } catch (error) {
      if (error.status !== 404) throw error
      await pb.collections.create({
        name: collection, type: 'base', listRule: '', viewRule: '',
        createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: 'station_id', type: 'text', required: true },
          { name: 'observed_at', type: 'date', required: true },
          { name: 'collected_at', type: 'date', required: true },
          { name: 'level_m', type: 'number' },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_water_station_time ON water_level_observations (station_id, observed_at)', 'CREATE INDEX idx_water_time ON water_level_observations (observed_at)'],
      })
    }
  }
  const response = await fetch(source, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`WRA HTTP ${response.status}`)
  const records = await response.json()
  if (!Array.isArray(records)) throw new Error('Invalid WRA response')
  const now = Date.now()
  const rows = records.map(r => observation(r, now)).filter(Boolean)
  if (!rows.length) throw new Error('WRA returned no valid observations')
  let inserted = 0
  for (const row of rows) {
    const filter = pb.filter('station_id = {:station} && observed_at = {:time}', { station: row.station_id, time: row.observed_at.replace('T', ' ') })
    if ((await pb.collection(collection).getList(1, 1, { filter })).items.length) continue
    await pb.collection(collection).create({ ...row, collected_at: new Date(now).toISOString() })
    inserted++
  }
  const filter = pb.filter('observed_at < {:cutoff}', { cutoff: new Date(now - 90 * 86400_000).toISOString().replace('T', ' ') })
  let deleted = 0
  while (true) {
    const { items } = await pb.collection(collection).getList(1, 100, { filter, fields: 'id' })
    if (!items.length) break
    for (const item of items) { await pb.collection(collection).delete(item.id); deleted++ }
  }
  console.log(`Water levels: ${inserted} inserted, ${rows.length - inserted} unchanged, ${deleted} expired.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`Water collection failed: ${error.message}`); process.exitCode = 1 })
}
