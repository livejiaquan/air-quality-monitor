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
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-lg border p-2.5 ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
