import { AQI_SCALE, AQI_SWATCHES, getScalePosition } from '../lib/palette';

export function AqiScale({ aqi }: { aqi: number | null }) {
  const position = aqi === null ? null : getScalePosition(aqi);

  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {AQI_SCALE.map((band) => (
            <span key={band.id} className="flex-1" style={{ background: AQI_SWATCHES[band.id].fill, opacity: aqi === null ? 0.35 : 1 }} />
          ))}
        </div>
        {position !== null && (
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-surface shadow"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="tabular mt-1.5 grid grid-cols-6 text-[10px] text-faint" aria-hidden="true">
        {AQI_SCALE.map((band) => (
          <span key={band.id} className="text-right">
            {band.max}
          </span>
        ))}
      </div>
      <p className="sr-only">AQI 分級：0–50 良好、51–100 普通、101–150 對敏感族群不健康、151–200 對所有族群不健康、201–300 非常不健康、301 以上危害。</p>
    </div>
  );
}
