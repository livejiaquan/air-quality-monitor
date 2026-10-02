import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { normalizeAqiPayload } from '../lib/aqi';
import { STATIONS_PER_PAGE } from '../lib/stationExplorer';
import { PollutantReadings } from './PollutantReadings';
import { LoadingDashboard, ErrorPanel } from './StatePanels';
import { StationCard } from './StationCard';
import { StationExplorer } from './StationExplorer';
import { TaiwanAirMap } from './TaiwanAirMap';

const longName = '臺灣在地空氣品質長名稱測試測站';
const fixture = (count = 1) => normalizeAqiPayload({ records: Array.from({ length: count }, (_, i) => ({
  siteid: String(i), sitename: i ? `測站 ${i}` : longName, county: '臺北市', aqi: '30',
  publishtime: '2026/09/30 11:00:00', longitude: '121.5', latitude: '25.0', 'pm2.5': '', pm10: '0', co: '0.12'
})) }, { nowISO: '2026-09-30T04:00:00Z', sourceKind: 'official-cache' });
const noop = () => undefined;

describe('station experience markup contracts', () => {
  it('keeps result before map in DOM order and provides a focusable anchor destination', () => {
    const dataset = fixture();
    const html = renderToStaticMarkup(<TaiwanAirMap dataset={dataset} selectedCounty="臺北市" selectedStation={dataset.records[0]} onCountyChange={noop} onStationSelect={noop} onRefresh={noop} isRefreshing={false} />);
    expect(html.indexOf('name="primary-county"')).toBeLessThan(html.indexOf('id="selected-station"'));
    expect(html.indexOf('id="selected-station"')).toBeLessThan(html.indexOf('aria-label="台灣測站示意分布"'));
    expect(html).toContain('id="selected-station" tabindex="-1"');
    expect(html).toContain('xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.1fr)_minmax(0,1fr)]');
    expect(html).not.toContain('text-[10px]');
    expect(html).not.toContain('text-xs');
  });

  it('shows all six current risk ranges and the noncurrent legend without combining severe levels', () => {
    const dataset = fixture();
    const html = renderToStaticMarkup(<TaiwanAirMap dataset={dataset} selectedCounty="all" selectedStation={null} onCountyChange={noop} onStationSelect={noop} onRefresh={noop} isRefreshing={false} />);
    for (const range of ['0–50', '51–100', '101–150', '151–200', '201–300', '301–500']) expect(html).toContain(range);
    expect(html).toContain('灰色虛線／文字');
    expect(html).not.toContain('不健康以上');
  });

  it('has a native, initially closed disclosure with nontruncated names and a selected-state label', () => {
    const station = fixture().records[0];
    const html = renderToStaticMarkup(<StationCard station={station} sourceKind="official-cache" selected onSelect={noop} />);
    expect(html).toContain(longName);
    expect(html).not.toContain('truncate');
    expect(html).toContain('已選測站');
    expect(html).toContain('href="#selected-station"');
    expect(html).toContain('的活動提醒');
    expect(html).toContain('<details class="station-disclosure mt-4"><summary>');
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(html).toContain('<time dateTime="2026-09-30T11:00:00+08:00">2026/09/30 11:00</time>');
    expect(html).toContain('一般民眾');
    expect(html).toContain('敏感族群');
  });

  it('labels a sample card action as inspecting data rather than activity advice', () => {
    const html = renderToStaticMarkup(<StationCard station={fixture().records[0]} sourceKind="sample" onSelect={noop} />);
    expect(html).toContain('的資料狀態');
    expect(html).not.toContain('的活動提醒');
    expect(html).toContain('展示 AQI');
    expect(html).not.toContain('一般民眾可正常進行戶外活動');
  });

  it('distinguishes missing concentration from observed zero and preserves units/precision', () => {
    const html = renderToStaticMarkup(<PollutantReadings station={fixture().records[0]} label="目前污染物數值" />);
    expect((html.match(/<dt /g) ?? [])).toHaveLength(6);
    expect(html).toContain('未提供');
    expect(html).toContain('<span>0</span>');
    expect(html).toContain('<span>0.12</span>');
    for (const unit of ['μg/m³', 'ppb', 'ppm']) expect(html).toContain(unit);
  });

  it('renders a compact first page, visible labels and live result counts', () => {
    const dataset = fixture(30);
    const html = renderToStaticMarkup(<StationExplorer stations={dataset.records} sourceKind="official-cache" />);
    expect((html.match(/<article /g) ?? [])).toHaveLength(STATIONS_PER_PAGE);
    expect(html).toContain('顯示更多測站（剩餘 18）');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('資料時效');
    expect(html).toContain('name="explorer-availability"');
    expect(html).toContain('資料內 AQI 分類');
    expect(html).toContain('aria-controls="explorer-results"');
    expect(html).toContain('disabled=""');
  });

  it('explains genuinely empty data without offering a pointless filter reset', () => {
    const html = renderToStaticMarkup(<StationExplorer stations={[]} sourceKind="official-cache" />);
    expect(html).toContain('目前沒有可查閱的資料');
    expect(html).not.toContain('清除所有篩選');
    expect(html).not.toContain('顯示更多');
  });

  it('gives loading and failed requests visible state text and a recovery action', () => {
    const loading = renderToStaticMarkup(<LoadingDashboard />);
    expect(loading).toContain('正在載入空氣品質資料</h1>');
    expect(loading).toContain('aria-hidden="true" class="mx-auto max-w-7xl');
    const error = renderToStaticMarkup(<ErrorPanel onRetry={noop} />);
    expect(error).toContain('role="alert"');
    expect(error).toContain('重新載入');
    expect(error).toContain('https://airtw.moenv.gov.tw/');
  });
});
