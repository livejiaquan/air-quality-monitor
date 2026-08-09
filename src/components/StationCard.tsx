import { MapPin, Wind } from 'lucide-react';
import type { AqiStationRecord } from '../lib/aqi';
import { formatNumber } from '../lib/format';
import { StatusBadge } from './StatusBadge';

type StationCardProps = {
  station: AqiStationRecord;
};

const pollutantLabels: Array<[keyof AqiStationRecord['pollutantValues'], string, string]> = [
  ['pm25', 'PM2.5', 'μg/m³'],
  ['pm10', 'PM10', 'μg/m³'],
  ['o3', 'O3', 'ppb'],
  ['co', 'CO', 'ppm'],
  ['so2', 'SO2', 'ppb'],
  ['no2', 'NO2', 'ppb']
];

export function StationCard({ station }: StationCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-dashboard">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">{station.stationName}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {station.county}
          </p>
        </div>
        <StatusBadge category={station.category} value={station.aqi} compact />
      </div>

      <div className="mt-5 rounded-lg border p-4" style={{ borderColor: station.category.color }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Main Pollutant</p>
            <p className="mt-1 text-xl font-black text-slate-950">{station.mainPollutant}</p>
          </div>
          <Wind aria-hidden="true" className="h-6 w-6 text-slate-400" />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{station.category.advice.general}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {pollutantLabels.map(([key, label, unit]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-black text-slate-950">
              {formatNumber(station.pollutantValues[key], key === 'co' ? 2 : 0)}
              <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-slate-500">發布時間：{station.publishTime || '未知'}</p>
    </article>
  );
}

