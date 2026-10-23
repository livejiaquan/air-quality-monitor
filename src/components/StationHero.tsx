import { HeartPulse, Info, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { getFreshnessTier, type AqiDataset, type AqiStationRecord } from '../lib/aqi';
import { formatNumber } from '../lib/format';
import { AQI_SWATCHES } from '../lib/palette';
import { AqiScale } from './AqiScale';
import { FreshnessLabel, OFFICIAL_MONITOR_URL, OfficialSourceNote } from './FreshnessLabel';

type StationHeroProps = {
  dataset: AqiDataset;
  station: AqiStationRecord;
  /** True when the station was chosen by default rather than by the visitor. */
  isDefault: boolean;
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
 * category-coloured tile, with the station,
 * status and time beside it and advice + pollutants as the second layer.
 */
export function StationHero({ dataset, station, isDefault }: StationHeroProps) {
  const official = dataset.source.kind === 'official-cache';
  // Live, aging and old readings (≤ 24 h) keep their colour and advice; only
  // unusable ones (> 24 h, invalid time, or demo data) go neutral.
  const canAdvise = official && !station.isStale;
  const tier = getFreshnessTier(station.hoursSinceUpdate, station.hasFutureTimestamp);
  const swatch = AQI_SWATCHES[canAdvise ? station.categoryId : 'unknown'];
  const mainKey = MAIN_POLLUTANT_KEYS.find(([pattern]) => pattern.test(station.mainPollutant))?.[1];
  const hasMainPollutant = canAdvise && station.mainPollutant && station.mainPollutant !== '無明顯污染物';

  return (
    <section aria-labelledby="hero-heading" aria-live="polite">
      {/* Page intro: breadcrumb, 36px title, 18px subtitle. */}
      <nav aria-label="位置" className="text-center text-sm text-faint sm:text-left">
        臺灣 / {station.county} / <span className="font-bold text-muted">{station.stationName}</span>
      </nav>
      <h1 id="hero-heading" className="mt-4 text-center text-2xl font-bold tracking-tight sm:text-left sm:text-3xl">
        {station.stationName}站的空氣品質
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted sm:justify-start sm:text-lg">
        <span>
          {station.county}
          {isDefault && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-surface px-2 text-sm font-semibold ring-1 ring-line">預設測站</span>}
        </span>
        <span aria-hidden="true">·</span>
        <FreshnessLabel large publishTimeISO={station.publishTimeISO} hoursSinceUpdate={station.hoursSinceUpdate} hasFutureTimestamp={station.hasFutureTimestamp} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-card bg-surface p-4 ring-1 ring-line sm:p-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className={`grid h-32 w-32 shrink-0 place-items-center rounded-card sm:h-40 sm:w-40 ${canAdvise ? '' : 'border-2 border-dashed border-faint/60 bg-surface'}`}
              style={canAdvise ? { background: swatch.fill, color: swatch.ink } : undefined}
            >
              <div className="text-center">
                <p className={`text-sm font-bold uppercase tracking-wider ${canAdvise ? 'opacity-80' : 'text-faint'}`}>AQI</p>
                <p className={`tabular text-5xl font-extrabold tracking-tight sm:text-6xl ${canAdvise ? '' : 'text-faint'}`}>{station.aqi}</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted">空氣品質指標</p>
              <p className="mt-1 text-xl font-bold">{official ? station.category.label : '展示資料'}</p>
              {hasMainPollutant && (
                <p className="mt-2 text-base text-muted">
                  主要污染物：<span className="font-semibold text-ink">{station.mainPollutant}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 lg:mt-auto lg:pt-6">
            <AqiScale aqi={canAdvise ? station.aqi : null} />
          </div>
          <div className="mt-4">
            <OfficialSourceNote tier={tier} />
          </div>
        </div>

        <div className="space-y-4 rounded-card bg-surface p-4 ring-1 ring-line sm:p-6">
          {canAdvise ? (
            <>
              <Advice icon={<Users aria-hidden="true" className="h-4 w-4" />} title="一般民眾" text={station.category.advice.general} />
              <Advice icon={<HeartPulse aria-hidden="true" className="h-4 w-4" />} title="敏感族群" text={station.category.advice.sensitive} />
              {tier === 'old' && <p className="text-sm text-muted">這筆資料已超過 6 小時，以環境部最新數據為準。</p>}
            </>
          ) : (
            <div className="rounded-control bg-sunken p-4 text-base">
              <p className="flex items-center gap-2 font-bold text-warn">
                <Info aria-hidden="true" className="h-4 w-4" />
                活動建議需要較新的資料
              </p>
              <p className="mt-1 text-muted">
                {official
                  ? station.hasFutureTimestamp
                    ? '這筆資料的發布時間異常，暫不提供活動建議。'
                    : '這是 24 小時前的資料，不適合判斷現在的活動。'
                  : '這是展示資料，不提供活動建議。'}
                最新數據請見
                <a className="font-semibold text-accent underline underline-offset-2" href={OFFICIAL_MONITOR_URL} target="_blank" rel="noreferrer">
                  環境部空氣品質監測網
                </a>
                。
              </p>
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
    <div className="border-b border-line pb-4">
      <p className="flex items-center gap-2 text-sm font-bold text-muted">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-base">{text}</p>
    </div>
  );
}
