import { describe, expect, it } from 'vitest';
import { STATION_SELECTION_GUIDANCE } from './stationSelection';

describe('station selection guidance', () => {
  it('does not imply a nearest or representative station before metadata exists', () => {
    expect(STATION_SELECTION_GUIDANCE.text).toContain('尚未提供站型、地址或距離資料');
    expect(STATION_SELECTION_GUIDANCE.text).toContain('不會判定最近或最能代表你所在地');
    expect(STATION_SELECTION_GUIDANCE.sourceUrl).toBe(
      'https://airtw.moenv.gov.tw/CHT/EnvMonitoring/Central/Background_Intro.aspx'
    );
  });
});
