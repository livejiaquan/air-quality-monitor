import { AlertTriangle, MapPin, Wind } from 'lucide-react';
import type { AqiStationRecord } from '../lib/aqi';
import { formatHours, formatNumber } from '../lib/format';
import { StatusBadge } from './StatusBadge';

type StationCardProps = {
  station: AqiStationRecord;
  canShowCurrentAdvice: boolean;
};

const pollutantLabels: Array<[keyof AqiStationRecord['pollutantValues'], string, string]> = [
  ['pm25', 'PM2.5', 'μg/m³'],
  ['pm10', 'PM10', 'μg/m³'],
  ['o3', 'O3', 'ppb'],
  ['co', 'CO', 'ppm'],
  ['so2', 'SO2', 'ppb'],
  ['no2', 'NO2', 'ppb']
];

export function StationCard({ station, canShowCurrentAdvice }: StationCardProps) {
  const canInformNow = canShowCurrentAdvice && !station.isStale;

  return (
    <article className="rounded-2xl border border-[#c9d7d1] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-dashboard motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">{station.stationName}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {station.county}
          </p>
        </div>
        {!canInformNow ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
            {canShowCurrentAdvice ? '資料過期' : '僅供展示'}
          </span>
        ) : (
          <StatusBadge category={station.category} value={station.aqi} compact />
        )}
      </div>

      <div className="mt-5 rounded-lg border p-4" style={{ borderColor: station.category.color }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {canInformNow ? 'Main Pollutant' : 'Cached Pollutant'}
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{station.mainPollutant}</p>
          </div>
          <Wind aria-hidden="true" className="h-6 w-6 text-slate-400" />
        </div>
        {!canInformNow ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-amber-900">
            {canShowCurrentAdvice ? '這筆資料已過期，不代表現在狀況，因此不提供活動建議。' : '這是範例或備援資料，不代表現在狀況，因此不提供活動建議。'}
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <p><span className="font-bold text-slate-800">一般民眾：</span>{station.category.advice.general}</p>
            <p><span className="font-bold text-slate-800">敏感族群：</span>{station.category.advice.sensitive}</p>
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {pollutantLabels.map(([key, label, unit]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-black tabular-nums text-slate-950">
              {formatNumber(station.pollutantValues[key], key === 'co' ? 2 : 0)}
              <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        發布時間：{station.publishTime || '未知'} · {station.hasFutureTimestamp ? '時間戳異常' : formatHours(station.hoursSinceUpdate)}
      </p>
    </article>
  );
}
