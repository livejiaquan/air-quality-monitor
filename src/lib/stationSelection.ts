import type { AqiStationRecord } from './aqi';

export const STATION_SELECTION_GUIDANCE = {
  text: '本站尚未提供站型、地址或距離資料；不會判定最近或最能代表你所在地的測站。請選擇你要查的生活或活動區域中熟悉的測站。',
  sourceUrl: 'https://airtw.moenv.gov.tw/CHT/EnvMonitoring/Central/Background_Intro.aspx'
} as const;

// One major-city station per region, north to south. The first one that
// exists is the default focal station until the visitor picks their own;
// it is labelled as a default and makes no "nearest station" claim.
const QUICK_PICKS: Array<[county: string, stationName: string]> = [
  ['臺北市', '中山'],
  ['新北市', '板橋'],
  ['桃園市', '桃園'],
  ['臺中市', '西屯'],
  ['臺南市', '臺南'],
  ['高雄市', '前金']
];

export function getQuickPickStations(stations: AqiStationRecord[]): AqiStationRecord[] {
  return QUICK_PICKS.map(([county, name]) => stations.find((station) => station.county === county && station.stationName === name)).filter(
    (station): station is AqiStationRecord => Boolean(station)
  );
}

export function getDefaultStation(stations: AqiStationRecord[]): AqiStationRecord | null {
  return getQuickPickStations(stations)[0] ?? stations[0] ?? null;
}
