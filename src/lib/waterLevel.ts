import { pb } from './pb'

export interface WaterStation {
  id: string
  name: string
  river: string
  address: string
  lat: number
  lon: number
  alert1: number | null
  alert2: number | null
  alert3: number | null
}

export interface WaterLevelPoint {
  time: string
  value: number | null
}

export interface WaterLevelSeries {
  title: string
  points: WaterLevelPoint[]
}

export type WaterLevelDays = 7 | 14

const WRA_REALTIME_URL = 'https://opendata.wra.gov.tw/api/v2/73c4c3de-4045-4765-abeb-89f9f9cd5ff0?format=JSON'

export async function fetchWaterLevel(stationId: string): Promise<WaterLevelSeries> {
  const res = await fetch(WRA_REALTIME_URL)
  if (!res.ok) throw new Error(`水利署 API 錯誤 (${res.status})`)
  const records = await res.json()
  const record = Array.isArray(records) ? records.find(r => r.stationid === stationId) : null
  if (!record) throw new Error('查無水位資料')

  const value = Number(record.waterlevel)
  if (!Number.isFinite(value)) throw new Error('水位資料格式錯誤')

  return {
    title: '即時水位 (m)',
    points: [{ time: new Date(record.datetime).toISOString(), value }],
  }
}

export async function fetchWaterLevelHistory(stationId: string, days: WaterLevelDays): Promise<WaterLevelSeries> {
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const records = await pb.collection('water_level_observations').getFullList({
    sort: 'observed_at',
    filter: pb.filter('station_id = {:station} && observed_at >= {:from}', { station: stationId, from }),
    fields: 'observed_at,level_m',
  })
  return {
    title: days === 7 ? '近 7 天水位 (m)' : '近 14 天水位 (m)',
    points: records.map(record => ({ time: record.observed_at, value: Number(record.level_m) })),
  }
}
