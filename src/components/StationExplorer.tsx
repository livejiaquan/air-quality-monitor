import { RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AQI_CATEGORIES, type AqiStationRecord, type SourceKind } from '../lib/aqi';
import { getObservationPresentation } from '../lib/observationPresentation';
import { DEFAULT_STATION_FILTERS, filterStations, STATIONS_PER_PAGE, type StationFilters } from '../lib/stationExplorer';
import { StationCard } from './StationCard';

type StationExplorerProps = {
  stations: AqiStationRecord[];
  sourceKind: SourceKind;
  selectedStationId?: string | null;
  onStationSelect?: (station: AqiStationRecord) => void;
};

export function StationExplorer({ stations, sourceKind, selectedStationId, onStationSelect }: StationExplorerProps) {
  const [filters, setFilters] = useState<StationFilters>(DEFAULT_STATION_FILTERS);
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);
  const counties = useMemo(() => [...new Set(stations.map((station) => station.county).sort((a, b) => a.localeCompare(b, 'zh-Hant')))], [stations]);
  const filteredStations = useMemo(() => filterStations(stations, sourceKind, filters), [filters, stations, sourceKind]);
  const visibleStations = filteredStations.slice(0, visibleCount);
  const currentCount = filteredStations.filter((station) => getObservationPresentation(station, sourceKind).isCurrent).length;
  const remainingStationCount = filteredStations.length - visibleStations.length;
  const hasFilters = filters.county !== 'all' || filters.category !== 'all' || filters.availability !== 'all' || filters.query !== '';

  const changeFilter = <Key extends keyof StationFilters>(key: Key, value: StationFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleCount(STATIONS_PER_PAGE);
  };
  const reset = () => {
    setFilters(DEFAULT_STATION_FILTERS);
    setVisibleCount(STATIONS_PER_PAGE);
  };

  return (
    <section aria-labelledby="explorer-heading" className="min-w-0 rounded-2xl border border-[#c9d7d1] bg-white/90 p-4 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.12em] text-teal-700">測站資料庫</p>
          <h2 id="explorer-heading" className="mt-2 text-2xl font-black text-[#10211c]">找測站，再看細節</h2>
          <p id="explorer-help" className="mt-2 text-sm leading-6 text-[#52706a]">依縣市、資料時效與污染物尋找測站。列表按縣市、站名排列；過期或展示數值不代表現在狀況。</p>
        </div>
        <button type="button" onClick={reset} disabled={!hasFilters} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b8cbc4] px-3 py-2 text-sm font-bold text-[#36544c] transition hover:bg-[#f3f7f5] disabled:cursor-default disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />清除篩選
        </button>
      </div>
      <div className="mt-5 grid min-w-0 gap-4 rounded-xl border border-[#d7e2de] bg-[#f8fbf9] p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.5fr]" role="group" aria-label="測站篩選" aria-describedby="explorer-help">
        <label className="explorer-field">
          <span>縣市</span>
          <select name="explorer-county" autoComplete="off" value={filters.county} onChange={(event) => changeFilter('county', event.target.value)} aria-controls="explorer-results">
            <option value="all">全部縣市</option>
            {counties.map((county) => <option key={county} value={county}>{county}</option>)}
          </select>
        </label>
        <label className="explorer-field">
          <span>資料時效</span>
          <select name="explorer-availability" value={filters.availability} onChange={(event) => changeFilter('availability', event.target.value as StationFilters['availability'])} aria-controls="explorer-results">
            <option value="all">全部資料</option><option value="current">當期官方資料</option><option value="noncurrent">非當期／展示資料</option>
          </select>
        </label>
        <label className="explorer-field">
          <span>資料內 AQI 分類</span>
          <select name="explorer-category" autoComplete="off" value={filters.category} onChange={(event) => changeFilter('category', event.target.value as StationFilters['category'])} aria-controls="explorer-results">
            <option value="all">全部分類</option>
            {AQI_CATEGORIES.filter((category) => category.id !== 'unknown').map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label>
        <label className="explorer-field">
          <span>測站／縣市／污染物</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#52706a]" />
            <input type="search" name="station-search" autoComplete="off" value={filters.query} onChange={(event) => changeFilter('query', event.target.value)} placeholder="例如：板橋、PM2.5" aria-controls="explorer-results" className="pl-9" />
          </span>
        </label>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52706a]" role="status" aria-live="polite" aria-atomic="true">
        找到 <strong className="tabular-nums text-[#10211c]">{filteredStations.length}</strong> 站 · 當期可用 {currentCount} 站 · 非當期／展示 {filteredStations.length - currentCount} 站<br />
        顯示 {visibleStations.length} / {filteredStations.length} 站（全資料 {stations.length} 站）
      </p>
      <div id="explorer-results">
        {filteredStations.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#b8cbc4] bg-[#f8fbf9] p-5 text-center sm:p-8">
            <Search aria-hidden="true" className="mx-auto h-6 w-6 text-[#52706a]" />
            <h3 className="mt-3 text-lg font-black text-[#10211c]">沒有符合條件的測站</h3>
            <p className="mt-2 text-sm leading-6 text-[#52706a]">{stations.length === 0 ? '目前沒有可查閱的資料，請使用上方重新讀取快取。' : '請放寬縣市、資料時效、AQI 分類或搜尋條件。'}</p>
            {hasFilters && <button type="button" onClick={reset} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b625b]"><RotateCcw aria-hidden="true" className="h-4 w-4" />清除所有篩選</button>}
          </div>
        ) : <>
          <div className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStations.map((station) => <StationCard key={station.siteId} station={station} sourceKind={sourceKind} selected={station.siteId === selectedStationId} onSelect={onStationSelect} />)}
          </div>
          {remainingStationCount > 0 && <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setVisibleCount((count) => count + STATIONS_PER_PAGE)} aria-controls="explorer-results" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b8cbc4] bg-white px-5 py-2.5 text-sm font-bold text-[#24473e] transition hover:bg-[#f3f7f5]">顯示更多測站（剩餘 {remainingStationCount}）</button>
          </div>}
        </>}
      </div>
    </section>
  );
}
