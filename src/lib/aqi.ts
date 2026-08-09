export type AqiCategoryId =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'veryUnhealthy'
  | 'hazardous'
  | 'unknown';

export type SourceKind = 'official-cache' | 'sample' | 'fallback';

export type AqiCategory = {
  id: AqiCategoryId;
  label: string;
  englishLabel: string;
  min: number | null;
  max: number | null;
  severity: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  advice: {
    general: string;
    sensitive: string;
    short: string;
  };
};

export type PollutantValues = {
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  o3_8hr: number | null;
  co: number | null;
  so2: number | null;
  no2: number | null;
};

export type AqiStationRecord = {
  siteId: string;
  stationName: string;
  county: string;
  aqi: number;
  status: string;
  mainPollutant: string;
  pollutantValues: PollutantValues;
  publishTime: string;
  publishTimeISO: string | null;
  longitude: number | null;
  latitude: number | null;
  categoryId: AqiCategoryId;
  category: AqiCategory;
};

export type CountySummary = {
  county: string;
  stationCount: number;
  averageAqi: number;
  maxAqi: number;
  maxStationName: string;
  categoryId: AqiCategoryId;
  category: AqiCategory;
  unhealthyCount: number;
  healthyCount: number;
};

export type Freshness = {
  newestPublishTime: string | null;
  newestPublishTimeISO: string | null;
  hoursSinceUpdate: number | null;
  isStale: boolean;
};

export type AqiSummary = Freshness & {
  stationCount: number;
  validAqiCount: number;
  averageAqi: number | null;
  medianAqi: number | null;
  healthyStationCount: number;
  unhealthyStationCount: number;
  worstStation: AqiStationRecord | null;
  safestStations: AqiStationRecord[];
  worstStations: AqiStationRecord[];
  counties: CountySummary[];
  categoryCounts: Record<AqiCategoryId, number>;
  primaryPollutants: Array<{ pollutant: string; count: number }>;
};

export type AqiDataset = {
  generatedAt: string;
  source: {
    kind: SourceKind;
    dataset: string;
    url: string;
  };
  records: AqiStationRecord[];
  summary: AqiSummary;
  warnings: string[];
};

export type NormalizeOptions = {
  generatedAt?: string;
  nowISO?: string;
  sourceKind?: SourceKind;
  sourceUrl?: string;
};

const SOURCE_URL = 'https://data.moenv.gov.tw/dataset/detail/AQX_P_432';
const STALE_THRESHOLD_HOURS = 3;

export const AQI_CATEGORIES: AqiCategory[] = [
  {
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
      general: '空氣品質良好，適合一般戶外活動。',
      sensitive: '敏感族群可正常活動，留意自身狀況即可。',
      short: '適合戶外活動'
    }
  },
  {
    id: 'moderate',
    label: '普通',
    englishLabel: 'Moderate',
    min: 51,
    max: 100,
    severity: 2,
    color: '#b77900',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-900',
    borderClass: 'border-amber-200',
    advice: {
      general: '一般民眾可正常活動，極少數敏感者留意症狀。',
      sensitive: '敏感族群若出現咳嗽、眼痛或喉嚨不適，減少長時間戶外活動。',
      short: '一般活動可照常'
    }
  },
  {
    id: 'sensitive',
    label: '對敏感族群不健康',
    englishLabel: 'Unhealthy for Sensitive Groups',
    min: 101,
    max: 150,
    severity: 3,
    color: '#c45a16',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-900',
    borderClass: 'border-orange-200',
    advice: {
      general: '一般民眾若不適可減少戶外活動，學生減少長時間劇烈運動。',
      sensitive: '敏感族群應降低戶外活動強度，必要時改到室內。',
      short: '敏感族群減量'
    }
  },
  {
    id: 'unhealthy',
    label: '對所有族群不健康',
    englishLabel: 'Unhealthy',
    min: 151,
    max: 200,
    severity: 4,
    color: '#c52222',
    bgClass: 'bg-red-50',
    textClass: 'text-red-900',
    borderClass: 'border-red-200',
    advice: {
      general: '減少戶外體力消耗，戶外活動增加休息時間。',
      sensitive: '敏感族群應避免長時間戶外活動，學生避免劇烈運動。',
      short: '減少戶外耗氧活動'
    }
  },
  {
    id: 'veryUnhealthy',
    label: '非常不健康',
    englishLabel: 'Very Unhealthy',
    min: 201,
    max: 300,
    severity: 5,
    color: '#7e3bb2',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-900',
    borderClass: 'border-purple-200',
    advice: {
      general: '所有人應減少戶外活動，必要外出請做好防護。',
      sensitive: '敏感族群與學生應停止戶外劇烈活動並轉入室內。',
      short: '改以室內活動為主'
    }
  },
  {
    id: 'hazardous',
    label: '危害',
    englishLabel: 'Hazardous',
    min: 301,
    max: 500,
    severity: 6,
    color: '#7f1d1d',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-950',
    borderClass: 'border-rose-300',
    advice: {
      general: '避免戶外活動，必要外出配戴口罩並縮短停留時間。',
      sensitive: '敏感族群應留在室內並緊閉門窗，依醫囑備妥藥物。',
      short: '避免戶外活動'
    }
  },
  {
    id: 'unknown',
    label: '資料不足',
    englishLabel: 'Unknown',
    min: null,
    max: null,
    severity: 0,
    color: '#64748b',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
    advice: {
      general: '此測站暫無可用 AQI，請參考鄰近測站或官方公告。',
      sensitive: '敏感族群先採保守活動安排。',
      short: '參考鄰近測站'
    }
  }
];

const categoryById = new Map(AQI_CATEGORIES.map((category) => [category.id, category]));

export function getAqiCategory(aqi: number | null | undefined): AqiCategory {
  if (typeof aqi !== 'number' || Number.isNaN(aqi) || aqi < 0) {
    return categoryById.get('unknown')!;
  }

  const category = AQI_CATEGORIES.find((item) => {
    if (item.min === null || item.max === null) return false;
    return aqi >= item.min && aqi <= item.max;
  });

  return category ?? categoryById.get('hazardous')!;
}

export function normalizeAqiPayload(payload: unknown, options: NormalizeOptions = {}): AqiDataset {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rows = extractRows(payload);
  const warnings: string[] = [];
  const records: AqiStationRecord[] = [];
  let droppedRows = 0;

  for (const row of rows) {
    const record = normalizeRow(row);
    if (record) {
      records.push(record);
    } else {
      droppedRows += 1;
    }
  }

  if (droppedRows > 0) {
    warnings.push(`Dropped ${droppedRows} malformed station row${droppedRows === 1 ? '' : 's'}.`);
  }

  const summary = summarizeAqiDataset(records, options.nowISO ?? generatedAt);

  return {
    generatedAt,
    source: {
      kind: options.sourceKind ?? 'official-cache',
      dataset: 'AQX_P_432',
      url: options.sourceUrl ?? SOURCE_URL
    },
    records,
    summary,
    warnings
  };
}

export function summarizeAqiDataset(records: AqiStationRecord[], nowISO = new Date().toISOString()): AqiSummary {
  const sortedByWorst = [...records].sort((a, b) => b.aqi - a.aqi);
  const sortedBySafest = [...records].sort((a, b) => a.aqi - b.aqi);
  const aqis = sortedBySafest.map((record) => record.aqi);
  const averageAqi = aqis.length > 0 ? round(aqis.reduce((sum, aqi) => sum + aqi, 0) / aqis.length, 1) : null;
  const medianAqi = getMedian(aqis);
  const categoryCounts = createEmptyCategoryCounts();
  const pollutantCounts = new Map<string, number>();

  for (const record of records) {
    categoryCounts[record.categoryId] += 1;
    const pollutant = normalizePollutantLabel(record.mainPollutant);
    if (pollutant) {
      pollutantCounts.set(pollutant, (pollutantCounts.get(pollutant) ?? 0) + 1);
    }
  }

  const newestRecord = [...records]
    .filter((record) => record.publishTimeISO)
    .sort((a, b) => Date.parse(b.publishTimeISO!) - Date.parse(a.publishTimeISO!))[0];
  const freshness = getFreshness(newestRecord?.publishTimeISO ?? null, nowISO);

  return {
    ...freshness,
    newestPublishTime: newestRecord?.publishTime ?? null,
    stationCount: records.length,
    validAqiCount: records.length,
    averageAqi,
    medianAqi,
    healthyStationCount: records.filter((record) => record.aqi <= 100).length,
    unhealthyStationCount: records.filter((record) => record.aqi > 100).length,
    worstStation: sortedByWorst[0] ?? null,
    safestStations: sortedBySafest.filter((record) => record.aqi <= 100).slice(0, 6),
    worstStations: sortedByWorst.slice(0, 8),
    counties: summarizeCounties(records),
    categoryCounts,
    primaryPollutants: [...pollutantCounts.entries()]
      .map(([pollutant, count]) => ({ pollutant, count }))
      .sort((a, b) => b.count - a.count || a.pollutant.localeCompare(b.pollutant, 'zh-Hant'))
  };
}

export function getFreshness(
  newestPublishTimeISO: string | null | undefined,
  nowISO = new Date().toISOString()
): Freshness {
  if (!newestPublishTimeISO) {
    return {
      newestPublishTime: null,
      newestPublishTimeISO: null,
      hoursSinceUpdate: null,
      isStale: true
    };
  }

  const published = Date.parse(newestPublishTimeISO);
  const now = Date.parse(nowISO);
  if (!Number.isFinite(published) || !Number.isFinite(now)) {
    return {
      newestPublishTime: null,
      newestPublishTimeISO: null,
      hoursSinceUpdate: null,
      isStale: true
    };
  }

  const hoursSinceUpdate = (now - published) / 1000 / 60 / 60;

  return {
    newestPublishTime: formatTaiwanDate(newestPublishTimeISO),
    newestPublishTimeISO,
    hoursSinceUpdate: round(Math.max(0, hoursSinceUpdate), 2),
    isStale: hoursSinceUpdate >= STALE_THRESHOLD_HOURS
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    if (Array.isArray(data.records)) return data.records;
    const result = data.result;
    if (result && typeof result === 'object') {
      const resultData = result as Record<string, unknown>;
      if (Array.isArray(resultData.records)) return resultData.records;
    }
  }
  return [];
}

function normalizeRow(row: unknown): AqiStationRecord | null {
  if (!row || typeof row !== 'object') return null;

  const data = row as Record<string, unknown>;
  const stationName = getString(data, ['sitename', 'SiteName']);
  const county = getString(data, ['county', 'County']);
  const aqi = parseNumber(getValue(data, ['aqi', 'AQI']));

  if (!stationName || !county || aqi === null) {
    return null;
  }

  const publishTime = getString(data, ['publishtime', 'PublishTime', 'publishtime']);
  const publishTimeISO = parseTaiwanDate(publishTime);
  const category = getAqiCategory(aqi);

  return {
    siteId: getString(data, ['siteid', 'SiteId']) || `${county}-${stationName}`,
    stationName,
    county,
    aqi,
    status: getString(data, ['status', 'Status']) || category.label,
    mainPollutant: normalizePollutantLabel(getString(data, ['pollutant', 'Pollutant'])) || '無明顯污染物',
    pollutantValues: {
      pm25: parseNumber(getValue(data, ['pm2.5', 'PM2.5', 'pm25'])),
      pm10: parseNumber(getValue(data, ['pm10', 'PM10'])),
      o3: parseNumber(getValue(data, ['o3', 'O3'])),
      o3_8hr: parseNumber(getValue(data, ['o3_8hr', 'O3_8hr'])),
      co: parseNumber(getValue(data, ['co', 'CO'])),
      so2: parseNumber(getValue(data, ['so2', 'SO2'])),
      no2: parseNumber(getValue(data, ['no2', 'NO2']))
    },
    publishTime,
    publishTimeISO,
    longitude: parseNumber(getValue(data, ['longitude', 'Longitude'])),
    latitude: parseNumber(getValue(data, ['latitude', 'Latitude'])),
    categoryId: category.id,
    category
  };
}

function getValue(data: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in data) return data[key];
  }
  return undefined;
}

function getString(data: Record<string, unknown>, keys: string[]): string {
  const value = getValue(data, keys);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'nd') return null;
  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTaiwanDate(value: string): string | null {
  if (!value) return null;
  const normalized = value.trim().replaceAll('/', '-');
  const dateTimeMatch = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+|T)(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
  );

  if (dateTimeMatch) {
    const [, year, month, day, hour, minute, second = '00'] = dateTimeMatch;
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+08:00`;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function summarizeCounties(records: AqiStationRecord[]): CountySummary[] {
  const groups = new Map<string, AqiStationRecord[]>();
  for (const record of records) {
    groups.set(record.county, [...(groups.get(record.county) ?? []), record]);
  }

  return [...groups.entries()]
    .map(([county, countyRecords]) => {
      const sorted = [...countyRecords].sort((a, b) => b.aqi - a.aqi);
      const maxRecord = sorted[0];
      const averageAqi = round(
        countyRecords.reduce((sum, record) => sum + record.aqi, 0) / countyRecords.length,
        1
      );
      const category = getAqiCategory(maxRecord.aqi);

      return {
        county,
        stationCount: countyRecords.length,
        averageAqi,
        maxAqi: maxRecord.aqi,
        maxStationName: maxRecord.stationName,
        categoryId: category.id,
        category,
        unhealthyCount: countyRecords.filter((record) => record.aqi > 100).length,
        healthyCount: countyRecords.filter((record) => record.aqi <= 100).length
      };
    })
    .sort((a, b) => b.maxAqi - a.maxAqi || b.averageAqi - a.averageAqi || a.county.localeCompare(b.county, 'zh-Hant'));
}

function createEmptyCategoryCounts(): Record<AqiCategoryId, number> {
  return {
    good: 0,
    moderate: 0,
    sensitive: 0,
    unhealthy: 0,
    veryUnhealthy: 0,
    hazardous: 0,
    unknown: 0
  };
}

function getMedian(sortedValues: number[]): number | null {
  if (sortedValues.length === 0) return null;
  const middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return sortedValues[middle];
  return round((sortedValues[middle - 1] + sortedValues[middle]) / 2, 1);
}

function normalizePollutantLabel(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  const upper = normalized.toUpperCase().replace('PM2.5', 'PM2.5');
  const labels: Record<string, string> = {
    'PM2.5': 'PM2.5',
    PM25: 'PM2.5',
    PM10: 'PM10',
    O3: 'O3',
    CO: 'CO',
    SO2: 'SO2',
    NO2: 'NO2'
  };
  return labels[upper] ?? normalized;
}

function formatTaiwanDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pad(value: string): string {
  return value.padStart(2, '0');
}
