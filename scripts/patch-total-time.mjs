/**
 * Converts all canyon_routes total_time values from single hour/day
 * to ±1 range format. e.g. "7hr" → "6~8 hr", "2day" → "1~3 day"
 *
 * Usage:
 *   $env:PB_EMAIL="..."; $env:PB_PASSWORD="..."; node scripts/patch-total-time.mjs
 */

const PB_URL = 'https://raych-pocketbase.fly.dev';

function convert(s) {
  if (!s) return null;
  // skip if already a range (contains ~ or - between numbers)
  if (/[~]/.test(s) || /\d-\d/.test(s)) return null;
  const hrMatch = s.match(/^(\d+(?:\.\d+)?)\s*hr/i);
  const dayMatch = s.match(/^(\d+(?:\.\d+)?)\s*day/i);
  if (hrMatch) {
    const n = parseFloat(hrMatch[1]);
    const lo = Math.max(1, n - 1);
    return `${lo}~${n + 1} hr`;
  }
  if (dayMatch) {
    const n = parseFloat(dayMatch[1]);
    const lo = Math.max(1, n - 1);
    return `${lo}~${n + 1} day`;
  }
  return null;
}

const email = process.env.PB_EMAIL;
const password = process.env.PB_PASSWORD;
if (!email || !password) {
  console.error('Set PB_EMAIL and PB_PASSWORD env vars first.');
  process.exit(1);
}

const auth = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: email, password }),
});
const { token, message } = await auth.json();
if (!token) { console.error('Auth failed:', message); process.exit(1); }

const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records?fields=id,name,total_time&perPage=200`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { items } = await res.json();

let updated = 0, skipped = 0;
for (const r of items) {
  const newVal = convert(r.total_time);
  if (!newVal) { if (r.total_time) { skipped++; console.log('SKIP', JSON.stringify(r.total_time), r.name); } continue; }
  const patch = await fetch(`${PB_URL}/api/collections/canyon_routes/records/${r.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ total_time: newVal }),
  });
  const result = await patch.json();
  if (result.id) {
    console.log('OK', JSON.stringify(r.total_time), '->', JSON.stringify(newVal), r.name);
    updated++;
  } else {
    console.error('ERR', r.id, JSON.stringify(result));
  }
}
console.log(`\nDone: ${updated} updated, ${skipped} skipped (already range).`);
