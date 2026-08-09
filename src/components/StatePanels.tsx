import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    </main>
  );
}

type ErrorPanelProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-lg border border-red-200 bg-white p-8 shadow-dashboard">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertTriangle aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">資料載入失敗</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">無法讀取 AQI 快取</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                重新載入
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

