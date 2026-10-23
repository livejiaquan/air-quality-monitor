import type { AqiSummary } from '../lib/aqi';
import { formatNumber } from '../lib/format';
import { AQI_SCALE, AQI_SWATCHES } from '../lib/palette';

/** Second-layer national picture: headline counts, category mix and county ranking. */
export function Overview({ summary, dominantPollutant }: { summary: AqiSummary; dominantPollutant: string }) {
  const excluded = summary.staleStationCount;
  const total = summary.currentStationCount;
  const healthyShare = total ? Math.round((summary.healthyStationCount / total) * 100) : 0;
  const maxCountyAqi = Math.max(150, ...summary.counties.map((county) => county.maxAqi));

  return (
    <section aria-labelledby="overview-heading" className="rounded-card ring-1 ring-line bg-surface p-4 shadow-card sm:p-6">
      <h2 id="overview-heading" className="text-xl font-bold">全台現況</h2>
      <p className="mt-1 text-sm text-muted">
        {total} 個有效測站{excluded > 0 && `（${excluded} 站超過 24 小時未更新，未列入）`} · 中位數 AQI <span className="tabular">{formatNumber(summary.medianAqi)}</span> · 主要污染物 {dominantPollutant}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <dl className="grid grid-cols-3 gap-4">
            <Stat value={`${healthyShare}%`} label="良好或普通" />
            <Stat value={`${summary.unhealthyStationCount}`} label="AQI 超過 100" />
            <Stat value={summary.worstStation ? `${summary.worstStation.aqi}` : '--'} label={summary.worstStation ? `最高：${summary.worstStation.stationName}` : '最高值'} />
          </dl>
          <div
            className="mt-6 flex h-3 gap-1 overflow-hidden rounded-full"
            role="img"
            aria-label={`測站分布：${AQI_SCALE.map((band) => `${band.label} ${summary.categoryCounts[band.id]} 站`).join('、')}`}
          >
            {AQI_SCALE.map((band) =>
              summary.categoryCounts[band.id] ? (
                <span key={band.id} style={{ flexGrow: summary.categoryCounts[band.id], background: AQI_SWATCHES[band.id].fill }} />
              ) : null
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
            {AQI_SCALE.map((band) => (
              <div key={band.id} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: AQI_SWATCHES[band.id].fill }} aria-hidden="true" />
                <dt className="text-sm text-muted">{band.label}</dt>
                <dd className="tabular ml-auto text-base font-bold">{summary.categoryCounts[band.id]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-7">
          <h3 className="text-base font-bold">各縣市最高值</h3>
          <ol className="mt-2 gap-x-8 sm:columns-2">
            {summary.counties.map((county) => (
              <li key={county.county} className="mb-2 grid break-inside-avoid grid-cols-[5rem_1fr_2.5rem] items-center gap-2">
                <span className="truncate text-base">{county.county}</span>
                <span className="h-2 overflow-hidden rounded-full bg-sunken" title={`${county.maxStationName} AQI ${county.maxAqi}`}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(4, (county.maxAqi / maxCountyAqi) * 100)}%`, background: AQI_SWATCHES[county.categoryId].fill }}
                  />
                </span>
                <span className="tabular text-right text-base font-bold">{county.maxAqi}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    // dt must precede dd in a <dl>; column-reverse puts the number on top visually.
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-sm text-muted">{label}</dt>
      <dd className="tabular text-2xl font-bold">{value}</dd>
    </div>
  );
}
