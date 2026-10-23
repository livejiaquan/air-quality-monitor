import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AirMap } from './components/AirMap';
import { Overview } from './components/Overview';
import { SiteHeader } from './components/SiteHeader';
import { ErrorPanel, LoadingDashboard } from './components/StatePanels';
import { StationHero } from './components/StationHero';
import { Rankings } from './components/Rankings';
import { MapLegend, StationList } from './components/StationList';
import { QuickPicks, StationPicker } from './components/StationPicker';
import { recomputeAqiDatasetFreshness, type AqiDataset, type AqiStationRecord } from './lib/aqi';
import { getDemoMode, loadAqiDataset, loadLastGoodDataset } from './lib/data';
import { getDominantPollutant } from './lib/format';
import { readSavedStationId, saveStationId, useTheme } from './lib/preferences';
import { getDefaultStation, STATION_SELECTION_GUIDANCE } from './lib/stationSelection';

type LoadState =
  | { status: 'loading'; dataset: null; error: null }
  | { status: 'success'; dataset: AqiDataset; error: null }
  | { status: 'error'; dataset: null; error: string };

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', dataset: null, error: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    loadAqiDataset()
      .then((dataset) => {
        if (!cancelled) {
          setLoadState({ status: 'success', dataset, error: null });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const lastGood = getDemoMode() === 'error' ? null : loadLastGoodDataset();
        if (lastGood) {
          setLoadState({ status: 'success', dataset: lastGood, error: null });
          setRefreshError(error instanceof Error ? error.message : 'Unknown AQI data loading error.');
          return;
        }
        setLoadState({
          status: 'error',
          dataset: null,
          error: error instanceof Error ? error.message : 'Unknown AQI data loading error.'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const retryInitialLoad = useCallback(async () => {
    setLoadState({ status: 'loading', dataset: null, error: null });
    try {
      const dataset = await loadAqiDataset();
      setLoadState({ status: 'success', dataset, error: null });
    } catch (error) {
      setLoadState({
        status: 'error',
        dataset: null,
        error: error instanceof Error ? error.message : 'Unknown AQI data loading error.'
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoadState((current) =>
      current.status === 'success'
        ? { status: 'success', dataset: recomputeAqiDatasetFreshness(current.dataset), error: null }
        : current
    );
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const dataset = await loadAqiDataset();
      setLoadState({ status: 'success', dataset, error: null });
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Unknown AQI data refresh error.');
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const freshnessIntervalId = window.setInterval(() => {
      setLoadState((current) =>
        current.status === 'success'
          ? { status: 'success', dataset: recomputeAqiDatasetFreshness(current.dataset), error: null }
          : current
      );
    }, 60 * 1000);
    const intervalId = window.setInterval(() => void refresh(), 15 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(freshnessIntervalId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[2000] rounded-lg bg-surface px-4 py-2 font-bold text-ink shadow-card focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        跳到主要內容
      </a>
      <SiteHeader
        dataset={loadState.dataset ?? undefined}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={loadState.status === 'success' ? refresh : undefined}
        isRefreshing={isRefreshing}
      />
      {loadState.status === 'loading' && <LoadingDashboard />}
      {loadState.status === 'error' && <ErrorPanel onRetry={retryInitialLoad} />}
      {loadState.status === 'success' && <Dashboard dataset={loadState.dataset} refreshError={refreshError} />}
    </>
  );
}

type DashboardProps = {
  dataset: AqiDataset;
  refreshError: string | null;
};

function Dashboard({ dataset, refreshError }: DashboardProps) {
  const { summary, records, warnings } = dataset;
  const [selectedStationId, setSelectedStationId] = useState<string | null>(() => {
    const saved = readSavedStationId();
    return saved && records.some((record) => record.siteId === saved) ? saved : null;
  });
  const heroRef = useRef<HTMLDivElement>(null);
  const isOfficialSource = dataset.source.kind === 'official-cache';
  const pickedStation = useMemo<AqiStationRecord | null>(
    () => records.find((record) => record.siteId === selectedStationId) ?? null,
    [records, selectedStationId]
  );
  // Until the visitor picks a station, the focal card shows a labelled default (a major city).
  const defaultStation = useMemo(() => getDefaultStation(records), [records]);
  const focalStation = pickedStation ?? defaultStation;
  const currentRecords = useMemo(
    () => (isOfficialSource ? records.filter((record) => !record.isStale) : []),
    [isOfficialSource, records]
  );
  const dominantPollutant = useMemo(() => getDominantPollutant(currentRecords), [currentRecords]);
  const hasCurrentData = isOfficialSource && summary.currentStationCount > 0;
  const statusMessages = useMemo(() => {
    const messages: string[] = [];

    if (dataset.source.kind !== 'official-cache') {
      messages.push('目前是範例或備援資料，只供介面展示；本站不會用這些資料提供現在的健康或活動結論。');
    }
    // Only the > 24 h case earns a top note (stale-state standard v1); aging and
    // old readings are labelled next to the data instead.
    if (records.length === 0) {
      messages.push('目前沒有可顯示的測站資料，可能是快取尚未產生或資料格式異常。');
    } else if (isOfficialSource && !hasCurrentData) {
      messages.push('所有測站的資料都超過 24 小時，以下顯示的是各站最後一筆資料，不提供活動建議。');
    }
    if (refreshError) {
      messages.push('暫時連不上本站資料，以下顯示上次成功載入的資料。');
    }
    warnings.map(translateWarning).filter(Boolean).forEach((warning) => messages.push(warning!));

    return [...new Set(messages)];
  }, [dataset.source.kind, hasCurrentData, isOfficialSource, records.length, refreshError, warnings]);
  const isSevere = !hasCurrentData || records.length === 0;

  const selectStation = useCallback((station: AqiStationRecord | null, options: { reveal?: boolean } = {}) => {
    setSelectedStationId(station?.siteId ?? null);
    saveStationId(station?.siteId ?? null);
    if (station && options.reveal) {
      heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  const revealStation = useCallback((station: AqiStationRecord) => selectStation(station, { reveal: true }), [selectStation]);

  return (
    <main id="main-content" className="mx-auto max-w-[1024px] space-y-6 px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      {statusMessages.length > 0 && (
        <section
          role="status"
          aria-live="polite"
          className={`flex gap-3 rounded-card px-4 py-3 text-base sm:px-6 ${isSevere ? 'bg-warnbg text-warn' : 'bg-surface text-muted ring-1 ring-line'}`}
        >
          <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            {statusMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
            {isSevere && (
              <a className="font-bold underline underline-offset-2" href="https://airtw.moenv.gov.tw/" target="_blank" rel="noreferrer">
                最新數據請見環境部空氣品質監測網
              </a>
            )}
          </div>
        </section>
      )}

      {/* Search row, after the IQAir city page: full-width search, then quick picks. */}
      <div>
        <StationPicker stations={records} selected={pickedStation} onSelect={selectStation} canShowCurrent={isOfficialSource} />
      </div>

      <div ref={heroRef} className="scroll-mt-24 pt-2">
        {focalStation && <StationHero dataset={dataset} station={focalStation} isDefault={!pickedStation} />}
      </div>

      <section aria-labelledby="map-heading" className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
        <h2 id="map-heading" className="sr-only">全台測站地圖，點地圖上的數字即可切換測站</h2>
        <div className="relative h-[436px] sm:h-[456px]">
          <AirMap stations={records} selectedId={focalStation?.siteId ?? null} canShowCurrent={isOfficialSource} onSelect={selectStation} />
        </div>
        <div className="border-t border-line p-4 sm:px-6">
          <MapLegend dimmed={!hasCurrentData} />
        </div>
      </section>

      {hasCurrentData && <Rankings stations={currentRecords} onSelect={revealStation} />}

      {/* Major-city shortcuts near the end, like IQAir's "most polluted city" chips. */}
      <section aria-labelledby="quick-heading" className="space-y-2">
        <h2 id="quick-heading" className="text-base font-bold">主要城市</h2>
        <QuickPicks stations={records} onSelect={(station) => station && revealStation(station)} canShowCurrent={isOfficialSource} />
      </section>

      <section aria-labelledby="list-heading" className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
        <div className="p-4 pb-0 sm:p-6 sm:pb-0">
          <h2 id="list-heading" className="text-base font-bold">所有測站</h2>
          <p className="text-sm text-muted">依縣市篩選或搜尋站名，點選即可查看。</p>
        </div>
        <div className="h-[480px]">
          <StationList stations={records} selectedId={focalStation?.siteId ?? null} canShowCurrent={isOfficialSource} onSelect={revealStation} />
        </div>
      </section>

      {hasCurrentData && <Overview summary={summary} dominantPollutant={dominantPollutant} />}

      <footer className="space-y-2 border-t border-line pt-6 text-sm text-muted">
        <p>
          資料來源：環境部「
          <a className="font-semibold text-muted underline underline-offset-2" href="https://data.moenv.gov.tw/dataset/detail/AQX_P_432" target="_blank" rel="noreferrer">
            空氣品質指標（AQX_P_432）
          </a>
          」，依
          <a className="font-semibold text-muted underline underline-offset-2" href="https://data.gov.tw/license" target="_blank" rel="noreferrer">
            政府資料開放授權條款第 1 版
          </a>
          再利用；每小時自動更新。本站非環境部官方網站，即時資料未經品保，健康提示僅供生活參考，不是醫療建議。
        </p>
        <p>
          {STATION_SELECTION_GUIDANCE.text}{' '}
          <a className="font-semibold text-accent underline underline-offset-2" href={STATION_SELECTION_GUIDANCE.sourceUrl} target="_blank" rel="noreferrer">
            了解測站類型
          </a>
        </p>
        <p>
          地圖 © OpenStreetMap 貢獻者 ·{' '}
          <a className="underline underline-offset-2" href="https://github.com/livejiaquan/air-quality-monitor" target="_blank" rel="noreferrer">
            原始碼（MIT）
          </a>
        </p>
      </footer>
    </main>
  );
}

function translateWarning(warning: string) {
  const malformedRows = warning.match(/^Dropped (\d+) malformed station rows?\.$/);
  if (malformedRows) return `${malformedRows[1]} 筆測站資料格式不完整，已排除。`;
  const duplicateRows = warning.match(/^Dropped (\d+) duplicate station rows?\.$/);
  if (duplicateRows) return `${duplicateRows[1]} 筆重複測站資料已排除。`;
  if (/Bundled sample data/i.test(warning)) return null;
  return warning;
}
