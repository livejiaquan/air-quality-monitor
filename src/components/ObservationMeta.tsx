import type { AqiStationRecord, SourceKind } from '../lib/aqi';
import { getObservationPresentation } from '../lib/observationPresentation';

export function ObservationMeta({ station, sourceKind }: { station: AqiStationRecord; sourceKind: SourceKind }) {
  const observation = getObservationPresentation(station, sourceKind);
  return (
    <div className="observation-meta">
      <p>發布時間：{station.publishTimeISO ? <time dateTime={station.publishTimeISO}>{observation.publishedAt}</time> : observation.publishedAt}（台灣時間）</p>
      <p className="mt-1 font-semibold">{observation.label} · {observation.ageLabel}</p>
    </div>
  );
}
