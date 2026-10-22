import type { AqiSummary } from '../lib/aqi';
import { formatNumber } from '../lib/format';
import { AQI_SCALE, AQI_SWATCHES } from '../lib/palette';

export function Overview({ summary, dominantPollutant }: { summary: AqiSummary; dominantPollutant: string }) {
  const total = summary.currentStationCount;
  const maxCountyAqi = Math.max(150, ...summary.counties.map((county) => county.maxAqi));

  return (
    <section aria-labelledby="overview-heading" className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 id="overview-heading" className="text-lg font-bold">全台分布</h2>
        <p className="mt-1 text-sm text-muted">
          {total} 個有效測站 · 中位數 AQI <span className="tabular">{formatNumber(summary.medianAqi)}</span> · 主要污染物 {dominantPollutant}
        </p>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-sunken" role="img" aria-label={AQI_SCALE.map((band) => `${band.label} ${summary.categoryCounts[band.id]} 站`).join('、')}>
          {AQI_SCALE.map((band) => {
            const count = summary.categoryCounts[band.id];
            if (!count) return null;
            return <span key={band.id} style={{ width: `${(count / total) * 100}%`, background: AQI_SWATCHES[band.id].fill }} />;
          })}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
          {AQI_SCALE.map((band) => (
            <div key={band.id} className="flex items-baseline gap-2">
              <span className="h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-sm" style={{ background: AQI_SWATCHES[band.id].fill }} aria-hidden="true" />
              <dt className="text-sm text-muted">{band.label}</dt>
              <dd className="tabular ml-auto font-bold">{summary.categoryCounts[band.id]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-bold">各縣市最高值</h2>
        <p className="mt-1 text-sm text-muted">每個縣市取 AQI 最高的有效測站；長條越長越差。</p>
        <ol className="mt-4 gap-x-8 sm:columns-2">
          {summary.counties.map((county) => {
            const swatch = AQI_SWATCHES[county.categoryId];
            return (
              <li key={county.county} className="mb-2 grid break-inside-avoid grid-cols-[4.5rem_1fr_2.25rem] items-center gap-2 text-sm">
                <span className="truncate font-medium">{county.county}</span>
                <span className="h-2 overflow-hidden rounded-full bg-sunken" title={`${county.maxStationName} AQI ${county.maxAqi}`}>
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (county.maxAqi / maxCountyAqi) * 100)}%`, background: swatch.fill }} />
                </span>
                <span className="tabular text-right font-bold">{county.maxAqi}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
