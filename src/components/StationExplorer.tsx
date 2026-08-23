import { RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AQI_CATEGORIES, type AqiCategoryId, type AqiStationRecord } from '../lib/aqi';
import { StationCard } from './StationCard';

type StationExplorerProps = {
  stations: AqiStationRecord[];
  canShowCurrentAdvice: boolean;
};

const categoryOptions: Array<{ id: AqiCategoryId | 'all'; label: string }> = [
  { id: 'all', label: '全部狀態' },
  ...AQI_CATEGORIES.filter((category) => category.id !== 'unknown').map((category) => ({
    id: category.id,
    label: category.label
  }))
];

const STATIONS_PER_PAGE = 24;

export function StationExplorer({ stations, canShowCurrentAdvice }: StationExplorerProps) {
  const [county, setCounty] = useState('all');
  const [category, setCategory] = useState<AqiCategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);

  const counties = useMemo(() => ['all', ...new Set(stations.map((station) => station.county).sort((a, b) => a.localeCompare(b, 'zh-Hant')))], [stations]);
  const filteredStations = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return stations
      .filter((station) => county === 'all' || station.county === county)
      .filter((station) => category === 'all' || station.categoryId === category)
      .filter((station) => {
        if (!keyword) return true;
        return `${station.stationName} ${station.county} ${station.mainPollutant}`.toLocaleLowerCase().includes(keyword);
      })
      .sort((a, b) => b.aqi - a.aqi);
  }, [category, county, query, stations]);
  const visibleStations = filteredStations.slice(0, visibleCount);
  const remainingStationCount = filteredStations.length - visibleStations.length;

  const reset = () => {
    setCounty('all');
    setCategory('all');
    setQuery('');
    setVisibleCount(STATIONS_PER_PAGE);
  };

  return (
    <section className="rounded-2xl border border-[#c9d7d1] bg-white/90 p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Station Explorer</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">測站細節</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">依縣市、AQI 狀態或污染物搜尋測站。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr] lg:min-w-[520px] lg:grid-cols-[1fr_1fr_1.2fr]">
          <label className="block">
            <span className="sr-only">縣市篩選</span>
            <select
              name="explorer-county"
              autoComplete="off"
              value={county}
              onChange={(event) => {
                setCounty(event.target.value);
                setVisibleCount(STATIONS_PER_PAGE);
              }}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            >
              {counties.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? '全部縣市' : item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">AQI 狀態篩選</span>
            <select
              name="explorer-category"
              autoComplete="off"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as AqiCategoryId | 'all');
                setVisibleCount(STATIONS_PER_PAGE);
              }}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            >
              {categoryOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <span className="sr-only">搜尋測站</span>
            <input
              type="search"
              name="station-search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(STATIONS_PER_PAGE);
              }}
              placeholder="搜尋測站、縣市、污染物…"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">
          顯示 <span className="font-bold text-slate-900">{visibleStations.length}</span> / {filteredStations.length} 個符合測站
          <span className="sr-only">；全資料共 {stations.length} 個測站</span>
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          重設
        </button>
      </div>

      {filteredStations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-lg font-black text-slate-950">沒有符合條件的測站</h3>
          <p className="mt-2 text-sm text-slate-500">請放寬縣市、AQI 狀態或搜尋條件。</p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            清除篩選
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStations.map((station) => (
              <StationCard key={station.siteId} station={station} canShowCurrentAdvice={canShowCurrentAdvice} />
            ))}
          </div>
          {remainingStationCount > 0 ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + STATIONS_PER_PAGE)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                顯示更多測站（剩餘 {remainingStationCount}）
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
