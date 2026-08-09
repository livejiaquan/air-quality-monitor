# Taiwan AQI Dashboard Review Log

## 2026-05-30 - Phase 0 Planning Review

Scope reviewed:

- Empty target folder at `/Users/jiaquan/Development/taiwan-aqi-dashboard`.
- Local reservoir reference project at `/Users/jiaquan/Development/acc/taiwan-reservoir-static`.
- Official MOENV dataset page for `AQX_P_432`.
- Official API usage page.
- Live `curl` check without `api_key`.

Findings:

- The project folder was empty, so planning files are the first project artifacts.
- The reservoir reference uses large statistics, semantic status cards, subtle gradients, rounded card surfaces, chart/ranking/detail sections, and responsive spacing.
- MOENV documents `AQX_P_432` as hourly AQI data with station, county, AQI, pollutant, status, pollutant values, publish time, and coordinates.
- MOENV API documentation states API key usage is required.
- A no-key `curl` request to `https://data.moenv.gov.tw/api/v2/aqx_p_432?format=json&limit=3&sort=ImportDate%20desc` returned `api_key 不存在。` and HTTP 500, confirming the app should not rely on unauthenticated live browser fetches.

Plan self-review:

- Initial risk: "use official data" could imply direct browser fetch. Updated plan explicitly uses a static JSON cache with `MOENV_API_KEY` only in Node/GitHub Actions.
- Initial risk: visual direction could be too close to the reservoir dashboard. Updated plan states what to preserve and what to adapt for AQI.
- Initial risk: state handling could be vague. Updated plan defines loading, recoverable error, fatal parse fallback, empty filter results, stale, and partial-data states.
- Initial risk: final verification could be underspecified. Updated tasks list exact lint/typecheck/test/build/browser checks.

Next phase:

- Scaffold the Vite React TypeScript app and configure the frontend/tooling foundation before implementing AQI behavior.

## 2026-05-30 - Implementation Review

Scope implemented:

- Vite + React + TypeScript + Tailwind app scaffold.
- AQI normalization library with official category mapping, stale detection, station records, county summaries, worst/safe rankings, pollutant parsing, and health advice.
- Static sample cache at `public/data/aqi-latest.json`.
- Official fetch script at `scripts/fetch-aqi.mjs` using `MOENV_API_KEY`.
- Dashboard UI: hero, metrics, stale warning, distribution chart, county ranking, safe-area strip, station explorer, station cards, data source footer.
- Demo states: `?demo=loading`, `?demo=error`, `?demo=empty`.
- GitHub Actions for CI and scheduled AQI cache refresh.
- README, `.env.example`, `.gitignore`, and MIT license.

Self-review fixes made:

- Fixed strict TypeScript narrowing in `extractRows`.
- Fixed sample-data freshness so stale status compares station publish time against the browser's current time, not the cache generation time.
- Added favicon to remove browser 404 noise.
- Replaced the responsive chart wrapper with a measured chart container to remove Recharts first-layout warnings.
- Switched the distribution chart from angled vertical labels to horizontal bars after mobile QA showed crowded labels.
- Added Vite relative base for GitHub Pages and split chart/icon bundles to remove build chunk warnings.

Verification evidence:

- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `npm run test`: exit 0, 1 test file and 4 tests passed.
- `npm run build`: exit 0, generated `dist/` with no chunk-size warning after manual chunk split.
- Dev server: `http://127.0.0.1:5173/`.
- Browser normal desktop screenshot: `.playwright-cli/page-2026-05-29T16-40-51-507Z.png`.
- Browser mobile hero screenshot: `.playwright-cli/page-2026-05-29T16-41-20-426Z.png`.
- Browser mobile chart/ranking screenshot after horizontal chart fix: `.playwright-cli/page-2026-05-29T16-43-39-921Z.png`.
- Browser loading screenshot: `.playwright-cli/page-2026-05-29T16-46-15-239Z.png`.
- Browser error state: `/?demo=error` snapshot showed "無法讀取 AQI 快取" and retry button.
- Browser empty state: `/?demo=empty` snapshot showed "目前沒有可顯示的測站資料" and station empty state.
- Browser console on normal dashboard had only React DevTools development info after fixes; no app errors.

Residual notes:

- Checked-in AQI cache is sample data by design. Configure `MOENV_API_KEY` and run `npm run fetch:aqi` or the scheduled GitHub Action to replace it with official cache output.
- Browser plugin backend was unavailable, so visual QA used the local Playwright CLI fallback.
- The folder is now initialized as a local Git repository on branch `main`; no commit has been created.

## 2026-05-30 - Reference Redesign Review

Reference inspected:

- GitHub repository: `https://github.com/livejiaquan/air-quality-monitor`.
- Live page: `https://livejiaquan.github.io/air-quality-monitor/`.
- Key design traits used: map-first layout, floating glass controls, AQI number markers, heat/risk emphasis, legend, station detail panel, and dark map surface.

Implementation changes:

- Replaced the original generic hero with `TaiwanAirMap`.
- Added `src/lib/mapLayout.ts` and `src/lib/mapLayout.test.ts` for station-to-map placement.
- Added mobile first-screen status strip: highest AQI, station, action advice, and data age.
- Added labeled tool buttons so mobile users do not have to infer icon meaning.
- Added data-quality note distinguishing official cache from sample/fallback data.
- Changed mobile legend from a bottom overlay to a compact top-right legend to avoid covering station markers.
- Tightened lower chart/ranking section after screenshot review: chart card height no longer stretches to ranking height, ranking cards are denser, and chart height is reduced.
- Adjusted the stylized Taiwan projection so main-island stations sit near the Taiwan shape while Kinmen/Matsu remain as inset offshore points.

Subagent-style screenshot review:

- General commuter/outdoor user: 7/10. Would use occasionally; asked for faster mobile answer to "can I go outside", labeled icon buttons, and clearer data-age warning.
- Data visualization/product reviewer: 8/10. Felt the design is now distinctive and aligned with map-first AQI monitoring, but flagged mobile legend overlap and too much traditional dashboard weight.
- Public-data power user: 7/10. Liked risk readability but flagged data trust signals, sample/fallback labels, stale data visibility, and need for source/update clarity.

Screenshot evidence:

- Desktop map after projection/layout fixes: `.playwright-cli/page-2026-05-30T02-13-54-030Z.png`.
- Desktop lower chart/ranking after density fixes: `.playwright-cli/page-2026-05-30T02-14-43-802Z.png`.
- Mobile first screen after status strip and compact legend: `.playwright-cli/page-2026-05-30T02-16-21-359Z.png`.
- Empty-data screenshot before final projection polish: `.playwright-cli/page-2026-05-29T17-29-53-204Z.png`.

Verification evidence:

- `npm run test -- src/lib/mapLayout.test.ts`: exit 0, 1 test file and 3 tests passed.
- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `npm run test`: exit 0, 2 test files and 7 tests passed.
- `npm run build`: exit 0, production build completed.
- Browser console on the latest mobile check had only React DevTools development info; no app error logged.

Residual notes:

- Current bundled data remains sample data, so screenshots show stale/sample warnings by design. Trust improves when `MOENV_API_KEY` is configured and the official cache is refreshed.
- The map is a stylized product visual, not a GIS-accurate Leaflet basemap. It now better communicates risk and geography, but a future production version could use real map tiles if exact geographic inspection becomes a priority.
