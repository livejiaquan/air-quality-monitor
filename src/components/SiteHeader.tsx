import { Wind } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <a href="#main-content" className="group inline-flex items-center gap-3 rounded-xl" aria-label="台灣生活資料誌：空氣品質首頁">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f766e] text-white shadow-[0_8px_20px_-12px_rgba(15,118,110,.8)]">
          <Wind aria-hidden="true" className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[11px] font-bold tracking-[0.14em] text-[#52706a]">台灣生活資料誌</span>
          <span className="block text-sm font-black tracking-tight text-[#10211c]">空氣品質</span>
        </span>
      </a>
      <span className="hidden rounded-full border border-[#c9d7d1] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#36544c] sm:block">AQI · 測站速查</span>
    </header>
  );
}
