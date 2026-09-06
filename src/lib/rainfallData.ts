export interface RainfallData {
  stationName: string
  past10min: number
  past1hr: number
  past3hr: number
  past6hr: number
  past12hr: number
  past24hr: number
  past2days: number
  past3days: number
  updateTime: string
}

export interface RainfallHistoryData {
  days: 7 | 14
  total: number
  unit: string
  from: string
  to: string
  daysIncluded: number
  daily: Array<{ date: string; value: number }>
}

export async function fetchRainfallData(stationId: string): Promise<RainfallData> {
  const res = await fetch(`/api/cwa/rainfall/${stationId}`)
  if (!res.ok) throw new Error(`雨量 API 錯誤 (${res.status})`)
  const json = await res.json()

  const station = json.records?.Station?.[0]
  if (!station) throw new Error('查無雨量資料')

  const el = station.RainfallElement ?? {}
  const get = (key: string): number => {
    const v = parseFloat(el[key]?.Precipitation ?? '-1')
    return !Number.isFinite(v) || v < 0 ? 0 : Math.round(v * 10) / 10
  }

  const rawTime = station.ObsTime?.DateTime ?? ''
  const updateTime = rawTime
    ? new Date(rawTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  return {
    stationName: station.StationName ?? stationId,
    past10min: get('Past10Min'),
    past1hr: get('Past1hr'),
    past3hr: get('Past3hr'),
    past6hr: get('Past6hr'),
    past12hr: get('Past12hr'),
    past24hr: get('Past24hr'),
    past2days: get('Past2days'),
    past3days: get('Past3days'),
    updateTime,
  }
}

export async function fetchRainfallHistory(stationId: string, days: 7 | 14): Promise<RainfallHistoryData> {
  const res = await fetch(`/api/cwa/rainfall-history/${stationId}?days=${days}`)
  if (res.status === 404) throw new Error('此站暫無歷史雨量資料')
  if (!res.ok) throw new Error(`歷史雨量 API 錯誤 (${res.status})`)
  return res.json()
}
