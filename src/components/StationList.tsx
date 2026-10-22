import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AqiStationRecord } from '../lib/aqi';
import { formatHours } from '../lib/format';
import { AQI_SCALE, AQI_SWATCHES } from '../lib/palette';

type StationListProps = {
  stations: AqiStationRecord[];
  selectedId: string | null;
  canShowCurrent: boolean;
  onSelect: (station: AqiStationRecord) => void;
};

export function StationList({ stations, selectedId, canShowCurrent, onSelect }: StationListProps) {
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState('all');
  const [highFirst, setHighFirst] = useState(true);

  const counties = useMemo(() => [...new Set(stations.map((station) => station.county))].sort((a, b) => a.localeCompare(b, 'zh-Hant')), [stations]);
  const filtered = useMemo(() => {
    const keyword = query.trim().replace(/台/g, '臺');
    return stations
      .filter((station) => county === 'all' || station.county === county)
      .filter((station) => !keyword || `${station.stationName}${station.county}${station.mainPollutant}`.replace(/台/g, '臺').includes(keyword))
      .sort((a, b) => {
        const aLive = canShowCurrent && !a.isStale;
        const bLive = canShowCurrent && !b.isStale;
        if (aLive !== bLive) return aLive ? -1 : 1;
        return highFirst ? b.aqi - a.aqi : a.aqi - b.aqi;
      });
  }, [canShowCurrent, county, highFirst, query, stations]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-2 border-b border-line p-4">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-control bg-sunken px-3">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
          <span className="sr-only">篩選測站</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="篩選站名"
            className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-faint focus:outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="list-county">
          縣市
        </label>
        <select
          id="list-county"
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          className="h-11 max-w-[8rem] rounded-control bg-sunken px-2 text-base text-ink"
        >
          <option value="all">全部縣市</option>
          {counties.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setHighFirst((value) => !value)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-sunken text-muted transition hover:text-ink"
          aria-label={highFirst ? '目前 AQI 由高到低，切換為由低到高' : '目前 AQI 由低到高，切換為由高到低'}
          title={highFirst ? 'AQI 高 → 低' : 'AQI 低 → 高'}
        >
          {highFirst ? <ArrowDownWideNarrow aria-hidden="true" className="h-4 w-4" /> : <ArrowUpNarrowWide aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      <p className="px-4 pb-1 pt-3 text-sm text-faint" aria-live="polite">
        {filtered.length} / {stations.length} 站
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((station) => {
          const live = canShowCurrent && !station.isStale;
          const swatch = AQI_SWATCHES[live ? station.categoryId : 'unknown'];
          const selected = station.siteId === selectedId;
          return (
            <li key={station.siteId}>
              <button
                type="button"
                onClick={() => onSelect(station)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition ${selected ? 'bg-accent/10 ring-1 ring-accent/40' : 'hover:bg-sunken'}`}
              >
                <span
                  className={`tabular grid h-10 w-14 shrink-0 place-items-center rounded-lg text-base font-bold ${live ? '' : 'outline-dashed outline-1 outline-faint'}`}
                  style={live ? { background: swatch.fill, color: swatch.ink } : undefined}
                >
                  <span className={live ? '' : 'text-faint'}>{station.aqi}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{station.stationName}</span>
                  <span className="block truncate text-base text-muted">
                    {station.county}
                    {live ? ` · ${station.category.label}` : ` · 資料過期（${formatHours(station.hoursSinceUpdate)}）`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MapLegend({ dimmed }: { dimmed: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted" aria-label="AQI 色階圖例">
      {AQI_SCALE.map((band) => (
        <li key={band.id} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: AQI_SWATCHES[band.id].fill, opacity: dimmed ? 0.4 : 1 }} aria-hidden="true" />
          <span>
            {band.label}
            <span className="tabular ml-1 text-faint">
              {band.min}–{band.max}
            </span>
          </span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm outline-dashed outline-1 outline-faint" aria-hidden="true" />
        <span>過期</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-faint" aria-hidden="true" />
        <span>小圓點：放大可看數字</span>
      </li>
    </ul>
  );
}
