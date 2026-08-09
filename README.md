# Taiwan AQI Dashboard

Modern Taiwan public-data dashboard for current air quality. It uses the Ministry of Environment AQI open dataset to summarize national AQI, worst areas, safe areas, pollutant values, stale-data status, and practical activity suggestions.

## Features

- National AQI summary with update freshness warning.
- Worst-county and worst-station ranking.
- Safe-area strip for AQI 100 and below.
- AQI category distribution chart.
- Station explorer with county/status/search filters.
- Pollutant detail cards for PM2.5, PM10, O3, CO, SO2, and NO2.
- Loading, error, empty, stale, and partial-data states.
- Static JSON cache strategy for GitHub Pages without exposing API keys.

## Data Source

Primary dataset: Ministry of Environment Environmental Data Platform `AQX_P_432`.

- Dataset: <https://data.moenv.gov.tw/dataset/detail/AQX_P_432>
- API pattern: `https://data.moenv.gov.tw/api/v2/aqx_p_432?format=json&limit=1000&sort=ImportDate%20desc&api_key=...`
- Official update frequency: hourly.

The MOENV API requires an API key. This app does not call the official API from the browser. Instead, `scripts/fetch-aqi.mjs` writes `public/data/aqi-latest.json`, and the frontend reads that static cache.

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Fetch Official AQI Data

Create `.env` from `.env.example`, then export the key before running the fetch script:

```bash
export MOENV_API_KEY=your-api-key
npm run fetch:aqi
```

The checked-in `public/data/aqi-latest.json` is sample data so the app works without secrets. It is intentionally labeled as sample/stale until replaced by official cache output.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Demo States

- Normal dashboard: `/`
- Error state: `/?demo=error`
- Empty state: `/?demo=empty`
- Loading state: `/?demo=loading`

The stale-data state is visible whenever the newest station publish time is 3 or more hours old, or when the bundled sample cache is used.

## Deployment

The project is a static Vite app and can be deployed to GitHub Pages.

1. Add repository secret `MOENV_API_KEY`.
2. Enable the `Refresh AQI Cache` workflow to update `public/data/aqi-latest.json`.
3. Run CI or `npm run build`.
4. Deploy the `dist` directory with your preferred GitHub Pages workflow.

## License

MIT
