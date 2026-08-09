import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingDashboard() {
  return (
    <main id="main-content" role="status" aria-live="polite" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <p className="sr-only">正在載入空氣品質資料</p>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-64 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-96 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
          <div className="h-96 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}

type ErrorPanelProps = {
  onRetry: () => void;
};

export function ErrorPanel({ onRetry }: ErrorPanelProps) {
  return (
    <main id="main-content" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section role="alert" className="w-full rounded-lg border border-red-200 bg-white p-8 shadow-dashboard">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertTriangle aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">資料載入失敗</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">無法讀取 AQI 快取</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                目前無法取得空氣品質快取，因此沒有顯示舊值或活動結論。請檢查網路後重試；若仍失敗，可先查看環境部官方監測網。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  重新載入
                </button>
                <a
                  href="https://airtw.moenv.gov.tw/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  查看官方監測
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
