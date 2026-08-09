import { describe, expect, it } from 'vitest';
import { getTaiwanMapPoint, sortStationsForMap } from './mapLayout';
import type { AqiStationRecord } from './aqi';

const baseStation: AqiStationRecord = {
  siteId: 'base',
  stationName: '測試',
  county: '測試縣',
  aqi: 50,
  status: '良好',
  mainPollutant: '無明顯污染物',
  pollutantValues: {
    pm25: null,
    pm10: null,
    o3: null,
    o3_8hr: null,
    co: null,
    so2: null,
    no2: null
  },
  publishTime: '2026/05/30 09:00:00',
  publishTimeISO: '2026-05-30T09:00:00+08:00',
  hoursSinceUpdate: 1,
  isStale: false,
  hasFutureTimestamp: false,
  longitude: 120.9,
  latitude: 23.7,
  categoryId: 'good',
  category: {
    id: 'good',
    label: '良好',
    englishLabel: 'Good',
    min: 0,
    max: 50,
    severity: 1,
    color: '#16803c',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    advice: {
      general: '空氣品質良好。',
      sensitive: '正常活動。',
      short: '適合戶外活動'
    }
  }
};

describe('Taiwan map layout', () => {
  it('projects Taiwan station coordinates into bounded percentage positions', () => {
    const point = getTaiwanMapPoint({
      ...baseStation,
      longitude: 121.15,
      latitude: 22.75
    });

    expect(point).toEqual({
      x: expect.any(Number),
      y: expect.any(Number)
    });
    expect(point!.x).toBeGreaterThanOrEqual(4);
    expect(point!.x).toBeLessThanOrEqual(96);
    expect(point!.y).toBeGreaterThanOrEqual(4);
    expect(point!.y).toBeLessThanOrEqual(96);
  });

  it('returns null for stations without coordinates', () => {
    expect(getTaiwanMapPoint({ ...baseStation, longitude: null })).toBeNull();
    expect(getTaiwanMapPoint({ ...baseStation, latitude: null })).toBeNull();
  });

  it('draws high-risk stations last so they stay visible', () => {
    const stations = [
      { ...baseStation, siteId: 'safe', aqi: 32 },
      { ...baseStation, siteId: 'risk', aqi: 156 },
      { ...baseStation, siteId: 'moderate', aqi: 88 }
    ];

    expect(sortStationsForMap(stations).map((station) => station.siteId)).toEqual(['safe', 'moderate', 'risk']);
  });
});
