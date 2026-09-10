# Taiwan Canyoneering Map

An interactive map for canyoneering, river tracing, and hot spring routes in Taiwan — with real-time water levels and rainfall data.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite) ![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)

## Features

- 🗺️ **Route Map** — Canyoneering, river tracing, and wild hot spring routes across Taiwan, with difficulty ratings, GPS coordinates, and regional filters
- 💧 **Live Water Levels** — Real-time water station data from the Water Resources Agency, with 7/14-day history charts
- 🌧️ **Live Rainfall** — Real-time and historical rainfall data from the Central Weather Administration
- 🔍 **Unified Search** — Search routes, water stations, and rainfall stations together; search state syncs to the URL for easy sharing
- 📤 **Route Submission** — Submit new routes with a form (GPX file upload supported)
- 🐛 **Feedback** — Report bugs or suggestions directly from the app
- 🌐 **Bilingual** — Chinese / English toggle (`?lang=en`)
- 🌙 **Dark / Light Theme** — Dark by default, persisted in localStorage

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Composition API + TypeScript |
| Build | Vite 5 |
| Map | Leaflet + leaflet.markercluster |
| Charts | Chart.js 4 |
| Database | PocketBase (routes + water level history) |
| Serverless | Vercel Functions (`api/` directory) |
| Email | Resend API |

## Data Sources

- **Water level** — [Water Resources Agency Open Data](https://opendata.wra.gov.tw/)
- **Rainfall** — [Central Weather Administration Open Data](https://opendata.cwa.gov.tw/)
- **Routes** — Maintained in PocketBase

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174).

Create a `.env.local` file with:

```env
VITE_PB_URL=https://your-pocketbase-instance.fly.dev
CWA_API_KEY=your_cwa_api_key
```

## Deployment

The app deploys to Vercel. Set the following environment variables in your Vercel project:

| Variable | Description |
|---|---|
| `VITE_PB_URL` | PocketBase instance URL |
| `CWA_API_KEY` | Central Weather Administration API key ([register](https://opendata.cwa.gov.tw/)) |
| `RESEND_API_KEY` | Resend API key for email submissions ([register](https://resend.com/)) |

```bash
npm run build   # outputs to dist/
```

Push to GitHub — Vercel picks it up automatically.

## Public Route Submission API

`POST /api/routes/submit` accepts route suggestions for administrator review. A `202` response with `status: "pending_review"` means the suggestion was received; it does not create or publish a route directly.

```bash
curl -X POST https://tw-canyoning.vercel.app/api/routes/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Creek","region":"Nantou","grading":"V3 A3 III","gps":"23.9601,120.9719","contact_email":"user@example.com","note":"Access notes"}'
```

Required fields: `name`, `region`, `grading`, `gps`. Optional fields: `name_en`, `type`, `max_drop`, `approach`, `total_time`, `deep_pool`, `ab_shuttle`, `note`, and `contact_email`. Browser requests are supported through CORS.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5174) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

## License

MIT
