import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingDashboard() {
  return (
    <main id="main-content" role="status" aria-live="polite" className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6">
      <p className="sr-only">正在載入空氣品質資料</p>
      <div className="h-72 animate-pulse rounded-card bg-sunken" />
      <div className="h-[28rem] animate-pulse rounded-card bg-sunken" />
    </main>
  );
}

export function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <section role="alert" className="rounded-card ring-1 ring-line bg-surface p-8 text-center shadow-card">
        <AlertTriangle aria-hidden="true" className="mx-auto h-9 w-9 text-warn" />
        <h1 className="mt-4 text-xl font-bold">暫時無法載入空氣品質資料</h1>
        <p className="mx-auto mt-2 max-w-md text-base text-muted">可能是網路連線問題或資料快取暫時無法讀取。你可以重試，或直接前往環境部監測網查看。</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-control bg-accent px-6 text-base font-bold text-white dark:text-canvas"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            重新載入
          </button>
          <a href="https://airtw.moenv.gov.tw/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-control border border-line px-6 text-base font-bold">
            環境部空氣品質監測網
          </a>
        </div>
      </section>
    </main>
  );
}
