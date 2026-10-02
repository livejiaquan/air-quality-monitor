import { describe, expect, it } from 'vitest';
import { normalizeAqiPayload, recomputeAqiDatasetFreshness } from './aqi';
import { DEFAULT_STATION_FILTERS, filterStations } from './stationExplorer';

const nowISO = '2026-09-30T04:00:00Z';
const base = { county: '臺北市', publishtime: '2026/09/30 11:00:00', pollutant: 'PM2.5' };
const dataset = normalizeAqiPayload({ records: [
  { ...base, siteid: 'stale', sitename: '過期站', aqi: '450', publishtime: '2026/09/29 11:00:00' },
  { ...base, siteid: 'current', sitename: '甲站', aqi: '30' },
  { ...base, siteid: 'invalid', sitename: '缺時站', aqi: '20', publishtime: '' },
  { ...base, siteid: 'future', sitename: '未來站', aqi: '60', publishtime: '2026/09/30 12:15:01' },
  { ...base, siteid: 'other', sitename: '乙站', aqi: '60', county: '高雄市', pollutant: 'O3' }
] }, { nowISO, sourceKind: 'official-cache' });

const ids = (filters = DEFAULT_STATION_FILTERS, sourceKind: 'official-cache' | 'sample' | 'fallback' = 'official-cache') => filterStations(dataset.records, sourceKind, filters).map((station) => station.siteId);

describe('station explorer trust and filtering', () => {
  it('keeps every source row available without sorting old high values as a current risk ranking', () => {
    const ordered = filterStations(dataset.records, 'official-cache', DEFAULT_STATION_FILTERS);
    expect(ordered).toHaveLength(5);
    expect(ordered).toEqual([...ordered].sort((a, b) => a.county.localeCompare(b.county, 'zh-Hant') || a.stationName.localeCompare(b.stationName, 'zh-Hant')));
    expect(dataset.records[0].siteId).toBe('stale');
  });

  it('combines county and case-insensitive, trimmed pollutant search', () => {
    expect(ids({ ...DEFAULT_STATION_FILTERS, county: '臺北市', query: '  pm2.5 ', availability: 'current' })).toEqual(['current']);
    expect(ids({ ...DEFAULT_STATION_FILTERS, query: '高雄' })).toEqual(['other']);
    expect(ids({ ...DEFAULT_STATION_FILTERS, query: '甲站' })).toEqual(['current']);
  });

  it('excludes stale, missing and future timestamps from the current filter', () => {
    expect(ids({ ...DEFAULT_STATION_FILTERS, availability: 'current' }).sort()).toEqual(['current', 'other']);
    expect(ids({ ...DEFAULT_STATION_FILTERS, availability: 'noncurrent' }).sort()).toEqual(['future', 'invalid', 'stale']);
  });

  it.each(['sample', 'fallback'] as const)('never promotes %s data into the current filter', (sourceKind) => {
    expect(ids({ ...DEFAULT_STATION_FILTERS, availability: 'current' }, sourceKind)).toEqual([]);
    expect(ids({ ...DEFAULT_STATION_FILTERS, availability: 'noncurrent' }, sourceKind)).toHaveLength(5);
  });

  it('allows historical category inspection only with explicit noncurrent status', () => {
    expect(ids({ ...DEFAULT_STATION_FILTERS, category: 'hazardous', availability: 'noncurrent' })).toEqual(['stale']);
    expect(ids({ ...DEFAULT_STATION_FILTERS, category: 'hazardous', availability: 'current' })).toEqual([]);
  });

  it('reevaluates the current filter when retained data expires', () => {
    const expired = recomputeAqiDatasetFreshness(dataset, '2026-09-30T08:00:00Z');
    expect(filterStations(expired.records, 'official-cache', { ...DEFAULT_STATION_FILTERS, availability: 'current' })).toEqual([]);
  });

  it('returns no matches for combined incompatible filters and can reset without mutating defaults', () => {
    expect(ids({ ...DEFAULT_STATION_FILTERS, county: '高雄市', query: '甲站' })).toEqual([]);
    expect(ids()).toHaveLength(5);
    expect(DEFAULT_STATION_FILTERS).toEqual({ county: 'all', category: 'all', availability: 'all', query: '' });
  });
});
