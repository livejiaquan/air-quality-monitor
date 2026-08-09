import { AlertTriangle, CheckCircle2, CloudSun, Factory, MapPinned, RadioTower, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AqiDistributionChart } from './components/AqiDistributionChart';
import { CountyRanking } from './components/CountyRanking';
import { MetricCard } from './components/MetricCard';
import { ErrorPanel, LoadingDashboard } from './components/StatePanels';
import { StationExplorer } from './components/StationExplorer';
import { TaiwanAirMap } from './components/TaiwanAirMap';
import type { AqiDataset, AqiStationRecord } from './lib/aqi';
import { loadAqiDataset } from './lib/data';
import { formatNumber, getDominantPollutant } from './lib/format';

type LoadState =
  | { status: 'loading'; dataset: null; error: null }
  | { status: 'success'; dataset: AqiDataset; error: null }
  | { status: 'error'; dataset: null; error: string };

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', dataset: null, error: null });

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

  const reload = useCallback(async () => {
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

  if (loadState.status === 'loading') return <LoadingDashboard />;
  if (loadState.status === 'error') return <ErrorPanel message={loadState.error} onRetry={reload} />;

  return <Dashboard dataset={loadState.dataset} />;
}

type DashboardProps = {
  dataset: AqiDataset;
};

function Dashboard({ dataset }: DashboardProps) {
  const { summary, records, warnings } = dataset;
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedStation, setSelectedStation] = useState<AqiStationRecord | null>(
    () => summary.worstStation ?? records[0] ?? null
  );
  const dominantPollutant = useMemo(() => getDominantPollutant(records), [records]);
  const worstCounty = summary.counties[0];
  const safeCountyCount = summary.counties.filter((county) => county.maxAqi <= 100).length;

  const handleCountyChange = useCallback(
    (county: string) => {
      setSelectedCounty(county);
      const countyStations = county === 'all' ? records : records.filter((station) => station.county === county);
      const nextStation =
        countyStations.find((station) => station.siteId === summary.worstStation?.siteId) ??
        [...countyStations].sort((a, b) => b.aqi - a.aqi)[0] ??
        null;
      setSelectedStation(nextStation);
    },
    [records, summary.worstStation?.siteId]
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_34%,#eef2f7_100%)] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <TaiwanAirMap
          dataset={dataset}
          selectedCounty={selectedCounty}
          selectedStation={selectedStation}
          onCountyChange={handleCountyChange}
          onStationSelect={setSelectedStation}
        />

        {(summary.isStale || warnings.length > 0 || records.length === 0) && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-sm font-black">資料狀態提醒</h2>
                <div className="mt-1 space-y-1 text-sm leading-6">
                  {summary.isStale ? <p>最新發布時間距今已超過 3 小時，請將目前數值視為趨勢參考。</p> : null}
                  {records.length === 0 ? <p>目前沒有可顯示的測站資料，可能是快取尚未產生或資料格式異常。</p> : null}
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="監測測站"
            value={`${summary.stationCount}`}
            detail="已納入目前快取中的有效 AQI 測站"
            icon={RadioTower}
            tone="teal"
          />
          <MetricCard
            title="安全測站"
            value={`${summary.healthyStationCount}`}
            detail={`AQI 100 以下，涵蓋 ${safeCountyCount} 個縣市`}
            icon={ShieldCheck}
            tone="green"
          />
          <MetricCard
            title="不健康測站"
            value={`${summary.unhealthyStationCount}`}
            detail="AQI 大於 100，需要提高活動安排警覺"
            icon={AlertTriangle}
            tone={summary.unhealthyStationCount > 0 ? 'red' : 'green'}
          />
          <MetricCard
            title="最差縣市"
            value={worstCounty?.county ?? '--'}
            detail={worstCounty ? `${worstCounty.maxStationName} AQI ${worstCounty.maxAqi}` : '目前沒有縣市資料'}
            icon={MapPinned}
            tone="amber"
          />
          <MetricCard
            title="主要污染物"
            value={dominantPollutant}
            detail="依測站主要污染物出現次數統計"
            icon={Factory}
            tone="slate"
          />
        </section>

        <section className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <AqiDistributionChart summary={summary} />
          <CountyRanking summary={summary} />
        </section>

        <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Safe Areas</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">目前較適合戶外活動的測站</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              AQI 100 以下
            </div>
          </div>
          {summary.safestStations.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              目前沒有 AQI 100 以下的測站，建議減少戶外活動並關注官方資訊。
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

        <StationExplorer stations={records} />

        <footer className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-black text-slate-950">
                <CloudSun aria-hidden="true" className="h-5 w-5 text-teal-700" />
                台灣空氣品質儀表板
              </div>
              <p className="mt-2 max-w-3xl">
                資料來源為環境部環境資料開放平臺 `AQX_P_432` 空氣品質指標資料。健康建議依官方 AQI 分級整理，實際決策仍應以環境部公告與所在地即時資訊為準。
              </p>
            </div>
            <a
              href="https://data.moenv.gov.tw/dataset/detail/AQX_P_432"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              官方資料集
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
