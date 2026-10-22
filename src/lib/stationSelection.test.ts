import { describe, expect, it } from 'vitest';
import type { AqiStationRecord } from './aqi';
import { getDefaultStation, getQuickPickStations, STATION_SELECTION_GUIDANCE } from './stationSelection';

describe('station selection guidance', () => {
  it('does not imply a nearest or representative station before metadata exists', () => {
    expect(STATION_SELECTION_GUIDANCE.text).toContain('尚未提供站型、地址或距離資料');
    expect(STATION_SELECTION_GUIDANCE.text).toContain('不會判定最近或最能代表你所在地');
    expect(STATION_SELECTION_GUIDANCE.sourceUrl).toBe(
      'https://airtw.moenv.gov.tw/CHT/EnvMonitoring/Central/Background_Intro.aspx'
    );
  });
});

describe('default station', () => {
  const station = (county: string, stationName: string) => ({ county, stationName, siteId: `${county}-${stationName}` }) as AqiStationRecord;

  it('uses the first major-city station that exists', () => {
    const stations = [station('高雄市', '前金'), station('新北市', '板橋')];
    expect(getDefaultStation(stations)?.stationName).toBe('板橋');
  });

  it('falls back to the first station, or null for no data', () => {
    expect(getDefaultStation([station('澎湖縣', '馬公')])?.stationName).toBe('馬公');
    expect(getDefaultStation([])).toBeNull();
  });

  it('keeps quick picks in north-to-south order', () => {
    const stations = [station('臺南市', '臺南'), station('臺北市', '中山')];
    expect(getQuickPickStations(stations).map((item) => item.stationName)).toEqual(['中山', '臺南']);
  });
});
