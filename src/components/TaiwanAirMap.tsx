import { Crosshair, Database, Flame, Layers, ListFilter, MapPinned, Navigation, RotateCw, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { AqiDataset, AqiStationRecord } from '../lib/aqi';
import { formatHours, formatNumber, getDominantPollutant } from '../lib/format';
import { getTaiwanMapPoint, sortStationsForMap } from '../lib/mapLayout';
import { StatusBadge } from './StatusBadge';

type TaiwanAirMapProps = {
  dataset: AqiDataset;
  selectedCounty: string;
  selectedStation: AqiStationRecord | null;
  onCountyChange: (county: string) => void;
  onStationSelect: (station: AqiStationRecord) => void;
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
  onStationSelect
}: TaiwanAirMapProps) {
  const { records, summary } = dataset;
  const counties = useMemo(
    () => ['all', ...new Set(records.map((station) => station.county).sort((a, b) => a.localeCompare(b, 'zh-Hant')))],
    [records]
  );
  const visibleStations = useMemo(
    () => sortStationsForMap(selectedCounty === 'all' ? records : records.filter((station) => station.county === selectedCounty)),
    [records, selectedCounty]
  );
  const activeStation = selectedStation ?? summary.worstStation ?? records[0] ?? null;
  const dominantPollutant = useMemo(() => getDominantPollutant(records), [records]);
  const highRiskCount = records.filter((station) => station.aqi > 100).length;
  const sourceLabel = dataset.source.kind === 'official-cache' ? '官方快取' : dataset.source.kind === 'sample' ? '範例資料' : '備援資料';
  const dataQualityNote =
    dataset.source.kind === 'official-cache'
      ? '資料來源：環境部 AQX_P_432；每次快取更新後顯示最新發布時間。'
      : '目前為展示用範例/備援資料，不建議作為即時健康決策唯一依據。';
  const topRiskLabel = summary.worstStation
    ? `最高 AQI ${formatNumber(summary.worstStation.aqi)}｜${summary.worstStation.stationName}｜${summary.worstStation.category.advice.short}｜${formatHours(summary.hoursSinceUpdate)}`
    : '目前沒有測站資料｜請查看資料狀態提醒';

  return (
    <section className="relative min-h-[760px] overflow-hidden rounded-lg border border-slate-800 bg-[#071118] text-white shadow-dashboard">
      <div className="absolute inset-0 air-map-grid opacity-75" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.58)_35%,rgba(2,6,23,0.12)_58%,rgba(2,6,23,0.86)_100%)]" />

      <div className="relative z-10 grid min-h-[760px] gap-5 p-4 lg:grid-cols-[330px_minmax(460px,1fr)_350px] lg:p-5">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-1 rounded-lg border border-white/15 bg-slate-950/60 p-4 shadow-dashboard backdrop-blur-xl lg:order-none">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-sm font-semibold text-cyan-50">
                <Wind aria-hidden="true" className="h-4 w-4" />
                Taiwan AQI Monitor
              </div>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">{sourceLabel}</span>
            </div>
            <div className="mt-4 rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm font-black leading-5 text-orange-50 lg:hidden">
              {topRiskLabel}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-white lg:text-5xl">台灣空氣品質雷達</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:hidden">看熱點、選測站、立即判斷戶外活動風險。</p>
            <p className="mt-3 hidden text-sm leading-6 text-slate-300 sm:block">
              以地圖優先呈現全台測站、污染熱點與今日行動建議。點選測站可立即查看污染物與健康提醒。
            </p>
            <p className="mt-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs leading-5 text-slate-300">
              {dataQualityNote}
            </p>

            <label className="mt-5 block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ListFilter aria-hidden="true" className="h-3.5 w-3.5" />
                縣市篩選
              </span>
              <select
                value={selectedCounty}
                onChange={(event) => onCountyChange(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white outline-none transition hover:bg-white/15"
              >
                {counties.map((county) => (
                  <option key={county} value={county} className="bg-slate-950 text-white">
                    {county === 'all' ? '全台灣' : county}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <ToolButton icon={RotateCw} label="更新" />
              <ToolButton icon={Crosshair} label="定位" />
              <ToolButton icon={Flame} label="熱點" active={highRiskCount > 0} />
              <ToolButton icon={Layers} label="圖層" />
            </div>
          </div>

          <div className="order-4 grid gap-3 sm:grid-cols-2 lg:order-none lg:grid-cols-1">
            <RadarStat label="最高 AQI" value={formatNumber(summary.worstStation?.aqi)} detail={summary.worstStation?.stationName ?? '無資料'} tone="danger" />
            <RadarStat label="不健康測站" value={`${summary.unhealthyStationCount}`} detail={`全台 ${summary.stationCount} 站中需留意`} tone="warning" />
            <RadarStat label="安全測站" value={`${summary.healthyStationCount}`} detail="AQI 100 以下可優先參考" tone="safe" />
            <RadarStat label="主要污染物" value={dominantPollutant} detail="依目前測站主要污染物統計" tone="neutral" />
          </div>
        </div>

        <div className="relative order-2 min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/35 shadow-dashboard backdrop-blur-sm lg:order-none">
          <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
            {selectedCounty === 'all' ? '全台測站圖層' : `${selectedCounty} 測站圖層`} · {visibleStations.length} 站
          </div>
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 shadow-dashboard backdrop-blur md:hidden">
            <span className="h-2.5 w-2.5 rounded-full bg-[#009866]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFDE33]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF9933]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#CC0033]" />
            AQI
          </div>

          <svg className="absolute left-1/2 top-1/2 h-[90%] max-h-[680px] w-[74%] max-w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-95" viewBox="0 0 380 620" role="img" aria-label="台灣空氣品質地圖">
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
                  aria-label={`查看 ${station.county}${station.stationName}，AQI ${station.aqi}`}
                  onClick={() => onStationSelect(station)}
                  className={`air-map-marker group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-slate-950/75 text-[10px] font-black text-white shadow-lg transition hover:z-30 hover:scale-125 focus:z-30 ${
                    station.aqi > 100 ? 'air-map-marker-risk h-11 w-11' : 'h-9 w-9'
                  } ${isSelected ? 'z-30 scale-125 ring-4 ring-white/30' : 'z-10'}`}
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

        <aside className="order-3 rounded-lg border border-white/15 bg-slate-950/65 p-4 shadow-dashboard backdrop-blur-xl lg:order-none">
          {activeStation ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    <MapPinned aria-hidden="true" className="h-3.5 w-3.5" />
                    已選取測站
                  </div>
                  <h2 className="mt-4 text-3xl font-black text-white">{activeStation.stationName}</h2>
                  <p className="mt-1 text-sm text-slate-300">{activeStation.county} · {activeStation.publishTime || '發布時間未知'}</p>
                </div>
                <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-white text-slate-950" style={{ borderColor: activeStation.category.color }}>
                  <span className="text-xs font-bold text-slate-500">AQI</span>
                  <span className="text-3xl font-black">{activeStation.aqi}</span>
                </div>
              </div>

              <div className="mt-5">
                <StatusBadge category={activeStation.category} />
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                  <Navigation aria-hidden="true" className="h-4 w-4" />
                  今日行動建議
                </div>
                <p className="mt-2 text-xl font-black text-white">{activeStation.category.advice.short}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{activeStation.category.advice.general}</p>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                {pollutantRows.map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <dt className="text-xs font-semibold text-slate-400">{label}</dt>
                    <dd className="mt-1 text-2xl font-black text-white">{formatNumber(activeStation.pollutantValues[key], key === 'co' ? 2 : 0)}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto pt-5">
                <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-sm leading-6 text-slate-300">
                  <span className="font-bold text-white">更新狀態：</span>
                  {summary.isStale ? `可能過期，約 ${formatHours(summary.hoursSinceUpdate)}` : `時效正常，約 ${formatHours(summary.hoursSinceUpdate)}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center text-center text-slate-300">
              <Database aria-hidden="true" className="h-10 w-10" />
              <p className="mt-3 font-bold">沒有可顯示的測站</p>
              <p className="mt-2 max-w-xs text-sm leading-6">
                目前篩選為 {selectedCounty === 'all' ? '全台灣' : selectedCounty}，可用測站為 0 站；可能是快取尚未產生或資料格式異常。
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

type ToolButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

function ToolButton({ icon: Icon, label, active = false }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-bold leading-none transition ${
        active ? 'border-orange-300 bg-orange-400 text-slate-950' : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/15'
      }`}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </button>
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
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
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
