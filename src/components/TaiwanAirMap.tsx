import { Database, ListFilter, MapPinned, Navigation, RotateCw, Wind } from 'lucide-react';
import { useMemo } from 'react';
import type { AqiDataset, AqiStationRecord } from '../lib/aqi';
import { formatHours, formatNumber, getDominantPollutant } from '../lib/format';
import { getTaiwanMapPoint, sortStationsForMap } from '../lib/mapLayout';
import { STATION_SELECTION_GUIDANCE } from '../lib/stationSelection';
import { StatusBadge } from './StatusBadge';

type TaiwanAirMapProps = {
  dataset: AqiDataset;
  selectedCounty: string;
  selectedStation: AqiStationRecord | null;
  onCountyChange: (county: string) => void;
  onStationSelect: (station: AqiStationRecord) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

const pollutantRows: Array<[keyof AqiStationRecord['pollutantValues'], string]> = [
  ['pm25', 'PM2.5'],
  ['pm10', 'PM10'],
  ['o3', 'O3'],
  ['co', 'CO']
];

export function TaiwanAirMap({
  dataset,
  selectedCounty,
  selectedStation,
  onCountyChange,
  onStationSelect,
  onRefresh,
  isRefreshing
}: TaiwanAirMapProps) {
  const { records, summary } = dataset;
  const isOfficialSource = dataset.source.kind === 'official-cache';
  const currentRecords = useMemo(
    () => (isOfficialSource ? records.filter((station) => !station.isStale) : []),
    [isOfficialSource, records]
  );
  const hasCurrentData = currentRecords.length > 0;
  const counties = useMemo(
    () => ['all', ...new Set(records.map((station) => station.county).sort((a, b) => a.localeCompare(b, 'zh-Hant')))],
    [records]
  );
  const countyStations = useMemo(
    () =>
      selectedCounty === 'all'
        ? []
        : records
            .filter((station) => station.county === selectedCounty)
            .sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-Hant')),
    [records, selectedCounty]
  );
  const visibleStations = useMemo(() => {
    const candidates = currentRecords.length > 0 ? currentRecords : records;
    if (selectedCounty !== 'all') {
      return sortStationsForMap(candidates.filter((station) => station.county === selectedCounty));
    }

    const representativeByCounty = new Map<string, AqiStationRecord>();
    for (const station of candidates) {
      const current = representativeByCounty.get(station.county);
      if (!current || station.aqi > current.aqi) representativeByCounty.set(station.county, station);
    }
    return sortStationsForMap([...representativeByCounty.values()].sort((a, b) => b.aqi - a.aqi).slice(0, 12));
  }, [currentRecords, records, selectedCounty]);
  const activeStation = selectedStation;
  const activeStationCanInformNow = Boolean(activeStation && isOfficialSource && !activeStation.isStale);
  const dominantPollutant = useMemo(() => getDominantPollutant(currentRecords), [currentRecords]);
  const sourceLabel =
    dataset.source.kind === 'official-cache' ? '環境部快取' : dataset.source.kind === 'sample' ? '範例資料' : '備援資料';
  const dataQualityNote =
    dataset.source.kind === 'official-cache'
      ? '資料來自環境部 AQX_P_432 的定時快取；只對 3 小時內且時間有效的測站顯示現在建議。'
      : '目前為展示用範例或備援資料；本站不會把它當成現在狀況或提供活動結論。';
  const topRiskLabel = activeStation
    ? !isOfficialSource
      ? `${activeStation.stationName}｜展示資料，暫停現在建議`
      : activeStation.isStale
        ? `${activeStation.stationName}｜資料已過期，暫停現在建議`
        : `${activeStation.stationName}｜AQI ${formatNumber(activeStation.aqi)}｜${activeStation.category.advice.short}｜${formatHours(activeStation.hoursSinceUpdate)}`
    : '先選縣市與測站，查看所在地的 AQI 與資料時間';

  return (
    <section className="relative min-h-[760px] overflow-hidden rounded-lg border border-slate-800 bg-[#071118] text-white shadow-dashboard">
      <div className="absolute inset-0 air-map-grid opacity-75" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.58)_35%,rgba(2,6,23,0.12)_58%,rgba(2,6,23,0.86)_100%)]" />

      <div className="relative z-10 grid min-h-[760px] gap-5 p-4 lg:grid-cols-[330px_minmax(460px,1fr)_350px] lg:p-5">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-1 rounded-lg border border-white/15 bg-slate-950/60 p-4 shadow-dashboard backdrop-blur-xl lg:order-none">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-50 sm:text-sm">
                <Wind aria-hidden="true" className="h-4 w-4" />
                台灣 AQI 速查
              </div>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">{sourceLabel}</span>
            </div>
            <div className="mt-4 rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm font-black leading-5 text-orange-50 lg:hidden">
              {topRiskLabel}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-white lg:text-5xl">現在適合在戶外活動嗎？</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:hidden">選縣市與測站，先確認所在地 AQI 和資料時間。</p>
            <p className="mt-3 hidden text-sm leading-6 text-slate-300 sm:block">
              不需登入或提供定位。選擇所在地測站，查看官方 AQI、資料時間，以及一般民眾與敏感族群的活動提醒。
            </p>
            <p className="mt-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs leading-5 text-slate-300">
              {dataQualityNote}
            </p>

            <label className="mt-5 block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ListFilter aria-hidden="true" className="h-3.5 w-3.5" />
                1. 選擇縣市
              </span>
              <select
                name="primary-county"
                autoComplete="off"
                value={selectedCounty}
                onChange={(event) => onCountyChange(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {counties.map((county) => (
                  <option key={county} value={county} className="bg-slate-950 text-white">
                    {county === 'all' ? '請選擇縣市' : county}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                <MapPinned aria-hidden="true" className="h-3.5 w-3.5" />
                2. 選擇測站
              </span>
              <select
                name="primary-station"
                autoComplete="off"
                value={selectedStation?.siteId ?? ''}
                onChange={(event) => {
                  const station = countyStations.find((item) => item.siteId === event.target.value);
                  if (station) onStationSelect(station);
                }}
                disabled={selectedCounty === 'all' || countyStations.length === 0}
                className="h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <option value="" className="bg-slate-950 text-white">
                  {selectedCounty === 'all' ? '請先選縣市' : countyStations.length > 0 ? '請選擇測站' : '此縣市沒有測站'}
                </option>
                {countyStations.map((station) => (
                  <option key={station.siteId} value={station.siteId} className="bg-slate-950 text-white">
                    {station.stationName}{station.isStale ? '（資料過期）' : ''}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-xs leading-5 text-slate-300">
              <span className="font-bold text-white">選站提醒：</span>
              {STATION_SELECTION_GUIDANCE.text}{' '}
              <a
                href={STATION_SELECTION_GUIDANCE.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-teal-200 underline underline-offset-2 hover:text-teal-100"
              >
                了解環境部測站類型
              </a>
            </p>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-200/30 bg-cyan-200/10 text-sm font-bold text-cyan-50 transition hover:bg-cyan-200/20 disabled:cursor-wait disabled:opacity-60"
            >
              <RotateCw aria-hidden="true" className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              {isRefreshing ? '正在更新…' : '重新讀取最新快取'}
            </button>
          </div>

          <div className="order-4 grid gap-3 sm:grid-cols-2 lg:order-none lg:grid-cols-1">
            <RadarStat label="目前最高 AQI" value={hasCurrentData ? formatNumber(summary.worstStation?.aqi) : '--'} detail={hasCurrentData ? summary.worstStation?.stationName ?? '沒有可用資料' : '等待可信且新鮮的官方快取'} tone="danger" />
            <RadarStat label="需留意測站" value={hasCurrentData ? `${summary.unhealthyStationCount}` : '--'} detail={hasCurrentData ? `${summary.currentStationCount} 個目前可用測站中` : '等待可信且新鮮的官方快取'} tone="warning" />
            <RadarStat label="良好／普通" value={hasCurrentData ? `${summary.healthyStationCount}` : '--'} detail={hasCurrentData ? 'AQI 0–100；普通仍非所有人無風險' : '等待可信且新鮮的官方快取'} tone="safe" />
            <RadarStat label="主要污染物" value={hasCurrentData ? dominantPollutant : '--'} detail={hasCurrentData ? '僅依目前可用測站統計' : '等待可信且新鮮的官方快取'} tone="neutral" />
          </div>
        </div>

        <div className="relative order-3 min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/35 shadow-dashboard backdrop-blur-sm lg:order-none">
          <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
            {selectedCounty === 'all' ? '全台測站節錄（最多 12 站）' : `${selectedCounty} 測站`} · {visibleStations.length} 站 · 示意分布
          </div>
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 shadow-dashboard backdrop-blur md:hidden">
            <span className="h-2.5 w-2.5 rounded-full bg-[#009866]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFDE33]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF9933]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#CC0033]" />
            AQI
          </div>

          <svg className="absolute left-1/2 top-1/2 h-[90%] max-h-[680px] w-[74%] max-w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-95" viewBox="0 0 380 620" role="img" aria-label="台灣測站示意分布，非精密地理資訊地圖">
            <path
              d="M226 26C272 62 284 123 272 177C262 222 298 255 283 307C267 362 225 393 213 451C203 501 171 566 134 593C121 602 105 590 111 574C125 537 107 493 103 455C96 394 134 355 116 293C99 233 94 176 130 124C154 89 173 43 206 26C212 23 219 22 226 26Z"
              fill="rgba(20,184,166,0.2)"
              stroke="rgba(125,211,252,0.65)"
              strokeWidth="5"
            />
            <path
              d="M203 58C226 100 215 154 232 198C252 251 235 294 220 342C205 392 184 432 174 481C167 514 151 550 130 575"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="10 14"
              strokeWidth="3"
            />
            <path
              d="M119 316C151 306 190 310 228 332M131 209C167 204 205 213 246 235M118 418C148 407 179 407 207 423"
              fill="none"
              stroke="rgba(20,184,166,0.22)"
              strokeWidth="3"
            />
          </svg>

          <div className="absolute inset-0">
            {visibleStations.map((station) => {
              const point = getTaiwanMapPoint(station);
              if (!point) return null;
              const isSelected = activeStation?.siteId === station.siteId;
              return (
                <button
                  key={station.siteId}
                  type="button"
                  aria-label={`查看 ${station.county}${station.stationName}，AQI ${station.aqi}${!isOfficialSource ? '，展示資料' : station.isStale ? '，資料已過期' : ''}`}
                  onClick={() => onStationSelect(station)}
                  className={`air-map-marker group absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-slate-950/75 text-[10px] font-black tabular-nums text-white shadow-lg transition hover:z-30 hover:scale-125 focus:z-30 ${
                    station.aqi > 100 && isOfficialSource && !station.isStale ? 'air-map-marker-risk' : ''
                  } ${!isOfficialSource || station.isStale ? 'opacity-50 grayscale' : ''} ${isSelected ? 'z-30 scale-125 ring-4 ring-white/30' : 'z-10'}`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    borderColor: station.category.color,
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.22), 0 0 26px ${station.category.color}66`
                  }}
                >
                  <span>{station.aqi}</span>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden min-w-28 -translate-x-1/2 rounded-md border border-white/15 bg-slate-950/90 px-2 py-1 text-xs font-semibold text-white shadow-dashboard group-hover:block group-focus:block">
                    {station.county} {station.stationName}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 hidden gap-2 rounded-lg border border-white/15 bg-slate-950/70 p-3 text-xs text-slate-200 shadow-dashboard backdrop-blur md:left-4 md:right-auto md:grid md:w-64">
            <div className="font-bold text-white">AQI 圖例</div>
            <LegendItem color="#009866" label="良好" range="0-50" />
            <LegendItem color="#FFDE33" label="普通" range="51-100" />
            <LegendItem color="#FF9933" label="敏感族群不健康" range="101-150" />
            <LegendItem color="#CC0033" label="不健康以上" range="151+" />
          </div>
        </div>

        <aside className="order-2 rounded-lg border border-white/15 bg-slate-950/65 p-4 shadow-dashboard backdrop-blur-xl lg:order-none">
          {activeStation ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    <MapPinned aria-hidden="true" className="h-3.5 w-3.5" />
                    已選取測站
                  </div>
                  <h2 className="mt-4 text-3xl font-black text-white">{activeStation.stationName}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {activeStation.county} · {activeStation.publishTime || '發布時間未知'}
                    {activeStation.hoursSinceUpdate !== null ? ` · ${formatHours(activeStation.hoursSinceUpdate)}` : ''}
                  </p>
                </div>
                <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-white text-slate-950" style={{ borderColor: activeStation.category.color }}>
                  <span className="text-center text-[10px] font-bold leading-3 text-slate-500">{activeStationCanInformNow ? 'AQI' : '快取 AQI'}</span>
                  <span className="text-3xl font-black tabular-nums">{activeStation.aqi}</span>
                </div>
              </div>

              <div className="mt-5">
                {!activeStationCanInformNow ? (
                  <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm font-bold text-amber-100">
                    {isOfficialSource ? '資料已過期 · 不代表現在狀況' : '展示資料 · 不代表現在狀況'}
                  </span>
                ) : (
                  <StatusBadge category={activeStation.category} />
                )}
              </div>

              {!activeStationCanInformNow ? (
                <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-amber-50">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Navigation aria-hidden="true" className="h-4 w-4" />
                    現在建議已暫停
                  </div>
                  <p className="mt-2 text-sm leading-6">
                    {isOfficialSource
                      ? '這筆資料超過 3 小時、缺少有效時間，或時間戳異常。下方只保留快取內容供查核，請改看環境部即時監測。'
                      : '目前是範例或備援資料。下方只保留內容供介面查核，請改看環境部即時監測。'}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                    <Navigation aria-hidden="true" className="h-4 w-4" />
                    目前活動提醒
                  </div>
                  <p className="mt-2 text-xl font-black text-white">{activeStation.category.advice.short}</p>
                  <p className="mt-3 text-xs font-bold text-slate-200">一般民眾</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{activeStation.category.advice.general}</p>
                  <p className="mt-3 text-xs font-bold text-slate-200">敏感族群</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{activeStation.category.advice.sensitive}</p>
                </div>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-3" aria-label={activeStationCanInformNow ? '目前污染物數值' : '非即時快取污染物數值'}>
                {pollutantRows.map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <dt className="text-xs font-semibold text-slate-400">{label}</dt>
                    <dd className="mt-1 text-2xl font-black tabular-nums text-white">{formatNumber(activeStation.pollutantValues[key], key === 'co' ? 2 : 0)}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto pt-5">
                <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-sm leading-6 text-slate-300">
                  <span className="font-bold text-white">更新狀態：</span>
                  {!isOfficialSource
                    ? '展示用途，不提供現在結論'
                    : activeStation.hasFutureTimestamp
                    ? '時間戳異常，晚於目前時間'
                    : activeStation.isStale
                    ? `不可用，${formatHours(activeStation.hoursSinceUpdate)}`
                    : `3 小時內，${formatHours(activeStation.hoursSinceUpdate)}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center text-center text-slate-300">
              <Database aria-hidden="true" className="h-10 w-10" />
              <p className="mt-3 font-bold">先選擇你的所在地測站</p>
              <p className="mt-2 max-w-xs text-sm leading-6">
                {records.length === 0
                  ? '目前沒有可顯示的測站；可能是快取尚未產生或資料格式異常。'
                  : selectedCounty === 'all'
                    ? '先在左側選擇縣市，再選擇你想查詢的測站。本站不會要求定位權限。'
                    : `已選擇 ${selectedCounty}，請再選一個測站查看資料時間與活動提醒。`}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

type RadarStatProps = {
  label: string;
  value: string;
  detail: string;
  tone: 'danger' | 'warning' | 'safe' | 'neutral';
};

const radarStatTone = {
  danger: 'border-red-300/30 bg-red-400/10 text-red-100',
  warning: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  safe: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  neutral: 'border-slate-300/20 bg-white/10 text-slate-100'
};

function RadarStat({ label, value, detail, tone }: RadarStatProps) {
  return (
    <article className={`rounded-lg border p-4 shadow-soft backdrop-blur ${radarStatTone[tone]}`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-300">{detail}</p>
    </article>
  );
}

type LegendItemProps = {
  color: string;
  label: string;
  range: string;
};

function LegendItem({ color, label, range }: LegendItemProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="text-slate-400">{range}</span>
    </div>
  );
}
