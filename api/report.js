function row(label, value) {
  if (!value) return ''
  const safe = String(value).replace(/</g, '&lt;').replace(/\n/g, '<br>')
  return `<tr>
    <td style="padding:5px 16px 5px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:5px 0;color:#222">${safe}</td>
  </tr>`
}

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.RESEND_API_KEY
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not set' })

  const { reportKind, contactEmail } = req.body ?? {}
  const gpxFile = reportKind === 'route' ? (req.body.gpxFile ?? null) : null
  let subject, html

  if (reportKind === 'route') {
    const r = req.body.route ?? {}
    if (!r.name?.trim() || !r.region || !r.grading?.trim() || !r.gps?.trim())
      return res.status(400).json({ error: '名稱、縣市、難度、GPS 為必填' })

    subject = `[台灣溪降] 路線回報：${r.name}`
    html = `
      <h2 style="font-family:sans-serif;margin:0 0 16px">🗺️ 路線回報：${r.name}</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        ${row('名稱',     r.name)}
        ${row('英文名稱', r.name_en)}
        ${row('縣市',     r.region)}
        ${row('類型',     r.type)}
        ${row('難度',     r.grading)}
        ${row('GPS 座標', r.gps)}
        ${row('最大落差', r.max_drop)}
        ${row('入口方式', r.approach)}
        ${row('總時間',   r.total_time)}
        ${row('深水區',   r.deep_pool)}
        ${row('接駁',     r.ab_shuttle)}
        ${row('GPX 檔案', gpxFile?.name)}
        ${row('備注',     r.note)}
        ${row('聯絡信箱', contactEmail)}
      </table>`

  } else {
    const { type, message } = req.body ?? {}
    if (!String(message ?? '').trim()) return res.status(400).json({ error: 'Message required' })

    const typeLabel = type === 'bug' ? '🐛 Bug 回報' : type === 'suggestion' ? '💡 功能建議' : '📝 一般回報'
    subject = `[台灣溪降] ${typeLabel}`
    html = `
      <p style="font-family:sans-serif"><strong>類型：</strong>${typeLabel}</p>
      <p style="font-family:sans-serif"><strong>內容：</strong><br>${String(message).replace(/\n/g, '<br>')}</p>
      ${contactEmail ? `<p style="font-family:sans-serif"><strong>聯絡信箱：</strong>${contactEmail}</p>` : ''}`
  }

  const emailPayload = { from: 'onboarding@resend.dev', to: 'terry30136@gmail.com', subject, html }
  if (gpxFile?.name && gpxFile?.content) {
    emailPayload.attachments = [{ filename: gpxFile.name, content: gpxFile.content }]
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  })

  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    return res.status(502).json({ error: err.message || 'Send failed' })
  }

  res.status(200).json({ ok: true })
}
