import { Clock3 } from 'lucide-react';
import { getFreshnessTier, type FreshnessTier } from '../lib/aqi';
import { formatAge, formatPublishLabel } from '../lib/format';

export const OFFICIAL_MONITOR_URL = 'https://airtw.moenv.gov.tw/';

type FreshnessLabelProps = {
  publishTimeISO: string | null;
  hoursSinceUpdate: number | null;
  hasFutureTimestamp?: boolean;
  /** Subtitle size (18px on desktop) instead of the default 14px. */
  large?: boolean;
};

/**
 * "資料時間 HH:MM · N 小時前" next to the reading. Neutral while live, amber once
 * the reading is more than 90 minutes old; never a warning banner.
 */
export function FreshnessLabel({ publishTimeISO, hoursSinceUpdate, hasFutureTimestamp = false, large = false }: FreshnessLabelProps) {
  const tier = getFreshnessTier(hoursSinceUpdate, hasFutureTimestamp);
  const amber = tier !== 'live';
  const age = hasFutureTimestamp ? '時間異常' : formatAge(hoursSinceUpdate);

  return (
    <p className={`flex flex-wrap items-center gap-x-2 ${large ? 'text-sm sm:text-lg' : 'text-sm'} ${amber ? 'font-semibold text-warn' : 'text-muted'}`}>
      <Clock3 aria-hidden="true" className="h-4 w-4" />
      <span className="tabular">資料時間 {formatPublishLabel(publishTimeISO)}</span>
      <span aria-hidden="true">·</span>
      <span>{age}</span>
      {tier === 'unusable' && !hasFutureTimestamp && <span className="rounded-full bg-warnbg px-2 text-sm">24 小時前的資料</span>}
    </p>
  );
}

/** One-line pointer to the official source, shown once a reading is "old" (> 6 h). */
export function OfficialSourceNote({ tier }: { tier: FreshnessTier }) {
  if (tier !== 'old' && tier !== 'unusable') return null;
  return (
    <p className="text-sm text-muted">
      本站每 3–4 小時更新一次，最新數據請見
      <a className="font-semibold text-accent underline underline-offset-2" href={OFFICIAL_MONITOR_URL} target="_blank" rel="noreferrer">
        環境部空氣品質監測網
      </a>
      。
    </p>
  );
}
