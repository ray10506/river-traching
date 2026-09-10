// Fetch the active river water-level station list from WRA OpenData,
// convert TWD97 (EPSG:3826) coordinates to WGS84 lat/lon, and write
// src/data/water-stations.json for use on the map.
// Usage: node scripts/fetch-water-stations.mjs
import { writeFileSync } from 'fs'
import { twd97ToWgs84 } from './twd97-to-wgs84.mjs'

const API_URL = 'https://opendata.wra.gov.tw/api/v2/c4acc691-7416-40ca-9464-292c0c00da92?format=JSON&size=1000&page=1'
const OUT_PATH = new URL('../src/data/water-stations.json', import.meta.url)

const res = await fetch(API_URL)
const data = await res.json()

const stations = data
  .filter(r => r.observationstatus === '現存' && r.locationbytwd97_xy)
  .map(r => {
    const [x, y] = r.locationbytwd97_xy.trim().split(/\s+/).map(Number)
    const { lat, lon } = twd97ToWgs84(x, y)
    const address = String(r.locationaddress ?? '').trim()
    return {
      id: r.basinidentifier,
      name: r.observatoryname,
      river: r.rivername || '',
      address: address === '0' ? '' : address,
      lat: Math.round(lat * 1e6) / 1e6,
      lon: Math.round(lon * 1e6) / 1e6,
      alert1: r.alertlevel1 ? parseFloat(r.alertlevel1) : null,
      alert2: r.alertlevel2 ? parseFloat(r.alertlevel2) : null,
      alert3: r.alertlevel3 ? parseFloat(r.alertlevel3) : null,
    }
  })
  .filter(s => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lon))

writeFileSync(OUT_PATH, JSON.stringify(stations, null, 2))
console.log(`Wrote ${stations.length} water level stations to ${OUT_PATH.pathname}`)
