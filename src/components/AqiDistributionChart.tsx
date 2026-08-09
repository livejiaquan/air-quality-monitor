import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { AQI_CATEGORIES, type AqiSummary } from '../lib/aqi';

type AqiDistributionChartProps = {
  summary: AqiSummary;
};

export function AqiDistributionChart({ summary }: AqiDistributionChartProps) {
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const data = AQI_CATEGORIES.filter((category) => category.id !== 'unknown').map((category) => ({
    id: category.id,
    name: category.label,
    count: summary.categoryCounts[category.id],
    color: category.color
  }));

  useEffect(() => {
    const node = chartShellRef.current;
    if (!node) return undefined;

    const updateWidth = () => setChartWidth(Math.max(240, Math.floor(node.getBoundingClientRect().width)));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="min-w-0 self-start rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">AQI Distribution</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">空氣品質級距分布</h2>
        </div>
        <p className="text-sm text-slate-500">{summary.stationCount} 個測站</p>
      </div>
      <div ref={chartShellRef} className="mt-5 h-72 min-h-72 min-w-0">
        {chartWidth > 0 ? (
          <BarChart width={chartWidth} height={288} data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={118} tick={{ fill: '#475569', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px -22px rgb(15 23 42 / 0.35)' }}
              formatter={(value) => [`${value} 測站`, '數量']}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <div className="h-full rounded-lg bg-slate-100" />
        )}
      </div>
    </section>
  );
}
