import { Clock3, HeartPulse, Info, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AqiDataset, AqiStationRecord } from '../lib/aqi';
import { formatHours, formatNumber, formatPublishLabel } from '../lib/format';
import { AQI_SCALE, AQI_SWATCHES } from '../lib/palette';
import { STATION_SELECTION_GUIDANCE } from '../lib/stationSelection';
import { AqiScale } from './AqiScale';

type StationHeroProps = {
  dataset: AqiDataset;
  station: AqiStationRecord | null;
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

export function StationHero({ dataset, station, picker }: StationHeroProps) {
  const official = dataset.source.kind === 'official-cache';

  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="p-4 sm:p-6">
        <h1 id="hero-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
          {station ? '我的測站' : '你那邊的空氣如何？'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {station ? '已記住這個測站，下次打開會直接顯示。' : '搜尋你生活或活動區域的測站，查看環境部最新 AQI 與活動建議。'}
        </p>
        <div className="mt-4">{picker}</div>
      </div>
      {station ? (
        <StationReading station={station} official={official} />
      ) : (
        <NationalSnapshot dataset={dataset} />
      )}
    </section>
  );
}

function StationReading({ station, official }: { station: AqiStationRecord; official: boolean }) {
  const canAdvise = official && !station.isStale;
  const swatch = AQI_SWATCHES[canAdvise ? station.categoryId : 'unknown'];
  const mainKey = MAIN_POLLUTANT_KEYS.find(([pattern]) => pattern.test(station.mainPollutant))?.[1];

  return (
    <div aria-live="polite" className="border-t border-line">
      <div
        className="relative px-4 pb-5 pt-5 sm:px-6"
        style={{ background: `linear-gradient(180deg, ${swatch.fill}26 0%, transparent 100%)` }}
      >
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className={`grid h-28 w-28 shrink-0 place-items-center rounded-card sm:h-32 sm:w-32 ${canAdvise ? 'shadow-card' : 'border-2 border-dashed border-faint/60 bg-surface'}`}
            style={canAdvise ? { background: swatch.fill, color: swatch.ink } : undefined}
          >
            <div className="text-center">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${canAdvise ? 'opacity-75' : 'text-faint'}`}>{canAdvise ? 'AQI' : '快取 AQI'}</p>
              <p className={`tabular text-5xl font-extrabold leading-none tracking-tight sm:text-6xl ${canAdvise ? '' : 'text-faint'}`}>{station.aqi}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">{station.county}</p>
            <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{station.stationName}</h2>
            <p className={`mt-1 text-lg font-bold sm:text-xl ${canAdvise ? '' : 'text-warn'}`}>
              {canAdvise ? station.category.label : official ? '資料過期' : '展示資料'}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
              <span className="tabular">{formatPublishLabel(station.publishTimeISO)} 發布</span>
              <span aria-hidden="true">·</span>
              <span>{station.hasFutureTimestamp ? '時間戳異常' : formatHours(station.hoursSinceUpdate)}</span>
            </p>
          </div>
        </div>

        {canAdvise && station.mainPollutant && station.mainPollutant !== '無明顯污染物' && (
          <p className="mt-4 text-sm text-muted">
            主要污染物：<span className="font-semibold text-ink">{station.mainPollutant}</span>
          </p>
        )}

        <div className="mt-5">
          <AqiScale aqi={canAdvise ? station.aqi : null} />
        </div>
      </div>

      <div className="grid gap-4 px-4 pb-5 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        {canAdvise ? (
          <div className="space-y-3">
            <Advice icon={<Users aria-hidden="true" className="h-4 w-4" />} title="一般民眾" text={station.category.advice.general} />
            <Advice icon={<HeartPulse aria-hidden="true" className="h-4 w-4" />} title="敏感族群" text={station.category.advice.sensitive} />
            <p className="text-xs leading-5 text-faint">敏感族群：心臟、呼吸道及心血管疾病者、孩童及老年人。建議依環境部健康指引整理，並非醫療建議。</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-warnbg p-4 text-sm leading-6 text-warn">
            <p className="flex items-center gap-2 font-bold">
              <Info aria-hidden="true" className="h-4 w-4" />
              現在建議已暫停
            </p>
            <p className="mt-1">這筆資料超過 3 小時或時間異常，只保留供查核，不作為現在的活動判斷。請以環境部監測網的即時資料為準。</p>
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 self-start" aria-label={canAdvise ? '目前污染物濃度' : '快取污染物濃度'}>
          {POLLUTANTS.map(([key, label, unit, digits]) => {
            const isMain = canAdvise && mainKey === key;
              return (
              <div
                key={key}
                className={`rounded-control px-3 py-2.5 ${isMain ? 'bg-surface ring-2' : 'bg-sunken'}`}
                style={isMain ? ({ '--tw-ring-color': swatch.fill } as React.CSSProperties) : undefined}
              >
                <dt className="text-xs font-semibold text-muted">
                  {label}
                  {isMain && <span className="ml-1 text-[10px] font-bold text-ink">主要</span>}
                </dt>
                <dd className="mt-0.5">
                  <span className="tabular text-lg font-bold">{formatNumber(station.pollutantValues[key], digits)}</span>
                  <span className="ml-1 text-[11px] text-faint">{unit}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

function Advice({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-sunken p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-muted">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-7">{text}</p>
    </div>
  );
}

function NationalSnapshot({ dataset }: { dataset: AqiDataset }) {
  const { summary } = dataset;
  const official = dataset.source.kind === 'official-cache';
  const hasCurrent = official && summary.currentStationCount > 0;
  const healthyShare = hasCurrent ? Math.round((summary.healthyStationCount / summary.currentStationCount) * 100) : null;

  return (
    <div className="border-t border-line bg-sunken/50 px-4 py-5 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">全台現況</p>
      {hasCurrent ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat value={`${healthyShare}%`} label="測站良好或普通" />
            <Stat value={`${summary.unhealthyStationCount}`} label="測站 AQI 超過 100" />
            <Stat value={summary.worstStation ? `${summary.worstStation.aqi}` : '--'} label={summary.worstStation ? `最高：${summary.worstStation.stationName}` : '最高值'} />
          </div>
          <div className="mt-4">
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`測站分布：${AQI_SCALE.map((band) => `${band.label} ${summary.categoryCounts[band.id]} 站`).join('、')}`}>
              {AQI_SCALE.map((band) =>
                summary.categoryCounts[band.id] ? (
                  <span key={band.id} style={{ flexGrow: summary.categoryCounts[band.id], background: AQI_SWATCHES[band.id].fill }} />
                ) : null
              )}
            </div>
            <p className="mt-1.5 text-xs text-faint">{summary.currentStationCount} 個有效測站的類別分布</p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">
          {dataset.records.length === 0
            ? '目前沒有任何測站資料，請稍後再試。'
            : '目前沒有 3 小時內的有效官方資料，全台概況與活動建議暫停。地圖與列表仍可查看各站最後一筆資料。'}
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-faint">
        {STATION_SELECTION_GUIDANCE.text}{' '}
        <a className="font-semibold text-accent underline underline-offset-2" href={STATION_SELECTION_GUIDANCE.sourceUrl} target="_blank" rel="noreferrer">
          了解測站類型
        </a>
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="tabular text-2xl font-bold sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs leading-4 text-muted">{label}</p>
    </div>
  );
}
