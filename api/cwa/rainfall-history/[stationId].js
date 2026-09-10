function taipeiIso(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(' ', 'T')
}

function parseRain(value) {
  if (value === -9.8) return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default async function handler(req, res) {
  const stationId = String(req.query.stationId ?? '').toUpperCase()
  const days = Number(req.query.days)
  if (![7, 14].includes(days)) return res.status(400).json({ error: 'days must be 7 or 14' })

  // All-digit IDs → CWA ground stations; letter-prefix IDs → auto_{first-2-chars} per CODiS convention
  const stnType = /^\d+$/.test(stationId) ? 'cwb' : `auto_${stationId.slice(0, 2)}`

  const now = new Date()
  const today = taipeiIso(now).slice(0, 10)
  const todayStart = new Date(`${today}T00:00:00+08:00`)
  const dates = Array.from({ length: days }, (_, index) =>
    taipeiIso(new Date(todayStart.getTime() - (days - index) * 86400000)).slice(0, 10),
  )
  const start = new Date(`${dates[0]}T00:00:00+08:00`)

  const end = new Date(now)
  end.setMonth(end.getMonth() + 1, 0)
  end.setHours(0, 0, 0, 0)

  const body = new URLSearchParams({
    stn_type: stnType,
    stn_ID: stationId,
    type: 'one_month',
    date: taipeiIso(now),
    start: taipeiIso(start),
    end: taipeiIso(end),
    item: 'Precipitation',
  })

  try {
    const upstream = await fetch('https://codis.cwa.gov.tw/api/station?', {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'https://codis.cwa.gov.tw/StationData',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
    })
    const json = await upstream.json()
    if (!upstream.ok) return res.status(upstream.status).json(json)

    const entries = json.day?.data?.[0]?.dts ?? []
    const values = entries
      .map(item => ({
        date: String(item.DataDate ?? '').slice(0, 10),
        value: parseRain(item.Precipitation?.Accumulation),
      }))
      .filter(item => item.date)

    const byDate = new Map(values.map(item => [item.date, item.value]))
    const daily = dates.map(date => ({ date, value: byDate.get(date) ?? null }))
    const available = daily.filter(item => item.value != null)
    if (!available.length) return res.status(404).json({ error: json.day?.message || 'No rainfall history for station' })

    res.status(200).json({
      stationId,
      days,
      total: Math.round(available.reduce((sum, item) => sum + item.value, 0) * 10) / 10,
      unit: 'mm',
      from: dates[0],
      to: dates[dates.length - 1],
      daysIncluded: available.length,
      daily,
    })
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
