import type { LucideIcon } from 'lucide-react';

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'teal' | 'green' | 'amber' | 'red' | 'slate';
};

const toneClasses = {
  teal: 'border-teal-200 bg-teal-50 text-teal-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-900',
  slate: 'border-slate-200 bg-slate-50 text-slate-700'
};

export function MetricCard({ title, value, detail, icon: Icon, tone = 'teal' }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-[#c9d7d1] bg-white/90 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#52706a]">{title}</p>
          <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-[#10211c]">{value}</p>
        </div>
        <div className={`rounded-lg border p-2.5 ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52706a]">{detail}</p>
    </article>
  );
}
