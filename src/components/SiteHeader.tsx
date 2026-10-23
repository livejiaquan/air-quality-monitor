import { Moon, RotateCw, Sun, Wind } from 'lucide-react';
import { getFreshnessTier, type AqiDataset } from '../lib/aqi';
import { formatAge, formatPublishLabel } from '../lib/format';

type SiteHeaderProps = {
  dataset?: AqiDataset;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function SiteHeader({ dataset, theme, onToggleTheme, onRefresh, isRefreshing = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <a href="./" className="flex h-11 min-w-0 items-center gap-3" aria-label="台灣空氣品質 首頁">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white dark:text-canvas">
            <Wind aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <span className="truncate text-base font-bold tracking-tight sm:text-lg">台灣空氣品質</span>
        </a>
        <div className="-mr-2 ml-auto flex items-center gap-1">
          {dataset && <FreshnessPill dataset={dataset} />}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? '正在重新讀取資料' : '重新讀取資料'}
              title="重新讀取資料"
              className="grid h-11 w-11 place-items-center rounded-control text-muted transition hover:bg-sunken hover:text-ink disabled:cursor-wait"
            >
              <RotateCw aria-hidden="true" className={`h-[18px] w-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
            title={theme === 'dark' ? '淺色模式' : '深色模式'}
            className="grid h-11 w-11 place-items-center rounded-control text-muted transition hover:bg-sunken hover:text-ink"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="h-[18px] w-[18px]" /> : <Moon aria-hidden="true" className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function FreshnessPill({ dataset }: { dataset: AqiDataset }) {
  const { summary } = dataset;
  const official = dataset.source.kind === 'official-cache';
  // Tier of the newest station reading, computed against the browser clock.
  const tier = official ? getFreshnessTier(summary.hoursSinceUpdate) : 'unusable';
  const fresh = tier === 'live';
  const label = !official ? '展示資料' : fresh ? formatPublishLabel(summary.newestPublishTimeISO) : formatAge(summary.hoursSinceUpdate);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${
        fresh ? 'bg-sunken text-muted' : 'bg-warnbg text-warn'
      }`}
      title={`資料時間 ${formatPublishLabel(summary.newestPublishTimeISO)} · ${formatAge(summary.hoursSinceUpdate)}`}
    >
      <span className={`h-2 w-2 rounded-full ${fresh ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
      <span className="tabular">
        {label}
        {fresh && <span className="hidden min-[380px]:inline"> 發布</span>}
      </span>
    </span>
  );
}
