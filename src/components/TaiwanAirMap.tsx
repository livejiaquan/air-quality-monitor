import { Database, ListFilter, MapPinned, RotateCw, Wind } from 'lucide-react';
import { useMemo } from 'react';
import { AQI_CATEGORIES, type AqiDataset, type AqiStationRecord } from '../lib/aqi';
import { formatHours, formatPublishTime } from '../lib/format';
import { getTaiwanMapPoint, getVisibleMapStations } from '../lib/mapLayout';
import { getObservationPresentation } from '../lib/observationPresentation';
import { STATION_SELECTION_GUIDANCE } from '../lib/stationSelection';
import { StationDetail } from './StationDetail';

type TaiwanAirMapProps = {
  dataset: AqiDataset;
  selectedCounty: string;
  selectedStation: AqiStationRecord | null;
  onCountyChange: (county: string) => void;
  onStationSelect: (station: AqiStationRecord) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};
export function TaiwanAirMap({ dataset, selectedCounty, selectedStation, onCountyChange, onStationSelect, onRefresh, isRefreshing }: TaiwanAirMapProps) {
  const { records, summary, source } = dataset;
  const official = source.kind === 'official-cache';
  const counties = useMemo(() => ['all', ...new Set(records.map((station) => station.county).sort((a, b) => a.localeCompare(b, 'zh-Hant')))], [records]);
  const countyStations = useMemo(() => selectedCounty === 'all' ? [] : records.filter((station) => station.county === selectedCounty).sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-Hant')), [records, selectedCounty]);
  const visible = useMemo(() => getVisibleMapStations(records, source.kind, selectedCounty), [records, source.kind, selectedCounty]);
  const visibleCurrentCount = visible.filter((station) => getObservationPresentation(station, source.kind).isCurrent).length;
  const visibleNoncurrentCount = visible.length - visibleCurrentCount;
  const newestVisible = [...visible]
    .filter((station) => station.publishTimeISO && !station.hasFutureTimestamp)
    .sort((a, b) => Date.parse(b.publishTimeISO!) - Date.parse(a.publishTimeISO!))[0];
  const sourceLabel = official ? '官方快取' : source.kind === 'sample' ? '範例資料' : '備援資料';
  const freshness = !official
    ? '非即時資料 · 不提供現在結論'
    : summary.currentStationCount === 0
      ? '沒有可用的當期資料 · 現在結論已暫停'
      : `${summary.currentStationCount} / ${records.length} 站目前可用 · 最新 ${formatHours(summary.hoursSinceUpdate)}`;
  const allCurrent = official && records.length > 0 && summary.staleStationCount === 0;

  return (
    <section aria-labelledby="aqi-heading" className="overflow-hidden rounded-[20px] border border-[#c9d7d1] bg-white/75 shadow-dashboard">
      <div className="border-b border-[#dce6e1] bg-[linear-gradient(110deg,rgba(15,118,110,.11),rgba(34,211,238,.09),rgba(255,255,255,.55))] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#9ac9c2] bg-white/70 px-3 py-1.5 text-sm font-bold text-[#0f625c]"><Wind aria-hidden="true" className="h-4 w-4" />所在地空氣快查</span>
          <span className={`rounded-full border px-3 py-1.5 text-sm font-bold ${allCurrent ? 'border-[#9ac9c2] bg-[#e6f5f1] text-[#0f625c]' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>{sourceLabel} · {freshness}</span>
        </div>
        <h1 id="aqi-heading" className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-[#10211c] sm:text-4xl">先確認你所在地的空氣品質</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#426058]">選擇縣市與測站，查看 AQI、主要污染物、發布時間和資料是否足以用於現在的活動判斷。</p>
      </div>
      <div className="grid items-start gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-[#c9d7d1] bg-[#f8fbf9] p-4">
            <p className="text-sm font-black tracking-[.12em] text-[#52706a]">選擇所在地</p>
            <label className="mt-4 block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#24473e]"><ListFilter aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0f766e]" />1. 縣市</span>
              <select name="primary-county" value={selectedCounty} onChange={(event) => onCountyChange(event.target.value)} className="h-11 w-full rounded-xl border border-[#b8cbc4] bg-white px-3 text-base font-semibold text-[#10211c]">
                {counties.map((county) => <option key={county} value={county}>{county === 'all' ? '請選擇縣市' : county}</option>)}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#24473e]"><MapPinned aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0f766e]" />2. 測站</span>
              <select name="primary-station" value={selectedStation?.siteId ?? ''} onChange={(event) => { const station = countyStations.find((item) => item.siteId === event.target.value); if (station) onStationSelect(station); }} disabled={selectedCounty === 'all' || countyStations.length === 0} className="h-11 w-full rounded-xl border border-[#b8cbc4] bg-white px-3 text-base font-semibold text-[#10211c] disabled:cursor-not-allowed disabled:bg-[#edf1ef] disabled:text-[#6b7d76]">
                <option value="">{selectedCounty === 'all' ? '請先選縣市' : countyStations.length ? '請選擇測站' : '此縣市沒有測站'}</option>
                {countyStations.map((station) => {
                  const observation = getObservationPresentation(station, source.kind);
                  return <option key={station.siteId} value={station.siteId}>{station.stationName}{observation.isCurrent ? '' : `（${observation.label}）`}</option>;
                })}
              </select>
            </label>
            <button type="button" onClick={onRefresh} disabled={isRefreshing} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 text-sm font-bold text-white transition hover:bg-[#0b625b] disabled:cursor-wait disabled:bg-[#79a9a2]"><RotateCw aria-hidden="true" className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />{isRefreshing ? '正在更新…' : '重新讀取快取'}</button>
          </div>
          <p className="rounded-xl border border-[#d7e2de] bg-white p-3 text-sm leading-5 text-[#52706a]"><strong className="text-[#24473e]">選站提醒：</strong>{STATION_SELECTION_GUIDANCE.text} <a className="font-bold text-[#0f766e] underline underline-offset-2" href={STATION_SELECTION_GUIDANCE.sourceUrl} target="_blank" rel="noreferrer">了解測站類型</a></p>
        </div>
        <aside id="selected-station" tabIndex={-1} aria-label="所在地測站結果" className="min-w-0 scroll-mt-6 rounded-2xl border border-[#c9d7d1] bg-white p-5" aria-live="polite">
          {selectedStation ? <StationDetail station={selectedStation} sourceKind={source.kind} /> : <div className="flex min-h-[220px] flex-col items-center justify-center text-center"><Database aria-hidden="true" className="h-9 w-9 text-[#0f766e]" /><h2 className="mt-4 text-lg font-black text-[#10211c]">選擇所在地測站</h2><p className="mt-2 max-w-xs text-sm leading-6 text-[#52706a]">{records.length === 0 ? '目前沒有可顯示的測站。' : selectedCounty === 'all' ? '先選擇縣市，再選擇測站。本站不要求定位權限。' : `已選擇 ${selectedCounty}，請選擇一個測站。`}</p></div>}
        </aside>
        <div className="overflow-hidden rounded-2xl border border-[#c9d7d1] bg-[#f4faf8]" role="group" aria-label="台灣測站示意分布" aria-describedby="map-data-status">
          <div className="border-b border-[#d7e2de] bg-white/90 px-4 py-3">
            <p className="text-sm font-bold text-[#36544c]">{selectedCounty === 'all' ? '全台代表測站' : `${selectedCounty} 測站`} · 圖中 {visible.length} 站 · 示意分布</p>
            <p id="map-data-status" className="mt-2 text-sm font-semibold leading-5 text-slate-700">
              {visible.length === 0 ? '沒有可標示的測站位置；請從選單查看可用資料。' : visibleCurrentCount === 0 ? '圖中沒有當期資料。灰色文字標記只表示測站位置，不代表現在空氣品質。' : `圖中 ${visibleCurrentCount} 站目前可用${visibleNoncurrentCount > 0 ? `，${visibleNoncurrentCount} 站非當期資料` : ''}；彩色數字只用於當期官方 AQI。`}
            </p>
            {visible.length > 0 && <p className="mt-1 text-sm leading-5 text-[#52706a]">圖中最新發布：{formatPublishTime(newestVisible?.publishTimeISO)}（台灣時間）；各站時間請點選查看。</p>}
          </div>
          <div className="air-map-grid relative min-h-[350px]">
            <svg className="absolute left-1/2 top-1/2 h-[86%] w-[68%] -translate-x-1/2 -translate-y-1/2" viewBox="0 0 380 620" role="img" aria-label="台灣輪廓示意，非精密地圖">
              <path d="M226 26C272 62 284 123 272 177C262 222 298 255 283 307C267 362 225 393 213 451C203 501 171 566 134 593C121 602 105 590 111 574C125 537 107 493 103 455C96 394 134 355 116 293C99 233 94 176 130 124C154 89 173 43 206 26C212 23 219 22 226 26Z" fill="rgba(15,118,110,.13)" stroke="rgba(15,118,110,.48)" strokeWidth="5" />
              <path d="M203 58C226 100 215 154 232 198C252 251 235 294 220 342C205 392 184 432 174 481C167 514 151 550 130 575" fill="none" stroke="rgba(15,118,110,.24)" strokeDasharray="10 14" strokeWidth="3" />
            </svg>
            {visible.map((station) => {
              const point = getTaiwanMapPoint(station)!;
              const observation = getObservationPresentation(station, source.kind);
              const picked = station.siteId === selectedStation?.siteId;
              return (
                <button key={station.siteId} type="button" aria-label={`查看 ${observation.description}`} aria-pressed={picked} title={observation.description} onClick={() => onStationSelect(station)} className={`air-map-marker group absolute z-[2] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-white text-sm font-black text-[#10211c] shadow-soft transition hover:z-20 hover:scale-110 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-slate-700 motion-reduce:transition-none motion-reduce:hover:scale-100 ${picked ? 'ring-4 ring-slate-500/25' : ''} ${observation.isCurrent ? '' : 'border-dashed'}`} style={{ left: `${point.x}%`, top: `${point.y}%`, borderColor: observation.borderColor }}>
                  <span>{observation.markerLabel}</span>
                  <span aria-hidden="true" className="pointer-events-none absolute top-full mt-2 hidden w-44 rounded-lg bg-[#10211c] px-2 py-1 text-sm font-semibold text-white group-hover:block group-focus:block">{station.county} {station.stationName}<br />{observation.label} · {observation.valueLabel} {station.aqi}<br />{observation.publishedAt}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-[#d7e2de] bg-white/90 px-4 py-3 text-sm leading-6 text-[#52706a]" aria-label="地圖圖例">
            {visibleCurrentCount > 0 && <>
              <p className="font-bold text-[#36544c]">當期 AQI 級距</p>
              <ul className="mt-2 grid gap-1.5">
                {AQI_CATEGORIES.filter((category) => category.id !== 'unknown').map((category) => <li key={category.id} className="flex items-start gap-2">
                  <i aria-hidden="true" className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span>{category.label} <span className="tabular-nums">{category.min}–{category.max}</span></span>
                </li>)}
              </ul>
            </>}
            <p className={visibleCurrentCount > 0 ? 'mt-3 border-t border-[#d7e2de] pt-3' : ''}>灰色虛線／文字：過期、缺時、時間異常或展示資料，不作現在判斷</p>
          </div>
        </div>

      </div>
    </section>
  );
}
