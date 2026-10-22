import { ArrowDown, MapPin } from 'lucide-react';
import type { AqiSummary, CountySummary } from '../lib/aqi';
import { formatNumber } from '../lib/format';
import { StatusBadge } from './StatusBadge';

type CountyRankingProps = {
  summary: AqiSummary;
};

export function CountyRanking({ summary }: CountyRankingProps) {
  const worst = summary.counties.slice(0, 5);
  const lowerAqiCounties = [...summary.counties].sort((a, b) => a.averageAqi - b.averageAqi || a.maxAqi - b.maxAqi).slice(0, 4);

  return (
    <section className="rounded-2xl border border-[#c9d7d1] bg-white/90 p-5 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">County Ranking</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">縣市風險排行</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">依目前可用測站的最高 AQI 排序；不等同於你所在地的暴露情況。</p>
      </div>

      <div className="mt-5 space-y-2.5">
        {worst.map((county, index) => (
          <CountyRow key={county.county} county={county} rank={index + 1} />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
          目前平均 AQI 較低
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {lowerAqiCounties.map((county) => (
            <div key={county.county} className="rounded-lg bg-white px-3 py-2 text-sm text-emerald-950">
              <span className="font-bold">{county.county}</span>
              <span className="text-emerald-700"> 平均 AQI {formatNumber(county.averageAqi, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type CountyRowProps = {
  county: CountySummary;
  rank: number;
};

function CountyRow({ county, rank }: CountyRowProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
            {rank}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-950">{county.county}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-500">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              最高測站：{county.maxStationName}
            </p>
          </div>
        </div>
        <StatusBadge category={county.category} value={county.maxAqi} compact />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <MiniStat label="平均" value={formatNumber(county.averageAqi, 0)} />
        <MiniStat label="不健康" value={`${county.unhealthyCount}`} />
        <MiniStat label="測站" value={`${county.stationCount}`} />
      </div>
    </article>
  );
}

type MiniStatProps = {
  label: string;
  value: string;
};

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}
