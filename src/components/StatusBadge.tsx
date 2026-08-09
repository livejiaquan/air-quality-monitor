import type { AqiCategory } from '../lib/aqi';

type StatusBadgeProps = {
  category: AqiCategory;
  value?: number | null;
  compact?: boolean;
};

export function StatusBadge({ category, value, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${category.bgClass} ${category.textClass} ${category.borderClass} ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
      {value !== undefined && value !== null ? `AQI ${value}` : category.label}
    </span>
  );
}

