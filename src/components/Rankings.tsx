import type { AqiStationRecord } from '../lib/aqi';
import { AQI_SWATCHES } from '../lib/palette';

type RankingsProps = {
  stations: AqiStationRecord[];
  onSelect: (station: AqiStationRecord) => void;
};

const ROWS = 5;

/** Paired "highest / lowest" ranking cards, after IQAir's most/least polluted city tables. */
export function Rankings({ stations, onSelect }: RankingsProps) {
  const sorted = [...stations].sort((a, b) => b.aqi - a.aqi);
  const highest = sorted.slice(0, ROWS);
  const lowest = sorted.slice(-ROWS).reverse();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <RankingCard title="AQI 最高的測站" subtitle="目前有效測站中空氣最差的五站" stations={highest} onSelect={onSelect} />
      <RankingCard title="AQI 最低的測站" subtitle="目前有效測站中空氣最好的五站" stations={lowest} onSelect={onSelect} />
    </div>
  );
}

function RankingCard({ title, subtitle, stations, onSelect }: { title: string; subtitle: string } & RankingsProps) {
  return (
    <section className="rounded-card bg-surface p-4 ring-1 ring-line sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-sm text-muted">{subtitle}</p>
      <table className="mt-4 w-full text-base">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th scope="col" className="w-8 pb-2 font-normal">#</th>
            <th scope="col" className="pb-2 font-normal">測站</th>
            <th scope="col" className="pb-2 text-right font-normal">AQI</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station, index) => {
            const swatch = AQI_SWATCHES[station.categoryId];
            return (
              <tr key={station.siteId} className="border-t border-line">
                <td className="tabular py-2 text-muted">{index + 1}</td>
                <td className="py-2">
                  <button type="button" onClick={() => onSelect(station)} className="min-h-11 text-left hover:underline">
                    {station.stationName}
                    <span className="ml-2 text-sm text-muted">{station.county}</span>
                  </button>
                </td>
                <td className="py-2 text-right">
                  <span className="tabular inline-block min-w-12 rounded px-2 text-center text-sm font-bold leading-6" style={{ background: swatch.fill, color: swatch.ink }}>
                    {station.aqi}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
