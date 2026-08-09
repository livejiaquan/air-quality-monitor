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
  return `${formatNumber(value, value < 10 ? 1 : 0)} 小時前`;
}

export function getDominantPollutant(stations: AqiStationRecord[]): string {
  const counts = new Map<string, number>();
  for (const station of stations) {
    if (!station.mainPollutant || station.mainPollutant === '無明顯污染物') continue;
    counts.set(station.mainPollutant, (counts.get(station.mainPollutant) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))[0]?.[0] ?? '無明顯污染物';
}

