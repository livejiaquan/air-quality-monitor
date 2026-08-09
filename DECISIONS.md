# Taiwan AQI Dashboard Decisions

## 2026-05-30 - App Stack

Decision: Use Vite + React + TypeScript + Tailwind CSS + Recharts.

Reason: The app is a static public-data dashboard with rich client-side visualization. Vite keeps GitHub Pages deployment simple, TypeScript protects data normalization, Tailwind supports a polished dashboard system quickly, and Recharts is enough for category/ranking charts without overbuilding.

## 2026-05-30 - Data Access

Decision: Do not call the MOENV API directly from the browser.

Reason: The official data platform requires an API key. A browser call would expose the key. The app will read a static JSON cache produced by a Node script and optionally refreshed by GitHub Actions using a repository secret.

## 2026-05-30 - Freshness Threshold

Decision: Mark AQI data stale when newest station publish time is 3 or more hours old.

Reason: The official dataset updates hourly. A 3-hour threshold avoids false alarms from minor delays while still warning users when the dashboard is not current enough for practical decisions.

## 2026-05-30 - AQI Category Source

Decision: Use the official Taiwan AQI category bands: 0-50, 51-100, 101-150, 151-200, 201-300, and 301-500.

Reason: These are the public categories users see on the Ministry of Environment air-quality pages, and they map directly to official health/activity advice.

## 2026-05-30 - Design Language

Decision: Use the reservoir dashboard as a family reference, not a template.

Reason: The new dashboard should share the public-data series feel: large statistics, cards, status colors, rankings, charts, soft shadows, and responsive layout. AQI needs its own status-forward palette and health/advice hierarchy, so direct copy would be visually misleading.

## 2026-05-30 - Demo State URLs

Decision: Support `?demo=error`, `?demo=empty`, and `?demo=loading`.

Reason: The app must prove loading, error, and empty states during review. Demo URLs make those states deterministic without adding visible production-only controls to the dashboard.

## 2026-05-30 - Static Build Base

Decision: Use Vite `base: './'` and split chart/icon bundles.

Reason: Relative assets make the build safer for GitHub Pages project-site deployment. Manual chunks keep the production build free of large-bundle warnings caused by Recharts.

## 2026-05-30 - Map-First AQI Redesign

Decision: Replace the generic card-first hero with a dark map-first AQI radar surface inspired by `livejiaquan/air-quality-monitor`.

Reason: The reference design is distinctive because the first impression is geographic: a full map, floating glass controls, colored AQI markers, legends, and station detail panels. AQI users need fast spatial risk recognition, so the dashboard now leads with Taiwan, measurement points, selected-station advice, and a mobile action strip before secondary charts.

## 2026-05-30 - Stylized Taiwan Projection

Decision: Use a UI-specific Taiwan map projection helper instead of mapping the full longitude/latitude range directly into the card.

Reason: A direct full-bounds projection lets offshore islands stretch the main island composition and pushes western stations outside the stylized Taiwan shape. The helper now projects main-island stations against a compressed visual centerline and treats Kinmen/Matsu as fixed inset points, matching the intentionally simplified SVG map.
