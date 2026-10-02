import type { AqiCategory } from '../lib/aqi';

type StatusBadgeProps = {
  category: AqiCategory;
  value?: number | null;
  compact?: boolean;
};

export function StatusBadge({ category, value, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 font-semibold tabular-nums ${category.bgClass} ${category.textClass} ${category.borderClass} text-sm ${compact ? 'leading-5' : 'leading-6'}`}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      {value !== undefined && value !== null ? `AQI ${value}` : category.label}
    </span>
  );
}
