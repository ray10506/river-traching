const DATA_ID = 'O-A0002-001'
const CWA_HOST = 'opendata.cwa.gov.tw'

function taipeiIso(date) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

function parseRain(value) {
  if (value === 'T') return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null
}

function findFiles(value, result = []) {
  if (!value || typeof value !== 'object') return result
  if (Array.isArray(value)) {
    value.forEach(item => findFiles(item, result))
    return result
  }

  const url = value.url ?? value.URL
  const time = value.time ?? value.Time ?? value.dataTime ?? value.DataTime ?? value.dateTime ?? value.DateTime
  if (url && time) result.push({ url: String(url), time: String(time) })

  Object.values(value).forEach(item => findFiles(item, result))
  return result
}

function findStation(value, stationId) {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStation(item, stationId)
      if (found) return found
    }
    return null
  }

  const id = value.StationId ?? value.StationID ?? value.stationId ?? value.stationID
  if (id === stationId) return value

  for (const item of Object.values(value)) {
    const found = findStation(item, stationId)
    if (found) return found
  }
  return null
}

function stationRain(station) {
  // Use Past24hr (accumulated) not Now (instantaneous) so history totals are correct
  const direct = station?.RainfallElement?.Past24hr?.Precipitation ?? station?.rainfallElement?.Past24hr?.Precipitation
  if (direct != null) return parseRain(direct)

  const oldItem = station?.weatherElement?.find?.(item =>
    ['PAST_24HR', 'Past24hr'].includes(item.elementName) || ['PAST_24HR', 'Past24hr'].includes(item.ElementName)
  )
  return parseRain(oldItem?.elementValue?.value ?? oldItem?.elementValue ?? oldItem?.ElementValue?.Value)
}

function rainFromJson(body, stationId) {
  const station = findStation(JSON.parse(body), stationId)
  return stationRain(station)
}

function rainFromXml(body, stationId) {
  const escapedId = stationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stationMatch = body.match(new RegExp(`<[Ss]tation>[\\s\\S]*?<[Ss]tation[Ii]d>${escapedId}</[Ss]tation[Ii]d>[\\s\\S]*?</[Ss]tation>`))
  const station = stationMatch?.[0] ?? ''
  const newRain = station.match(/<Past24hr>\s*<Precipitation>([^<]+)<\/Precipitation>\s*<\/Past24hr>/)
  const oldRain = station.match(/<elementName>PAST_24HR<\/elementName>[\s\S]*?<value>([^<]+)<\/value>/)
  return parseRain(newRain?.[1] ?? oldRain?.[1])
}

async function fetchHistoryFile(fileUrl, apiKey, stationId) {
  const url = new URL(fileUrl, `https://${CWA_HOST}`)
  if (url.hostname !== CWA_HOST) throw new Error('Unexpected CWA history URL')
  if (!url.searchParams.has('Authorization')) url.searchParams.set('Authorization', apiKey)

  const upstream = await fetch(url.toString(), { headers: { Accept: 'application/json, application/xml, text/xml' } })
  const body = await upstream.text()
  if (!upstream.ok) throw new Error(`CWA history file error ${upstream.status}`)

  return body.trim().startsWith('{') ? rainFromJson(body, stationId) : rainFromXml(body, stationId)
}

export default async function handler(req, res) {
  const { stationId } = req.query
  const days = Number(req.query.days)
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'CWA_API_KEY not configured' })
  if (![7, 14].includes(days)) return res.status(400).json({ error: 'days must be 7 or 14' })

  const now = new Date()
  const start = new Date(now.getTime() - (days + 1) * 86400000)
  const metaUrl = new URL(`https://${CWA_HOST}/historyapi/v1/getMetadata/${DATA_ID}`)
  metaUrl.searchParams.set('Authorization', apiKey)
  metaUrl.searchParams.set('format', 'JSON')
  metaUrl.searchParams.set('timeFrom', taipeiIso(start))
  metaUrl.searchParams.set('timeTo', taipeiIso(now))

  try {
    const metaRes = await fetch(metaUrl.toString(), { headers: { Accept: 'application/json' } })
    const meta = await metaRes.json()
    if (!metaRes.ok) return res.status(metaRes.status).json(meta)

    const byDate = new Map()
    for (const file of findFiles(meta).sort((a, b) => a.time.localeCompare(b.time))) {
      byDate.set(file.time.slice(0, 10), file)
    }

    const values = []
    for (const file of [...byDate.values()].slice(-days)) {
      const value = await fetchHistoryFile(file.url, apiKey, stationId)
      if (value != null) values.push({ date: file.time.slice(0, 10), value })
    }

    if (!values.length) return res.status(404).json({ error: 'No rainfall history for station' })

    res.status(200).json({
      stationId,
      days,
      total: Math.round(values.reduce((sum, item) => sum + item.value, 0) * 10) / 10,
      unit: 'mm',
      from: values[0].date,
      to: values[values.length - 1].date,
      daysIncluded: values.length,
    })
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
