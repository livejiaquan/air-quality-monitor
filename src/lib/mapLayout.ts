import type { AqiStationRecord } from './aqi';

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
