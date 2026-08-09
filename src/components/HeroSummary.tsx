import { Activity, AlertTriangle, Clock, ShieldCheck, Wind } from 'lucide-react';
import type { AqiDataset } from '../lib/aqi';
import { formatHours, formatNumber } from '../lib/format';
import { StatusBadge } from './StatusBadge';

type HeroSummaryProps = {
  dataset: AqiDataset;
};

export function HeroSummary({ dataset }: HeroSummaryProps) {
  const { summary } = dataset;
  const category = summary.worstStation?.category;
  const sourceLabel = dataset.source.kind === 'official-cache' ? '官方快取' : dataset.source.kind === 'sample' ? '範例資料' : '備援資料';
  const topAdvice = category?.advice.short ?? '參考官方公告';

  return (
    <section className="relative overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-dashboard sm:p-8 lg:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.35),transparent_34%),linear-gradient(135deg,rgba(15,118,110,0.55),rgba(15,23,42,0))]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-teal-50">
              <Wind aria-hidden="true" className="h-4 w-4" />
              Taiwan AQI Dashboard
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-200">
              {sourceLabel}
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            台灣空氣品質即時總覽
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            以環境部 AQI 開放資料整理全台測站、縣市風險、主要污染物與今日活動建議。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {category ? <StatusBadge category={category} value={summary.worstStation?.aqi} /> : null}
            {summary.isStale ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-sm font-semibold text-amber-100">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                資料可能已過期
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-sm font-semibold text-emerald-100">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                資料時效正常
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
          <div className="grid grid-cols-2 gap-4">
            <HeroStat label="平均 AQI" value={formatNumber(summary.averageAqi, 0)} />
            <HeroStat label="最高 AQI" value={formatNumber(summary.worstStation?.aqi, 0)} />
            <HeroStat label="不健康測站" value={`${summary.unhealthyStationCount}`} />
            <HeroStat label="安全測站" value={`${summary.healthyStationCount}`} />
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
              <Activity aria-hidden="true" className="h-4 w-4" />
              今日活動建議
            </div>
            <p className="mt-2 text-lg font-bold text-white">{topAdvice}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              更新時間：{summary.newestPublishTime ?? '未知'}，{formatHours(summary.hoursSinceUpdate)}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              官方資料更新頻率約每小時一次
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

type HeroStatProps = {
  label: string;
  value: string;
};

function HeroStat({ label, value }: HeroStatProps) {
  return (
    <div>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

