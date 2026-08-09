import { describe, expect, it } from 'vitest';
import {
  getAqiCategory,
  getFreshness,
  normalizeAqiPayload,
  summarizeAqiDataset
} from './aqi';

const rawRecords = [
  {
    sitename: '麥寮',
    county: '雲林縣',
    aqi: '156',
    pollutant: 'PM2.5',
    status: '對所有族群不健康',
    'pm2.5': '58',
    pm10: '112',
    o3: '31',
    co: '0.44',
    so2: '2.2',
    no2: '19',
    publishtime: '2026/05/30 09:00:00',
    longitude: '120.251825',
    latitude: '23.753506',
    siteid: '83'
  },
  {
    sitename: '臺東',
    county: '臺東縣',
    aqi: '32',
    pollutant: '',
    status: '良好',
    'pm2.5': '7',
    pm10: '18',
    o3: '29',
    co: '0.18',
    so2: '0.8',
    no2: '4',
    publishtime: '2026/05/30 09:00:00',
    longitude: '121.15045',
    latitude: '22.755358',
    siteid: '62'
  },
  {
    sitename: '新店',
    county: '新北市',
    aqi: '82',
    pollutant: 'O3',
    status: '普通',
    'pm2.5': '16',
    pm10: '35',
    o3: '58',
    co: '0.31',
    so2: '1.5',
    no2: '12',
    publishtime: '2026/05/30 08:00:00',
    longitude: '121.537778',
    latitude: '24.977222',
    siteid: '04'
  },
  {
    sitename: '壞資料',
    county: '測試縣',
    aqi: '',
    publishtime: '2026/05/30 09:00:00'
  }
];

describe('AQI categories', () => {
  it('maps official Taiwan AQI ranges to semantic categories', () => {
    expect(getAqiCategory(0).id).toBe('good');
    expect(getAqiCategory(50).id).toBe('good');
    expect(getAqiCategory(51).id).toBe('moderate');
    expect(getAqiCategory(100).id).toBe('moderate');
    expect(getAqiCategory(101).id).toBe('sensitive');
    expect(getAqiCategory(150).id).toBe('sensitive');
    expect(getAqiCategory(151).id).toBe('unhealthy');
    expect(getAqiCategory(201).id).toBe('veryUnhealthy');
    expect(getAqiCategory(301).id).toBe('hazardous');
    expect(getAqiCategory(null).id).toBe('unknown');
  });
});

describe('AQI normalization', () => {
  it('normalizes MOENV rows, drops malformed rows, and preserves warnings', () => {
    const dataset = normalizeAqiPayload(
      { records: rawRecords },
      {
        generatedAt: '2026-05-30T02:10:00.000Z',
        sourceKind: 'sample'
      }
    );

    expect(dataset.records).toHaveLength(3);
    expect(dataset.records[0]).toMatchObject({
      stationName: '麥寮',
      county: '雲林縣',
      aqi: 156,
      categoryId: 'unhealthy',
      mainPollutant: 'PM2.5',
      pollutantValues: {
        pm25: 58,
        pm10: 112,
        o3: 31
      }
    });
    expect(dataset.warnings).toContain('Dropped 1 malformed station row.');
    expect(dataset.source.kind).toBe('sample');
  });

  it('summarizes national and county-level risk correctly', () => {
    const dataset = normalizeAqiPayload(
      { records: rawRecords },
      {
        generatedAt: '2026-05-30T02:10:00.000Z',
        sourceKind: 'official-cache'
      }
    );
    const summary = summarizeAqiDataset(dataset.records, '2026-05-30T02:10:00.000Z');

    expect(summary.stationCount).toBe(3);
    expect(summary.healthyStationCount).toBe(2);
    expect(summary.unhealthyStationCount).toBe(1);
    expect(summary.worstStation?.stationName).toBe('麥寮');
    expect(summary.safestStations.map((station) => station.stationName)).toEqual(['臺東', '新店']);
    expect(summary.counties[0]).toMatchObject({
      county: '雲林縣',
      maxAqi: 156,
      categoryId: 'unhealthy'
    });
  });

  it('marks hourly official data stale after three hours', () => {
    const fresh = getFreshness('2026-05-30T01:00:00.000Z', '2026-05-30T02:59:00.000Z');
    const stale = getFreshness('2026-05-30T01:00:00.000Z', '2026-05-30T04:01:00.000Z');

    expect(fresh.isStale).toBe(false);
    expect(stale.isStale).toBe(true);
    expect(stale.hoursSinceUpdate).toBeCloseTo(3.02, 2);
  });
});

