import type { AqiStationRecord } from '../lib/aqi';
import { formatNumber } from '../lib/format';

const pollutants: Array<[keyof AqiStationRecord['pollutantValues'], string, string]> = [
  ['pm25', 'PM2.5', 'μg/m³'],
  ['pm10', 'PM10', 'μg/m³'],
  ['o3', 'O₃', 'ppb'],
  ['co', 'CO', 'ppm'],
  ['so2', 'SO₂', 'ppb'],
  ['no2', 'NO₂', 'ppb']
];

export function PollutantReadings({ station, label }: { station: AqiStationRecord; label: string }) {
  return (
    <div>
      <dl className="grid grid-cols-2 gap-2" aria-label={label}>
        {pollutants.map(([key, name, unit]) => (
          <div key={key} className="min-w-0 rounded-xl bg-[#f3f7f5] p-3">
            <dt className="text-sm font-bold text-[#52706a]">{name}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-black tabular-nums text-[#10211c]">
              <span>{station.pollutantValues[key] === null ? '未提供' : formatNumber(station.pollutantValues[key], key === 'co' ? 2 : 0)}</span>
              <span className="text-sm font-medium text-[#52706a]">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-6 text-[#52706a]">濃度依各污染物單位呈現；未提供的數值不以 0 代替。</p>
    </div>
  );
}
