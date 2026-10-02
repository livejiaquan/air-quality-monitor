import type { AqiCategoryId, AqiStationRecord, SourceKind } from './aqi';
import { getObservationPresentation } from './observationPresentation';

export type StationFilters = {
  county: string;
  category: AqiCategoryId | 'all';
  availability: 'all' | 'current' | 'noncurrent';
  query: string;
};

export const DEFAULT_STATION_FILTERS: StationFilters = { county: 'all', category: 'all', availability: 'all', query: '' };
export const STATIONS_PER_PAGE = 12;

export function filterStations(stations: AqiStationRecord[], sourceKind: SourceKind, filters: StationFilters) {
  const keyword = filters.query.trim().toLocaleLowerCase();
  return stations.filter((station) => {
    if (filters.county !== 'all' && station.county !== filters.county) return false;
    if (filters.category !== 'all' && station.categoryId !== filters.category) return false;
    const current = getObservationPresentation(station, sourceKind).isCurrent;
    if (filters.availability === 'current' && !current) return false;
    if (filters.availability === 'noncurrent' && current) return false;
    return !keyword || `${station.stationName} ${station.county} ${station.mainPollutant}`.toLocaleLowerCase().includes(keyword);
  }).sort((a, b) => a.county.localeCompare(b.county, 'zh-Hant') || a.stationName.localeCompare(b.stationName, 'zh-Hant') || a.siteId.localeCompare(b.siteId));
}
