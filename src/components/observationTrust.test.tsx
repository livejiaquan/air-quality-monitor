import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Dashboard } from '../App';
import { normalizeAqiPayload, recomputeAqiDatasetFreshness, type AqiDataset, type SourceKind } from '../lib/aqi';
import { getVisibleMapStations } from '../lib/mapLayout';
import { getObservationPresentation, NONCURRENT_COLOR } from '../lib/observationPresentation';
import { StationCard } from './StationCard';
import { TaiwanAirMap } from './TaiwanAirMap';

const nowISO = '2026-09-30T04:00:00Z';
const row = {
  siteid: 'a', sitename: '甲站', county: '臺北市', aqi: '30',
  publishtime: '2026/09/30 11:00:00', longitude: '121.5', latitude: '25.0'
};
const noop = () => undefined;
function fixture(overrides = {}, sourceKind: SourceKind = 'official-cache') {
  return normalizeAqiPayload({ records: [{ ...row, ...overrides }] }, { nowISO, generatedAt: nowISO, sourceKind });
}
function mapMarkup(dataset: AqiDataset, selectedCounty = 'all', selected = true) {
  return renderToStaticMarkup(<TaiwanAirMap dataset={dataset} selectedCounty={selectedCounty} selectedStation={selected ? dataset.records[0] ?? null : null} onCountyChange={noop} onStationSelect={noop} onRefresh={noop} isRefreshing={false} />);
}
function markerMarkup(html: string) {
  return [...html.matchAll(/<button\b[^>]*class="air-map-marker[^>]*>[\s\S]*?<\/button>/g)].map((match) => match[0]);
}
function summaryMarkup(dataset: AqiDataset) {
  const html = renderToStaticMarkup(<Dashboard dataset={dataset} isRefreshing={false} refreshError={null} onRefresh={noop} />);
  return html.match(/<section aria-label="當期資料摘要"[\s\S]*?<\/section>/)?.[0] ?? '';
}

describe('observation trust rendering', () => {
  it('keeps current official AQI color, number, time, category, and activity guidance', () => {
    const dataset = fixture();
    const html = mapMarkup(dataset);
    const [marker] = markerMarkup(html);
    expect(marker).toContain('border-color:#16803c');
    expect(marker).toContain('<span>30</span>');
    expect(marker).toContain('目前可用，AQI 30');
    expect(marker).toContain('2026/09/30 11:00');
    expect(marker).toContain('良好');
    expect(marker).toContain('aria-pressed="true"');
    expect(html).toContain('目前活動提醒');
    expect(html).toContain('一般民眾可正常進行戶外活動。');
    expect(html).not.toContain('現在建議已暫停');
  });

  it('preserves current hazardous color and advice rather than neutralizing valid risk', () => {
    const dataset = fixture({ aqi: '350' });
    const html = mapMarkup(dataset);
    expect(markerMarkup(html)[0]).toContain('border-color:#7f1d1d');
    expect(markerMarkup(html)[0]).toContain('<span>350</span>');
    expect(markerMarkup(html)[0]).toContain('危害');
    expect(html).toContain('一般民眾避免戶外活動');
    expect(html).not.toContain('現在建議已暫停');
    const card = renderToStaticMarkup(<StationCard station={dataset.records[0]} sourceKind="official-cache" />);
    expect(card).toContain('border-color:#7f1d1d');
    expect(card).toContain('一般民眾避免戶外活動');
  });

  it.each([
    ['過期', { publishtime: '2026/09/30 08:00:00' }, '資料過期'],
    ['缺時', { publishtime: '' }, '發布時間未知'],
    ['缺時', { publishtime: 'invalid date' }, '發布時間未知'],
    ['異常', { publishtime: '2026/09/30 12:15:01' }, '發布時間異常']
  ])('renders %s without a current-looking marker or good-AQI border', (markerText, overrides, status) => {
    const dataset = fixture(overrides);
    const html = mapMarkup(dataset);
    const [marker] = markerMarkup(html);
    expect(marker).toContain(`<span>${markerText}</span>`);
    expect(marker).toContain('border-dashed');
    expect(marker).toContain(`border-color:${NONCURRENT_COLOR}`);
    expect(marker).toContain(status);
    expect(marker).toContain('不代表現在狀況');
    expect(marker).not.toContain('<span>30</span>');
    expect(html).toContain('圖中沒有當期資料');
    expect(html).toContain('現在建議已暫停');
    expect(html).toContain('快取 AQI');
    expect(html).not.toContain('border-color:#16803c');
    expect(html).not.toContain('bg-[#16803c]');
    expect(html).not.toContain('一般民眾可正常進行戶外活動。');
    expect(html).not.toContain('opacity-55');

    const card = renderToStaticMarkup(<StationCard station={dataset.records[0]} sourceKind={dataset.source.kind} />);
    expect(card).toContain(status);
    expect(card).toContain(`border-color:${NONCURRENT_COLOR}`);
    expect(card).not.toContain('border-color:#16803c');
    expect(card).not.toContain('一般民眾可正常進行戶外活動。');
  });

  it.each(['sample', 'fallback'] as const)('never treats fresh %s records as current', (sourceKind) => {
    const dataset = fixture({}, sourceKind);
    expect(dataset.records[0].isStale).toBe(false);
    const html = mapMarkup(dataset, '臺北市');
    const [marker] = markerMarkup(html);
    expect(marker).toContain('<span>展示</span>');
    expect(marker).toContain('展示 AQI 30');
    expect(marker).toContain(`border-color:${NONCURRENT_COLOR}`);
    expect(html).toContain('甲站（展示資料）');
    expect(html).toContain('圖中沒有當期資料');
    expect(html).toContain('現在建議已暫停');
    expect(html).not.toContain('border-color:#16803c');
    const card = renderToStaticMarkup(<StationCard station={dataset.records[0]} sourceKind={sourceKind} />);
    expect(card).toContain('展示污染物 · 非現在狀況');
    expect(card).toContain(`border-color:${NONCURRENT_COLOR}`);
  });

  it.each([
    fixture({ publishtime: '2026/09/29 11:00:00' }),
    fixture({}, 'sample'),
    fixture({}, 'fallback'),
    normalizeAqiPayload([], { nowISO, sourceKind: 'official-cache' })
  ])('neutralizes current summary tones with no current official data', (dataset) => {
    const html = summaryMarkup(dataset);
    expect(html).toContain('目前可用測站');
    expect(html).toContain(`0 / ${dataset.records.length}`);
    expect(html).toContain('等待可信且新鮮的官方快取');
    expect(html).not.toContain('text-emerald-800');
    expect(html).not.toContain('text-teal-800');
    expect(html).not.toContain('text-amber-900');
    expect(html).not.toContain('text-red-900');
  });

  it('stops selected-station guidance when a retained cache crosses exactly three hours', () => {
    const initial = fixture({ publishtime: '2026/09/30 09:00:01' });
    const before = mapMarkup(initial);
    expect(before).toContain('目前活動提醒');
    expect(before).toContain('2.9 小時前');
    expect(before).not.toContain('3.0 小時前');
    const retained = recomputeAqiDatasetFreshness(initial, '2026-09-30T04:00:01Z');
    const after = mapMarkup(retained);
    expect(markerMarkup(after)[0]).toContain('<span>過期</span>');
    expect(after).not.toContain('目前活動提醒');
    expect(after).toContain('現在建議已暫停');
    const dashboard = renderToStaticMarkup(<Dashboard dataset={retained} isRefreshing={false} refreshError="network error" onRefresh={noop} />);
    expect(dashboard).toContain('背景更新失敗');
    expect(dashboard).toContain('現在排行與活動建議已暫停');
    expect(dashboard).not.toContain('目前活動提醒');
  });

  it('preserves the documented 15-minute future tolerance without accepting later data', () => {
    expect(getObservationPresentation(fixture({ publishtime: '2026/09/30 12:15:00' }).records[0], 'official-cache').isCurrent).toBe(true);
    expect(getObservationPresentation(fixture({ publishtime: '2026/09/30 12:15:01' }).records[0], 'official-cache').state).toBe('invalid-time');
  });
});

describe('map availability and scope', () => {
  const mixed = normalizeAqiPayload({ records: [
    row,
    { ...row, siteid: 'b', sitename: '乙站', aqi: '350', publishtime: '2026/09/29 11:00:00' },
    { ...row, siteid: 'c', sitename: '丙站', county: '臺東縣', publishtime: '2026/09/29 11:00:00' },
    { ...row, siteid: 'd', sitename: '丁站', county: '花蓮縣', aqi: '20', longitude: '' }
  ] }, { nowISO, sourceKind: 'official-cache' });

  it('keeps a stale-only county visible when fresh data exists elsewhere', () => {
    const html = mapMarkup(mixed, '臺東縣', false);
    const markers = markerMarkup(html);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toContain('丙站');
    expect(markers[0]).toContain('<span>過期</span>');
    expect(html).toContain('圖中沒有當期資料');
    expect(html).toContain('圖中最新發布：2026/09/29 11:00');
    expect(html).toContain('2 / 4 站目前可用');
    expect(html).not.toContain('資料新鮮');
  });

  it('shows mixed county states together but uses only current national representatives', () => {
    const html = mapMarkup(mixed, '臺北市', false);
    const markers = markerMarkup(html);
    expect(markers).toHaveLength(2);
    expect(markers[0]).toContain('<span>過期</span>');
    expect(markers[1]).toContain('<span>30</span>');
    expect(markers.filter((marker) => marker.includes('border-dashed'))).toHaveLength(1);
    expect(html).toContain('圖中 1 站目前可用，1 站非當期資料');
    expect(html).toContain('灰色虛線／文字');
    expect(getVisibleMapStations(mixed.records, 'official-cache', 'all').map((station) => station.siteId)).toEqual(['a']);
  });

  it('excludes stale high AQI from mixed dashboard summaries', () => {
    const html = summaryMarkup(mixed);
    expect(html).toContain('2 / 4');
    expect(html).toContain('甲站 AQI 30');
    expect(html).not.toContain('AQI 350');
    expect(html).not.toContain('text-red-900');
  });

  it('counts only plotted stations and shows clear empty state for missing coordinates', () => {
    const html = mapMarkup(mixed, '花蓮縣', false);
    expect(markerMarkup(html)).toHaveLength(0);
    expect(html).toContain('圖中 0 站');
    expect(html).toContain('沒有可標示的測站位置');
    expect(html).toContain('丁站');
    expect(html).not.toContain('bg-[#16803c]');
    const empty = mapMarkup(normalizeAqiPayload([], { nowISO, sourceKind: 'official-cache' }));
    expect(markerMarkup(empty)).toHaveLength(0);
    expect(empty).toContain('目前沒有可顯示的測站');
    expect(empty).not.toContain('資料已超過時效');
  });
});
