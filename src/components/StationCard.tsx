import { ArrowUpRight, MapPin } from 'lucide-react';
import type { AqiStationRecord, SourceKind } from '../lib/aqi';
import { getObservationPresentation } from '../lib/observationPresentation';
import { ObservationMeta } from './ObservationMeta';
import { PollutantReadings } from './PollutantReadings';
import { StatusBadge } from './StatusBadge';

type StationCardProps = {
  station: AqiStationRecord;
  sourceKind: SourceKind;
  selected?: boolean;
  onSelect?: (station: AqiStationRecord) => void;
};

export function StationCard({ station, sourceKind, selected = false, onSelect }: StationCardProps) {
  const observation = getObservationPresentation(station, sourceKind);
  const canInformNow = observation.isCurrent;
  const pollutantLabel = canInformNow ? '主要污染物' : sourceKind === 'official-cache' ? '快取污染物 · 非現在狀況' : '展示污染物 · 非現在狀況';

  return (
    <article className={`min-w-0 rounded-2xl border bg-white p-4 shadow-soft sm:p-5 ${selected ? 'border-[#0f766e] ring-2 ring-[#0f766e]/20' : 'border-[#c9d7d1]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-[#52706a]"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />{station.county}</p>
          <h3 className="mt-1 break-words text-xl font-black leading-7 text-[#10211c]">{station.stationName}</h3>
        </div>
        {selected && <span className="rounded-full bg-[#e6f5f1] px-2.5 py-1 text-sm font-bold text-[#0f625c]">已選測站</span>}
      </div>
      <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border-l-4 bg-[#f8fbf9] p-3 ${canInformNow ? '' : 'border-dashed'}`} style={{ borderColor: observation.borderColor }}>
        <div className="min-w-20">
          <p className="text-sm font-semibold text-[#52706a]">{observation.valueLabel}</p>
          <p className="mt-1 text-3xl font-black leading-none tabular-nums text-[#10211c]">{station.aqi}</p>
        </div>
        {canInformNow ? <StatusBadge category={station.category} /> : <p className="text-sm font-bold leading-6 text-amber-900">{observation.label}<br />不代表現在狀況</p>}
      </div>
      <div className="mt-4"><ObservationMeta station={station} sourceKind={sourceKind} /></div>
      <p className="mt-3 text-sm leading-6 text-[#52706a]">{pollutantLabel}<br /><strong className="text-base font-bold text-[#24473e]">{station.mainPollutant}</strong></p>
      {onSelect && <a href="#selected-station" onClick={() => onSelect(station)} className="mt-4 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#b8cbc4] px-3 py-2 text-sm font-bold text-[#0f625c] transition hover:border-[#0f766e] hover:bg-[#eff9f6]" aria-label={`查看 ${station.county} ${station.stationName} 的${canInformNow ? '活動提醒' : '資料狀態'}`}>
        {canInformNow ? '查看活動提醒' : '查看資料狀態'}<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </a>}
      <details className="station-disclosure mt-4">
        <summary>污染物與{canInformNow ? '活動提醒' : '資料說明'}</summary>
        <div className="space-y-4 pt-3">
          <PollutantReadings station={station} label={pollutantLabel} />
          {!canInformNow ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">{observation.label}，不代表現在狀況，因此不提供活動建議。</p> : <div className="space-y-3 rounded-xl bg-[#eff9f6] p-3 text-sm leading-6 text-[#36544c]">
            <p><strong className="block text-[#24473e]">一般民眾</strong>{station.category.advice.general}</p>
            <p><strong className="block text-[#24473e]">敏感族群</strong>{station.category.advice.sensitive}</p>
          </div>}
        </div>
      </details>
    </article>
  );
}
