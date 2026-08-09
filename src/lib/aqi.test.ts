import { describe, expect, it } from 'vitest';
import {
  getAqiCategory,
  getFreshness,
  normalizeAqiPayload,
  recomputeAqiDatasetFreshness,
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

  it('preserves key safeguards from the current MOENV audience guidance', () => {
    expect(getAqiCategory(75).advice.sensitive).toContain('仍可正常進行戶外活動');
    expect(getAqiCategory(125).advice.general).toContain('學生減少長時間劇烈運動');
    expect(getAqiCategory(125).advice.sensitive).toContain('必要外出配戴口罩');
    expect(getAqiCategory(175).advice.sensitive).toContain('留在室內並減少體力消耗');
    expect(getAqiCategory(250).advice.general).toContain('學生立即停止戶外活動');
    expect(getAqiCategory(350).advice.general).toContain('室內緊閉門窗');
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
      isStale: false,
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
    expect(summary.currentStationCount).toBe(3);
    expect(summary.staleStationCount).toBe(0);
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
    const exactBoundary = getFreshness('2026-05-30T01:00:00.000Z', '2026-05-30T04:00:00.000Z');
    const stale = getFreshness('2026-05-30T01:00:00.000Z', '2026-05-30T04:01:00.000Z');

    expect(fresh.isStale).toBe(false);
    expect(exactBoundary.isStale).toBe(true);
    expect(stale.isStale).toBe(true);
    expect(stale.hoursSinceUpdate).toBeCloseTo(3.02, 2);
  });

  it('excludes stale stations from current advice and rankings', () => {
    const dataset = normalizeAqiPayload(
      {
        records: [
          { ...rawRecords[0], aqi: '180', publishtime: '2026/05/29 09:00:00' },
          { ...rawRecords[1], aqi: '40', publishtime: '2026/05/30 09:00:00' }
        ]
      },
      {
        nowISO: '2026-05-30T10:00:00+08:00',
        sourceKind: 'official-cache'
      }
    );

    expect(dataset.summary.stationCount).toBe(2);
    expect(dataset.summary.currentStationCount).toBe(1);
    expect(dataset.summary.staleStationCount).toBe(1);
    expect(dataset.summary.worstStation?.stationName).toBe('臺東');
    expect(dataset.records.find((record) => record.stationName === '麥寮')?.isStale).toBe(true);
  });

  it('recomputes a loaded dataset when time crosses the hard freshness limit', () => {
    const dataset = normalizeAqiPayload(
      { records: [{ ...rawRecords[0], publishtime: '2026/05/30 09:00:00' }] },
      { nowISO: '2026-05-30T11:59:00+08:00', sourceKind: 'official-cache' }
    );

    expect(dataset.summary.currentStationCount).toBe(1);

    const agedDataset = recomputeAqiDatasetFreshness(dataset, '2026-05-30T12:00:00+08:00');

    expect(agedDataset.records[0]).toMatchObject({ isStale: true, hoursSinceUpdate: 3 });
    expect(agedDataset.summary.currentStationCount).toBe(0);
    expect(agedDataset.summary.worstStation).toBeNull();
  });

  it('rejects impossible AQI values and treats future timestamps as stale', () => {
    const dataset = normalizeAqiPayload(
      {
        records: [
          { ...rawRecords[0], siteid: 'negative', aqi: '-1' },
          { ...rawRecords[1], siteid: 'too-high', aqi: '501' },
          { ...rawRecords[2], siteid: 'future', publishtime: '2026/05/30 12:00:00' }
        ]
      },
      {
        nowISO: '2026-05-30T10:00:00+08:00',
        sourceKind: 'official-cache'
      }
    );

    expect(dataset.records).toHaveLength(1);
    expect(dataset.records[0]).toMatchObject({
      siteId: 'future',
      isStale: true,
      hasFutureTimestamp: true
    });
    expect(dataset.summary.currentStationCount).toBe(0);
    expect(dataset.summary.futureTimestampCount).toBe(1);
    expect(dataset.warnings).toContain('Dropped 2 malformed station rows.');
  });

  it('rejects impossible dates and drops duplicate station ids before summarizing', () => {
    const dataset = normalizeAqiPayload(
      {
        records: [
          { ...rawRecords[0], siteid: 'duplicate', publishtime: '2026/02/30 09:00:00' },
          { ...rawRecords[1], siteid: 'duplicate', publishtime: '2026/05/30 09:00:00' },
          { ...rawRecords[2], siteid: 'duplicate', publishtime: '2026/05/30 09:00:00' }
        ]
      },
      {
        nowISO: '2026-05-30T10:00:00+08:00',
        sourceKind: 'official-cache'
      }
    );

    expect(dataset.records).toHaveLength(1);
    expect(dataset.records[0]).toMatchObject({ stationName: '麥寮', isStale: true });
    expect(dataset.summary.currentStationCount).toBe(0);
    expect(dataset.warnings).toContain('Dropped 2 duplicate station rows.');
  });
});
