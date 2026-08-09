import { AlertTriangle, CheckCircle2, CloudSun, Factory, MapPinned, RadioTower, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AqiDistributionChart } from './components/AqiDistributionChart';
import { CountyRanking } from './components/CountyRanking';
import { MetricCard } from './components/MetricCard';
import { ErrorPanel, LoadingDashboard } from './components/StatePanels';
import { StationExplorer } from './components/StationExplorer';
import { TaiwanAirMap } from './components/TaiwanAirMap';
import { recomputeAqiDatasetFreshness, type AqiDataset, type AqiStationRecord } from './lib/aqi';
import { loadAqiDataset } from './lib/data';
import { formatNumber, getDominantPollutant } from './lib/format';

type LoadState =
  | { status: 'loading'; dataset: null; error: null }
  | { status: 'success'; dataset: AqiDataset; error: null }
  | { status: 'error'; dataset: null; error: string };

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', dataset: null, error: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

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

  if (loadState.status === 'loading') return <LoadingDashboard />;
  if (loadState.status === 'error') return <ErrorPanel onRetry={retryInitialLoad} />;

  return (
    <Dashboard
      dataset={loadState.dataset}
      isRefreshing={isRefreshing}
      refreshError={refreshError}
      onRefresh={refresh}
    />
  );
}

type DashboardProps = {
  dataset: AqiDataset;
  isRefreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
};

function Dashboard({ dataset, isRefreshing, refreshError, onRefresh }: DashboardProps) {
  const { summary, records, warnings } = dataset;
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
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
  const highestCounty = isOfficialSource ? summary.counties[0] : undefined;
  const lowerAqiCountyCount = summary.counties.filter((county) => county.maxAqi <= 100).length;
  const currentStationCount = isOfficialSource ? summary.currentStationCount : 0;
  const hasCurrentData = currentStationCount > 0;
  const statusMessages = useMemo(() => {
    const messages: string[] = [];

    if (dataset.source.kind !== 'official-cache') {
      messages.push('目前是範例或備援資料，只供介面展示；本站不會用這些資料提供現在的健康或活動結論。');
    }
    if (records.length === 0) {
      messages.push('目前沒有可顯示的測站資料，可能是快取尚未產生或資料格式異常。');
    } else if (isOfficialSource && !hasCurrentData) {
      messages.push('目前沒有 3 小時內的有效測站資料；現在排行與活動建議已暫停。');
    } else if (isOfficialSource && summary.staleStationCount > 0) {
      messages.push(`${summary.staleStationCount} 個測站資料過期或時間無效，已排除於目前排行與活動建議。`);
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

  const handleCountyChange = useCallback((county: string) => {
    setSelectedCounty(county);
    setSelectedStationId(null);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-bold text-slate-950 shadow-dashboard focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        跳到主要內容
      </a>
      <main
        id="main-content"
        className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_34%,#eef2f7_100%)] px-4 py-5 text-slate-950 sm:px-6 lg:px-8"
      >
      <div className="mx-auto max-w-7xl space-y-6">
        <TaiwanAirMap
          dataset={dataset}
          selectedCounty={selectedCounty}
          selectedStation={selectedStation}
          onCountyChange={handleCountyChange}
          onStationSelect={(station) => setSelectedStationId(station.siteId)}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {statusMessages.length > 0 && (
          <section
            role="status"
            aria-live="polite"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-soft"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-sm font-black">資料狀態提醒</h2>
                <div className="mt-1 space-y-1 text-sm leading-6">
                  {statusMessages.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="目前可用測站"
            value={`${currentStationCount} / ${summary.stationCount}`}
            detail="3 小時內且時間有效／快取中的測站"
            icon={RadioTower}
            tone="teal"
          />
          <MetricCard
            title="良好／普通測站"
            value={hasCurrentData ? `${summary.healthyStationCount}` : '--'}
            detail={hasCurrentData ? `AQI 100 以下，涵蓋 ${lowerAqiCountyCount} 個縣市；高度敏感者仍需留意` : '等待可信且新鮮的官方快取'}
            icon={ShieldCheck}
            tone="green"
          />
          <MetricCard
            title="需留意測站"
            value={hasCurrentData ? `${summary.unhealthyStationCount}` : '--'}
            detail={hasCurrentData ? 'AQI 大於 100；敏感族群應優先調整活動' : '等待可信且新鮮的官方快取'}
            icon={AlertTriangle}
            tone={hasCurrentData ? (summary.unhealthyStationCount > 0 ? 'red' : 'green') : 'slate'}
          />
          <MetricCard
            title="目前最高縣市"
            value={highestCounty?.county ?? '--'}
            detail={highestCounty ? `${highestCounty.maxStationName} AQI ${highestCounty.maxAqi}` : '等待可信且新鮮的官方快取'}
            icon={MapPinned}
            tone="amber"
          />
          <MetricCard
            title="主要污染物"
            value={hasCurrentData ? dominantPollutant : '--'}
            detail={hasCurrentData ? '僅依目前可用測站的主要污染物統計' : '等待可信且新鮮的官方快取'}
            icon={Factory}
            tone="slate"
          />
        </section>

        {hasCurrentData ? (
          <>
            <section className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <AqiDistributionChart summary={summary} />
              <CountyRanking summary={summary} />
            </section>

            <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Lower AQI</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">目前 AQI 較低的測站</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  良好／普通（0–100）
                </div>
              </div>
              {summary.safestStations.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  目前沒有 AQI 100 以下的測站；請依所在地測站與官方健康建議安排活動。
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.safestStations.map((station) => (
                    <article key={station.siteId} className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-emerald-950">{station.stationName}</h3>
                          <p className="mt-1 text-sm text-emerald-700">{station.county}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-emerald-700">AQI</p>
                          <p className="text-2xl font-black text-emerald-950">{formatNumber(station.aqi)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-slate-300 bg-white p-8 text-center shadow-soft">
            <AlertTriangle aria-hidden="true" className="mx-auto h-8 w-8 text-amber-700" />
            <h2 className="mt-3 text-xl font-black text-slate-950">現在排行與活動建議已暫停</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              目前沒有足夠新鮮且時間有效的官方測站資料。你仍可查看下方快取內容與資料時間，但請勿把它當作現在狀況。
            </p>
            <a
              href="https://airtw.moenv.gov.tw/"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              前往環境部空氣品質監測網
            </a>
          </section>
        )}

        <StationExplorer stations={records} canShowCurrentAdvice={isOfficialSource} />

        <footer className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-black text-slate-950">
                <CloudSun aria-hidden="true" className="h-5 w-5 text-teal-700" />
                台灣空氣品質儀表板
              </div>
              <p className="mt-2 max-w-3xl">
                資料來源：環境部「
                <a className="font-semibold text-teal-800 underline" href="https://data.moenv.gov.tw/dataset/detail/AQX_P_432" target="_blank" rel="noreferrer">
                  空氣品質指標（AQX_P_432）
                </a>
                」開放資料，依
                <a className="font-semibold text-teal-800 underline" href="https://data.gov.tw/license" target="_blank" rel="noreferrer">
                  政府資料開放授權條款第 1 版
                </a>
                進行再利用。本站非環境部官方網站；即時資料與本站整理的健康提示僅供生活參考。
              </p>
            </div>
            <a
              href="https://airtw.moenv.gov.tw/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              官方即時監測
            </a>
          </div>
        </footer>
      </div>
      </main>
    </>
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
