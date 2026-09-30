import type { AqiStationRecord, SourceKind } from './aqi';
import { formatHours, formatPublishTime } from './format';

export const NONCURRENT_COLOR = '#64748b';

export function getObservationPresentation(station: AqiStationRecord, sourceKind: SourceKind) {
  const hasValidTime = Boolean(station.publishTimeISO && Number.isFinite(Date.parse(station.publishTimeISO)));
  const state = sourceKind !== 'official-cache'
    ? 'demo'
    : station.hasFutureTimestamp
      ? 'invalid-time'
      : !hasValidTime
        ? 'missing-time'
        : station.isStale ? 'stale' : 'current';
  const isCurrent = state === 'current';
  const label = {
    current: '目前可用',
    stale: '資料過期',
    'missing-time': '發布時間未知',
    'invalid-time': '發布時間異常',
    demo: '展示資料'
  }[state];
  const markerLabel = {
    current: String(station.aqi),
    stale: '過期',
    'missing-time': '缺時',
    'invalid-time': '異常',
    demo: '展示'
  }[state];
  const valueLabel = isCurrent ? 'AQI' : state === 'demo' ? '展示 AQI' : '快取 AQI';
  const publishedAt = formatPublishTime(station.publishTimeISO);
  const ageLabel = station.hasFutureTimestamp ? '時間戳異常' : hasValidTime ? formatHours(station.hoursSinceUpdate) : '無法確認時效';

  return {
    state,
    isCurrent,
    label,
    markerLabel,
    valueLabel,
    publishedAt,
    ageLabel,
    borderColor: isCurrent ? station.category.color : NONCURRENT_COLOR,
    description: `${station.county} ${station.stationName}，${label}，${valueLabel} ${station.aqi}，發布：${publishedAt}（台灣時間），${ageLabel}${isCurrent ? `，${station.category.label}` : '，不代表現在狀況'}`
  };
}
