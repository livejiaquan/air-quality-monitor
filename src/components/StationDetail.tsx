import { MapPinned, Navigation } from 'lucide-react';
import type { AqiStationRecord, SourceKind } from '../lib/aqi';
import { getObservationPresentation } from '../lib/observationPresentation';
import { ObservationMeta } from './ObservationMeta';
import { PollutantReadings } from './PollutantReadings';
import { StatusBadge } from './StatusBadge';

export function StationDetail({ station, sourceKind }: { station: AqiStationRecord; sourceKind: SourceKind }) {
  const observation = getObservationPresentation(station, sourceKind);
  const canAdvise = observation.isCurrent;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-sm font-bold text-[#52706a]"><MapPinned aria-hidden="true" className="h-4 w-4 shrink-0" />{station.county} · 所在地測站</p>
      <h2 className="mt-2 break-words text-2xl font-black text-[#10211c] sm:text-3xl">{station.stationName}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className={`min-w-24 rounded-2xl border-2 bg-[#f8fbf9] px-4 py-3 ${canAdvise ? '' : 'border-dashed'}`} style={{ borderColor: observation.borderColor }}>
          <p className="text-sm font-bold text-[#52706a]">{observation.valueLabel}</p>
          <p className="mt-1 text-4xl font-black leading-none tabular-nums text-[#10211c]">{station.aqi}</p>
        </div>
        <div className="min-w-0 flex-1 basis-28">
          {canAdvise ? <StatusBadge category={station.category} /> : <p className="text-sm font-bold leading-6 text-amber-900">{observation.label}<br />不代表現在狀況</p>}
          <p className="mt-2 text-sm leading-6 text-[#52706a]">主要污染物 <strong className="font-bold text-[#24473e]">{station.mainPollutant}</strong></p>
        </div>
      </div>
      <div className="mt-4"><ObservationMeta station={station} sourceKind={sourceKind} /></div>
      <section className={`mt-5 rounded-xl border p-4 ${canAdvise ? 'border-[#b9d9d2] bg-[#eff9f6]' : 'border-amber-200 bg-amber-50'}`} aria-label={canAdvise ? '目前活動提醒' : '現在建議已暫停'}>
        <h3 className="flex items-center gap-2 text-base font-black text-[#24473e]"><Navigation aria-hidden="true" className="h-4 w-4 shrink-0" />{canAdvise ? '目前活動提醒' : '現在建議已暫停'}</h3>
        <p className="mt-2 text-base font-bold leading-7 text-[#10211c]">{canAdvise ? station.category.advice.short : '此筆資料僅保留查核，不作現在判斷。'}</p>
        {canAdvise && <div className="mt-4 space-y-4 border-t border-[#b9d9d2] pt-4">
          <div><h4 className="text-sm font-bold text-[#24473e]">一般民眾</h4><p className="mt-1 text-sm leading-6 text-[#36544c]">{station.category.advice.general}</p></div>
          <div><h4 className="text-sm font-bold text-[#24473e]">敏感族群</h4><p className="mt-1 text-sm leading-6 text-[#36544c]">{station.category.advice.sensitive}</p></div>
        </div>}
      </section>
      <details className="station-disclosure mt-5">
        <summary>查看 6 項污染物濃度</summary>
        <div className="pt-3"><PollutantReadings station={station} label={canAdvise ? '目前污染物數值' : sourceKind === 'official-cache' ? '快取污染物數值，非現在狀況' : '展示污染物數值，非現在狀況'} /></div>
      </details>
    </div>
  );
}
