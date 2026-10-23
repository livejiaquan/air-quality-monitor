import type { AqiStationRecord } from './aqi';

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function formatHours(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '未知';
  if (value < 1) return '1 小時內';
  if (value >= 48) return `${Math.floor(value / 24)} 天前`;
  if (value < 10) return `${formatNumber(Math.floor(value * 10) / 10, 1)} 小時前`;
  return `${Math.floor(value)} 小時前`;
}

export function getDominantPollutant(stations: AqiStationRecord[]): string {
  const counts = new Map<string, number>();
  for (const station of stations) {
    if (!station.mainPollutant || station.mainPollutant === '無明顯污染物') continue;
    counts.set(station.mainPollutant, (counts.get(station.mainPollutant) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))[0]?.[0] ?? '無明顯污染物';
}

/** Short Asia/Taipei label for a publish time: "15:00", or "10/21 15:00" when not today. */
export function formatPublishLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '時間未知';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '時間未知';
  const day = (value: Date) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit' }).format(value);
  const time = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return day(date) === day(now) ? time : `${day(date)} ${time}`;
}

/** Whole-unit age for freshness labels: "25 分鐘前", "4 小時前", "2 天前". */
export function formatAge(hours: number | null | undefined): string {
  if (typeof hours !== 'number' || Number.isNaN(hours)) return '時間未知';
  if (hours < 1) return `${Math.max(1, Math.floor(hours * 60))} 分鐘前`;
  if (hours < 48) return `${Math.floor(hours)} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
}
