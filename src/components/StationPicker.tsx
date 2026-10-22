import { MapPin, Search, X } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import type { AqiStationRecord } from '../lib/aqi';
import { AQI_SWATCHES } from '../lib/palette';

type StationPickerProps = {
  stations: AqiStationRecord[];
  selected: AqiStationRecord | null;
  onSelect: (station: AqiStationRecord | null) => void;
  canShowCurrent: boolean;
};

const MAX_SUGGESTIONS = 8;

export function StationPicker({ stations, selected, onSelect, canShowCurrent }: StationPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const keyword = query.trim().replace(/台/g, '臺');
    const sorted = [...stations].sort((a, b) => a.county.localeCompare(b.county, 'zh-Hant') || a.stationName.localeCompare(b.stationName, 'zh-Hant'));
    if (!keyword) return sorted.slice(0, MAX_SUGGESTIONS);
    return sorted
      .filter((station) => `${station.stationName}${station.county}`.replace(/台/g, '臺').includes(keyword))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, stations]);

  const choose = (station: AqiStationRecord) => {
    onSelect(station);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(matches.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter' && open && matches[active]) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        搜尋測站或縣市
      </label>
      <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 shadow-sm transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-faint" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].siteId}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={selected ? `目前：${selected.county} ${selected.stationName}，輸入以更換` : '輸入站名或縣市，例如「板橋」「臺中」'}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-sunken hover:text-ink"
            aria-label="清除所選測站"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="符合的測站"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-[1100] max-h-80 overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-card"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">找不到「{query}」，試試其他站名或縣市。</li>
          ) : (
            matches.map((station, index) => {
              const live = canShowCurrent && !station.isStale;
              const swatch = AQI_SWATCHES[live ? station.categoryId : 'unknown'];
              return (
                <li
                  key={station.siteId}
                  id={`${listId}-${station.siteId}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(station)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${index === active ? 'bg-sunken' : ''}`}
                >
                  <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{station.stationName}</span>
                    <span className="ml-2 text-sm text-muted">{station.county}</span>
                  </span>
                  <span
                    className="tabular min-w-[2.5rem] rounded-md px-1.5 py-0.5 text-center text-xs font-bold"
                    style={{ background: swatch.fill, color: swatch.ink }}
                  >
                    {station.aqi}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
