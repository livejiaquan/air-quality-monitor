# Taiwan AQI Dashboard Project Plan

## Product Goal

Build a polished public-data dashboard that answers four questions within 5 seconds:

1. How is Taiwan's air quality right now?
2. Which areas are worst?
3. Which areas are safe?
4. What should a normal user do today?

The app should feel like a sibling to the existing Taiwan reservoir dashboard: clear headline metrics, card-based public-data layout, semantic status colors, responsive sections, charts, rankings, and station detail cards. It should adapt the style for air quality instead of copying water-themed UI.

## Data Source And API Strategy

Primary source: Taiwan Ministry of Environment open data dataset `AQX_P_432`, "Air Quality Index (AQI)".

- Dataset page: `https://data.moenv.gov.tw/dataset/detail/AQX_P_432`
- API pattern: `https://data.moenv.gov.tw/api/v2/aqx_p_432?format=json&limit=1000&sort=ImportDate%20desc&api_key=...`
- Fields used: `sitename`, `county`, `aqi`, `pollutant`, `status`, `so2`, `co`, `o3`, `o3_8hr`, `pm10`, `pm2.5`, `no2`, `publishtime`, `longitude`, `latitude`, `siteid`
- Official update frequency: hourly.
- API key: required by the MOENV data platform. The browser app must not embed the key.

Strategy:

- Use a static JSON cache at `public/data/aqi-latest.json`.
- Add a Node script to fetch official data with `MOENV_API_KEY`, normalize it, and write the static cache.
- Add a checked-in sample/stale cache so the UI works locally without secrets.
- Add GitHub Actions later to refresh the cache on a schedule when `MOENV_API_KEY` is configured.
- The frontend fetches only the static cache file, keeping GitHub Pages deployment simple and avoiding client-side secret exposure.

## Data Fetching, Caching, And Normalization

Normalization output shape:

- `generatedAt`: cache generation timestamp.
- `source`: source metadata and source URL.
- `records`: normalized station records.
- `summary`: national and county-level aggregates.
- `warnings`: fetch or data-quality warnings.

Station record fields:

- identity: station id, station name, county.
- AQI: numeric AQI, official status, main pollutant.
- pollutant values: PM2.5, PM10, O3, O3 8hr, CO, SO2, NO2.
- coordinates where available.
- publish time and parsed timestamp.
- derived AQI category, severity rank, color token, health suggestion.

Caching behavior:

- Treat data as fresh when newest publish time is under 3 hours old.
- Show stale warning when newest publish time is 3 or more hours old, or when only sample data is loaded.
- Show partial-data warning when malformed station rows were dropped.
- Preserve last successful static JSON during failed scheduled refreshes.

## Frontend Stack And Component Structure

Stack:

- Vite
- React
- TypeScript
- Tailwind CSS
- Recharts
- Vitest for data-normalization tests
- GitHub Actions for cache refresh and deployment readiness

Component structure:

- `src/App.tsx`: page shell and state orchestration.
- `src/lib/aqi.ts`: parsing, category mapping, summaries, health suggestions.
- `src/lib/data.ts`: static JSON fetch, validation, fallback handling.
- `src/components/HeroSummary.tsx`: national headline, update time, stale warning, top action suggestion.
- `src/components/MetricCard.tsx`: reusable dashboard stat card.
- `src/components/AqiDistributionChart.tsx`: AQI category distribution.
- `src/components/CountyRanking.tsx`: worst and safest county ranking.
- `src/components/StationExplorer.tsx`: county/status filters and station detail grid.
- `src/components/StationCard.tsx`: pollutant values and per-station advice.
- `scripts/fetch-aqi.mjs`: official API fetch and static cache writer.

## UI Layout And AQI Color System

Layout:

1. Hero summary band with national status, average/max AQI, update time, and one practical activity recommendation.
2. Metric cards for monitored stations, healthy stations, unhealthy stations, worst county, and primary pollutant.
3. Two-column desktop dashboard: distribution chart and worst-area ranking.
4. Safe-area strip showing counties/stations currently in good or moderate AQI.
5. Station explorer with filters and dense detail cards.
6. Data source footer with official links and disclaimer.

AQI colors follow the official category bands:

- 0-50 Good: green
- 51-100 Moderate: yellow
- 101-150 Unhealthy for Sensitive Groups: orange
- 151-200 Unhealthy: red
- 201-300 Very Unhealthy: purple
- 301-500 Hazardous: maroon
- Missing/invalid: slate gray

Visual adaptation from the reservoir reference:

- Keep large readable statistics, soft card shadows, rounded corners, subtle gradients, and responsive grids.
- Replace water iconography and blue-heavy palette with clean air/public-health cues: green/yellow/orange/red AQI semantics, light sky background, and restrained neutral surfaces.
- Avoid copying the exact static HTML/CSS; implement a modern typed React component system.

## Charts, Rankings, Filters, And Station Details

Charts:

- AQI category distribution bar chart.
- County average AQI ranking chart or list, using worst station and station count as supporting context.

Rankings:

- Worst counties by max AQI, then average AQI.
- Worst stations by AQI.
- Safest counties/stations where AQI is good or moderate.

Filters:

- County select or segmented control.
- AQI status/category segmented control.
- Pollutant quick filter for PM2.5, PM10, O3, and all pollutants.

Station details:

- Station name, county, AQI badge, official status, main pollutant.
- PM2.5, PM10, O3, CO, SO2, NO2 values.
- Publish time and stale marker.
- Health/activity suggestion for normal users and sensitive groups.

## Loading, Error, Empty, And Stale States

Loading:

- Skeleton cards and chart placeholders with reserved dimensions.

Error:

- Recoverable fetch error shows a compact error panel with retry action.
- Fatal parse error falls back to bundled sample if available and labels the data as sample/stale.

Empty:

- Empty station grid explains that no stations match current filters and offers a reset action.

Stale/degraded:

- Hero warning when data is older than 3 hours.
- Source badge indicates live cache, sample cache, or fallback.
- Partial-data warning if records were dropped during normalization.

## Deployment And Review Checklist

Deployment:

- Static Vite build suitable for GitHub Pages.
- Scheduled GitHub Action can refresh `public/data/aqi-latest.json` using `MOENV_API_KEY`.
- README documents setup, data source, API key, refresh script, and deployment.

Required verification before completion:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Browser inspection at desktop and mobile widths.
- Confirm loading, error, empty, stale, and success states are implemented or demonstrable.

