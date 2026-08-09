# Taiwan AQI Dashboard Tasks

## Phase 0 - Planning

- [x] Inspect current target folder.
- [x] Inspect reservoir dashboard reference design language.
- [x] Verify current MOENV AQI data/API facts.
- [x] Create `PROJECT_PLAN.md`.
- [x] Create `TASKS.md`.
- [x] Create `DECISIONS.md`.
- [x] Create `REVIEW_LOG.md`.
- [x] Review plan for vagueness and tighten scope.

## Phase 1 - Project Scaffold

- [x] Scaffold Vite + React + TypeScript app.
- [x] Configure Tailwind CSS.
- [x] Add Recharts and test tooling.
- [x] Add scripts for lint, typecheck, test, build.
- [x] Add base app metadata and responsive shell.

## Phase 2 - AQI Data Layer

- [x] Define raw and normalized AQI TypeScript types.
- [x] Implement AQI category mapping and health suggestions.
- [x] Implement official data normalization.
- [x] Implement summary aggregation for national and county views.
- [x] Add Vitest coverage for category mapping, stale detection, malformed rows, and rankings.
- [x] Add static sample cache.
- [x] Add `scripts/fetch-aqi.mjs` with `MOENV_API_KEY` support.

## Phase 3 - Dashboard UI

- [x] Build hero summary with national AQI status, update time, stale warning, and activity advice.
- [x] Build metric cards.
- [x] Build AQI distribution chart.
- [x] Build worst-area and safe-area rankings.
- [x] Build station explorer filters.
- [x] Build station detail cards.
- [x] Implement loading, error, empty, success, stale, and partial-data states.

## Phase 4 - Polish And Accessibility

- [x] Tune desktop, tablet, and mobile layouts.
- [x] Verify keyboard navigation and visible focus.
- [x] Verify long Chinese labels and station names wrap safely.
- [x] Add semantic status colors with sufficient contrast.
- [x] Add source/disclaimer footer.
- [x] Avoid rough placeholder copy.

## Phase 5 - Deployment And Docs

- [x] Add GitHub Actions cache-refresh workflow.
- [x] Add deployment-ready README.
- [x] Add `.env.example`.
- [x] Add source/license notes.
- [x] Confirm static build paths work for GitHub Pages.

## Phase 6 - Final Review

- [x] Run lint.
- [x] Run typecheck.
- [x] Run tests.
- [x] Run build.
- [x] Start local preview/dev server.
- [x] Inspect desktop UI.
- [x] Inspect mobile UI.
- [x] Verify loading state.
- [x] Verify error state.
- [x] Verify empty state.
- [x] Verify stale-data warning.
- [x] Update `REVIEW_LOG.md` with final evidence.

## Phase 7 - Reference Redesign And Screenshot Review

- [x] Inspect `livejiaquan/air-quality-monitor` repository and live design direction.
- [x] Replace generic hero with map-first radar layout.
- [x] Add Taiwan station projection helpers with tests.
- [x] Add glass control panel, station markers, selected-station panel, and compact AQI legend.
- [x] Improve mobile first screen with highest-AQI action strip and labeled tool buttons.
- [x] Run subagent-style user review from desktop/mobile/empty screenshots.
- [x] Fix screenshot-identified issues: oversized chart blank area, dense ranking cards, loose map composition, and off-shape station placement.
- [x] Re-run lint, typecheck, tests, build, and screenshot checks.
