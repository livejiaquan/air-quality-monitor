import { Clock3, HeartPulse, Info, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AqiDataset, AqiStationRecord } from '../lib/aqi';
import { formatHours, formatNumber, formatPublishLabel } from '../lib/format';
import { AQI_SWATCHES } from '../lib/palette';
import { AqiScale } from './AqiScale';

type StationHeroProps = {
  dataset: AqiDataset;
  station: AqiStationRecord;
  /** True when the station was chosen by default rather than by the visitor. */
  isDefault: boolean;
  picker: ReactNode;
};

const POLLUTANTS: Array<[keyof AqiStationRecord['pollutantValues'], string, string, number]> = [
  ['pm25', 'PM2.5', 'μg/m³', 0],
  ['pm10', 'PM10', 'μg/m³', 0],
  ['o3', 'O₃', 'ppb', 0],
  ['no2', 'NO₂', 'ppb', 0],
  ['so2', 'SO₂', 'ppb', 0],
  ['co', 'CO', 'ppm', 2]
];

// Order matters: 細懸浮微粒 (PM2.5) must match before 懸浮微粒 (PM10).
const MAIN_POLLUTANT_KEYS: Array<[RegExp, keyof AqiStationRecord['pollutantValues']]> = [
  [/細懸浮微粒|PM2\.5/i, 'pm25'],
  [/懸浮微粒|PM10/i, 'pm10'],
  [/臭氧|O3/i, 'o3'],
  [/二氧化氮|NO2/i, 'no2'],
  [/二氧化硫|SO2/i, 'so2'],
  [/一氧化碳|CO/i, 'co']
];

/**
 * The page's single focal point: the chosen station's AQI as a large
 * category-coloured tile (IQAir / Apple Weather pattern), with the station,
 * status and time beside it and advice + pollutants as the second layer.
 */
export function StationHero({ dataset, station, isDefault, picker }: StationHeroProps) {
  const official = dataset.source.kind === 'official-cache';
  const canAdvise = official && !station.isStale;
  const swatch = AQI_SWATCHES[canAdvise ? station.categoryId : 'unknown'];
  const mainKey = MAIN_POLLUTANT_KEYS.find(([pattern]) => pattern.test(station.mainPollutant))?.[1];
  const hasMainPollutant = canAdvise && station.mainPollutant && station.mainPollutant !== '無明顯污染物';

  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden rounded-card ring-1 ring-line bg-surface shadow-card">
      <div className="border-b border-line p-4 sm:p-6">{picker}</div>

      <div
        aria-live="polite"
        className="grid gap-8 p-4 sm:p-6 lg:grid-cols-12"
        style={{ background: `linear-gradient(180deg, ${swatch.fill}24 0%, transparent 70%)` }}
      >
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className={`grid h-32 w-32 shrink-0 place-items-center rounded-card sm:h-52 sm:w-52 ${canAdvise ? 'shadow-card' : 'border-2 border-dashed border-faint/60 bg-surface'}`}
              style={canAdvise ? { background: swatch.fill, color: swatch.ink } : undefined}
            >
              <div className="text-center">
                <p className={`text-sm font-bold uppercase tracking-wider ${canAdvise ? 'opacity-80' : 'text-faint'}`}>{canAdvise ? 'AQI' : '快取 AQI'}</p>
                <p className={`tabular text-5xl font-extrabold tracking-tight sm:text-6xl ${canAdvise ? '' : 'text-faint'}`}>{station.aqi}</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted">
                {station.county}
                {isDefault && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-sunken px-2 py-1 text-xs font-semibold text-muted">預設測站</span>}
              </p>
              <h1 id="hero-heading" className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">
                {station.stationName}
              </h1>
              <p className={`mt-2 text-lg font-bold sm:text-xl ${canAdvise ? '' : 'text-warn'}`}>
                {canAdvise ? station.category.label : official ? '資料過期' : '展示資料'}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <Clock3 aria-hidden="true" className="h-4 w-4" />
                <span className="tabular">{formatPublishLabel(station.publishTimeISO)} 發布</span>
                <span aria-hidden="true">·</span>
                <span>{station.hasFutureTimestamp ? '時間戳異常' : formatHours(station.hoursSinceUpdate)}</span>
              </p>
            </div>
          </div>

          {hasMainPollutant && (
            <p className="mt-6 text-base text-muted">
              主要污染物：<span className="font-semibold text-ink">{station.mainPollutant}</span>
            </p>
          )}
          <div className="mt-4">
            <AqiScale aqi={canAdvise ? station.aqi : null} />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-5">
          {canAdvise ? (
            <>
              <Advice icon={<Users aria-hidden="true" className="h-4 w-4" />} title="一般民眾" text={station.category.advice.general} />
              <Advice icon={<HeartPulse aria-hidden="true" className="h-4 w-4" />} title="敏感族群" text={station.category.advice.sensitive} />
            </>
          ) : (
            <div className="rounded-control bg-warnbg p-4 text-base text-warn">
              <p className="flex items-center gap-2 font-bold">
                <Info aria-hidden="true" className="h-4 w-4" />
                現在建議已暫停
              </p>
              <p className="mt-1">這筆資料超過 3 小時或時間異常，只保留供查核。請以環境部監測網的即時資料為準。</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3" aria-label={canAdvise ? '目前污染物濃度' : '快取污染物濃度'}>
            {POLLUTANTS.map(([key, label, unit, digits]) => {
              const isMain = canAdvise && mainKey === key;
              return (
                <div
                  key={key}
                  className={`rounded-control px-3 py-2 ${isMain ? 'bg-surface ring-2' : 'bg-sunken'}`}
                  style={isMain ? ({ '--tw-ring-color': swatch.fill } as React.CSSProperties) : undefined}
                >
                  <dt className="text-sm text-muted">
                    {label}
                    {isMain && <span className="sr-only">（主要污染物）</span>}
                  </dt>
                  <dd>
                    <span className="tabular text-lg font-bold">{formatNumber(station.pollutantValues[key], digits)}</span>
                    <span className="ml-1 text-sm text-faint">{unit}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Advice({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-control bg-sunken p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-muted">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-base">{text}</p>
    </div>
  );
}
