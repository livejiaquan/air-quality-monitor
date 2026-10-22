import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingDashboard() {
  return (
    <main id="main-content" role="status" aria-live="polite" className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
      <p className="sr-only">正在載入空氣品質資料</p>
      <div className="h-72 animate-pulse rounded-3xl bg-sunken" />
      <div className="h-[28rem] animate-pulse rounded-3xl bg-sunken" />
    </main>
  );
}

export function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <section role="alert" className="rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <AlertTriangle aria-hidden="true" className="mx-auto h-9 w-9 text-warn" />
        <h1 className="mt-4 text-xl font-bold">暫時無法載入空氣品質資料</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">可能是網路連線問題或資料快取暫時無法讀取。你可以重試，或直接前往環境部監測網查看。</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white dark:text-canvas"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            重新載入
          </button>
          <a href="https://airtw.moenv.gov.tw/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-bold">
            環境部空氣品質監測網
          </a>
        </div>
      </section>
    </main>
  );
}
