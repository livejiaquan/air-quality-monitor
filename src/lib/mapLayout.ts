import type { AqiStationRecord, SourceKind } from './aqi';
import { getObservationPresentation } from './observationPresentation';

type MapPoint = {
  x: number;
  y: number;
};

const MAIN_ISLAND_VERTICAL_BOUNDS = {
  minLat: 21.9,
  maxLat: 25.4
};

const MAIN_ISLAND_CENTER_LNG = 120.9;
const MAIN_ISLAND_LNG_SCALE = 18;

const OFFSHORE_POINTS: Record<string, MapPoint> = {
  金門縣: { x: 14, y: 43 },
  連江縣: { x: 24, y: 18 }
};

const MAP_PADDING = 10;

export function getTaiwanMapPoint(station: AqiStationRecord): MapPoint | null {
  if (typeof station.longitude !== 'number' || typeof station.latitude !== 'number') {
    return null;
  }

  if (station.county in OFFSHORE_POINTS) {
    return OFFSHORE_POINTS[station.county];
  }

  const x = 50 + (station.longitude - MAIN_ISLAND_CENTER_LNG) * MAIN_ISLAND_LNG_SCALE;
  const yRatio =
    1 -
    (station.latitude - MAIN_ISLAND_VERTICAL_BOUNDS.minLat) /
      (MAIN_ISLAND_VERTICAL_BOUNDS.maxLat - MAIN_ISLAND_VERTICAL_BOUNDS.minLat);

  return {
    x: clamp(x, MAP_PADDING, 100 - MAP_PADDING),
    y: clamp(MAP_PADDING + yRatio * (100 - MAP_PADDING * 2), MAP_PADDING, 100 - MAP_PADDING)
  };
}

export function sortStationsForMap(stations: AqiStationRecord[]): AqiStationRecord[] {
  return [...stations].sort((a, b) => a.aqi - b.aqi);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value * 10) / 10));
}

// County views keep noncurrent stations discoverable, even when other counties
// have current data. National views prefer current observations, with at most
// one representative per county; noncurrent values never determine a ranking.
export function getVisibleMapStations(records: AqiStationRecord[], sourceKind: SourceKind, county: string): AqiStationRecord[] {
  const mappable = records.filter((station) => getTaiwanMapPoint(station) !== null);
  if (county !== 'all') {
    return mappable.filter((station) => station.county === county).sort((a, b) => {
      const aCurrent = getObservationPresentation(a, sourceKind).isCurrent;
      const bCurrent = getObservationPresentation(b, sourceKind).isCurrent;
      // Paint current observations last so old high-AQI records cannot hide them.
      return Number(aCurrent) - Number(bCurrent) || (aCurrent ? a.aqi - b.aqi : a.stationName.localeCompare(b.stationName, 'zh-Hant'));
    });
  }
  const current = mappable.filter((station) => getObservationPresentation(station, sourceKind).isCurrent);
  const candidates = current.length ? current : [...mappable].sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-Hant'));
  const representative = new Map<string, AqiStationRecord>();
  candidates.forEach((station) => {
    const saved = representative.get(station.county);
    if (!saved || (current.length > 0 && station.aqi > saved.aqi)) representative.set(station.county, station);
  });
  const stations = [...representative.values()];
  if (current.length) return sortStationsForMap(stations.sort((a, b) => b.aqi - a.aqi).slice(0, 12));
  return stations.sort((a, b) => a.county.localeCompare(b.county, 'zh-Hant')).slice(0, 12);
}
