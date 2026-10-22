import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AirMap } from './components/AirMap';
import { Overview } from './components/Overview';
import { SiteHeader } from './components/SiteHeader';
import { ErrorPanel, LoadingDashboard } from './components/StatePanels';
import { StationHero } from './components/StationHero';
import { MapLegend, StationList } from './components/StationList';
import { StationPicker } from './components/StationPicker';
import { recomputeAqiDatasetFreshness, type AqiDataset, type AqiStationRecord } from './lib/aqi';
import { loadAqiDataset } from './lib/data';
import { getDominantPollutant } from './lib/format';
import { readSavedStationId, saveStationId, useTheme } from './lib/preferences';

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
        if (!cancelled) {
          setLoadState({
            status: 'error',
            dataset: null,
            error: error instanceof Error ? error.message : 'Unknown AQI data loading error.'
          });
        }
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
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const heroRef = useRef<HTMLDivElement>(null);
  const isOfficialSource = dataset.source.kind === 'official-cache';
  const selectedStation = useMemo<AqiStationRecord | null>(
    () => records.find((record) => record.siteId === selectedStationId) ?? null,
    [records, selectedStationId]
  );
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
    if (records.length === 0) {
      messages.push('目前沒有可顯示的測站資料，可能是快取尚未產生或資料格式異常。');
    } else if (isOfficialSource && !hasCurrentData) {
      messages.push('目前沒有 3 小時內的有效測站資料；全台概況與活動建議已暫停，地圖與列表顯示的是各站最後一筆資料。');
    } else if (isOfficialSource && summary.staleStationCount > 0) {
      messages.push(`${summary.staleStationCount} 個測站資料過期或時間無效，已排除於全台概況與活動建議。`);
    }
    if (isOfficialSource && summary.futureTimestampCount > 0) {
      messages.push(`${summary.futureTimestampCount} 個測站的發布時間異常晚於目前時間，已視為不可用。`);
    }
    if (refreshError) {
      messages.push('背景更新失敗，目前仍保留上一版資料；請稍後再試或前往官方監測頁確認。');
    }
    warnings.map(translateWarning).filter(Boolean).forEach((warning) => messages.push(warning!));

    return [...new Set(messages)];
  }, [dataset.source.kind, hasCurrentData, isOfficialSource, records.length, refreshError, summary.futureTimestampCount, summary.staleStationCount, warnings]);
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
    <main id="main-content" className="mx-auto max-w-6xl space-y-4 px-4 pb-10 pt-4 sm:space-y-5 sm:px-6 sm:pt-6">
      {statusMessages.length > 0 && (
        <section
          role="status"
          aria-live="polite"
          className={`flex gap-3 rounded-2xl px-4 py-3 text-sm leading-6 ${isSevere ? 'bg-warnbg text-warn' : 'border border-line bg-surface text-muted'}`}
        >
          <AlertTriangle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            {statusMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
            {isSevere && (
              <a className="font-bold underline underline-offset-2" href="https://airtw.moenv.gov.tw/" target="_blank" rel="noreferrer">
                前往環境部空氣品質監測網查看即時資料
              </a>
            )}
          </div>
        </section>
      )}

      <div ref={heroRef} className="scroll-mt-20">
        <StationHero
          dataset={dataset}
          station={selectedStation}
          picker={<StationPicker stations={records} selected={selectedStation} onSelect={selectStation} canShowCurrent={isOfficialSource} />}
        />
      </div>

      <section aria-labelledby="map-heading" className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6">
          <div>
            <h2 id="map-heading" className="text-lg font-bold">全台測站</h2>
            <p className="text-sm text-muted">點地圖上的數字或列表中的測站，即可查看詳細資料。</p>
          </div>
          <div className="flex rounded-xl bg-sunken p-1 text-sm font-semibold lg:hidden" role="tablist" aria-label="切換地圖或列表">
            {(['map', 'list'] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={mobileView === view}
                onClick={() => setMobileView(view)}
                className={`rounded-lg px-4 py-1.5 transition ${mobileView === view ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              >
                {view === 'map' ? '地圖' : '列表'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] border-t border-line lg:h-[560px] lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className={`relative h-[62vh] max-h-[560px] min-h-[380px] lg:block lg:h-full lg:max-h-none ${mobileView === 'map' ? 'block' : 'hidden'}`}>
            <AirMap stations={records} selectedId={selectedStationId} canShowCurrent={isOfficialSource} onSelect={selectStation} />
          </div>
          <div className={`h-[62vh] max-h-[560px] min-h-[380px] border-line lg:block lg:h-full lg:max-h-none lg:border-l ${mobileView === 'list' ? 'block' : 'hidden'}`}>
            <StationList stations={records} selectedId={selectedStationId} canShowCurrent={isOfficialSource} onSelect={revealStation} />
          </div>
        </div>
        <div className="border-t border-line px-4 py-3 sm:px-6">
          <MapLegend dimmed={!hasCurrentData} />
        </div>
      </section>

      {hasCurrentData && <Overview summary={summary} dominantPollutant={dominantPollutant} />}

      <footer className="space-y-2 px-1 pt-2 text-xs leading-5 text-faint">
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
