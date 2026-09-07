import assert from 'node:assert/strict'
import { observation } from './collect-water-level.mjs'

const record = { stationid: '1010H006', checkresult: 'true', datetime: '2026-09-07T13:10:00', waterlevel: '-0.01' }
const now = Date.parse('2026-09-07T06:00:00Z')
assert.deepEqual(observation(record, now), { station_id: '1010H006', observed_at: '2026-09-07T05:10:00.000Z', level_m: -0.01 })
assert.equal(observation({ ...record, waterlevel: '0' }, now).level_m, 0)
for (const waterlevel of [null, '', ' ', 'bad', '-999999', Infinity]) assert.equal(observation({ ...record, waterlevel }, now), null)
for (const change of [{ checkresult: 'false' }, { stationid: 'unknown' }, { datetime: 'invalid' }, { datetime: '2025-01-01T00:00:00' }, { datetime: '2026-09-08T00:00:00' }]) assert.equal(observation({ ...record, ...change }, now), null)
console.log('Water observation checks passed.')
