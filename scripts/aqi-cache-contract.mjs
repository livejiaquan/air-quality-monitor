import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export const DEFAULT_VALIDATION_OPTIONS = Object.freeze({
  minRecords: 80,
  minCounties: 22,
  minValidRatio: 0.95,
  maxAgeHours: 3,
  futureToleranceMinutes: 15
});

export const TAIWAN_COUNTIES = Object.freeze([
  '基隆市',
  '臺北市',
  '新北市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '臺中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '臺南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣'
]);

const REQUIRED_FIELDS = ['siteid', 'sitename', 'county', 'aqi', 'publishtime'];
const SAFE_RECORD_FIELDS = [
  'sitename',
  'county',
  'aqi',
  'pollutant',
  'status',
  'so2',
  'co',
  'o3',
  'o3_8hr',
  'pm10',
  'pm2.5',
  'no2',
  'nox',
  'no',
  'wind_speed',
  'wind_direc',
  'publishtime',
  'co_8hr',
  'pm2.5_avg',
  'pm10_avg',
  'so2_avg',
  'longitude',
  'latitude',
  'siteid'
];
const SAFE_RECORD_FIELD_SET = new Set(SAFE_RECORD_FIELDS);
const TAIWAN_COUNTY_SET = new Set(TAIWAN_COUNTIES);
const CACHE_FIELDS = new Set(['generatedAt', 'source', 'warnings', 'records']);
const CACHE_SOURCE_FIELDS = new Set(['kind', 'dataset']);
const FORBIDDEN_KEY_PATTERN = /(?:api[_-]?key|authorization|cookie|credential|password|secret|token|url)/i;
const URL_PATTERN = /(?:https?:\/\/|api[_-]?key=)/i;

export class AqiValidationError extends Error {
  constructor(issues) {
    super(`AQI data failed production validation: ${issues.join(' ')}`);
    this.name = 'AqiValidationError';
    this.issues = [...issues];
  }
}

export function validateAqiPayload(payload, options = {}) {
  const config = normalizeValidationOptions(options);
  const rows = extractRows(payload);
  const issues = [];
  const blockingIssues = [];
  const invalidReasonCounts = new Map();
  const validRecords = [];
  const seenSiteIds = new Set();
  const duplicateSiteIds = new Set();
  let newestPublishTimeMs = null;

  const sourceKind = getSourceKind(payload);
  if (sourceKind && sourceKind !== 'official-cache') {
    const issue = 'Sample or fallback data cannot be promoted as production data.';
    issues.push(issue);
    blockingIssues.push(issue);
  }

  if (!rows) {
    return buildValidationResult({
      issues: [...issues, 'Payload does not contain a records array.'],
      totalRecords: 0,
      validRecords,
      newestPublishTimeMs
    });
  }

  for (const row of rows) {
    const result = validateRow(row, config);
    const siteId = getNonEmptyString(row, 'siteid');

    if (siteId) {
      if (seenSiteIds.has(siteId)) duplicateSiteIds.add(siteId);
      seenSiteIds.add(siteId);
    }

    if (!result.ok) {
      for (const reason of result.reasons) {
        invalidReasonCounts.set(reason, (invalidReasonCounts.get(reason) ?? 0) + 1);
      }
      continue;
    }

    validRecords.push(sanitizeRecord(row));
    newestPublishTimeMs =
      newestPublishTimeMs === null
        ? result.publishTimeMs
        : Math.max(newestPublishTimeMs, result.publishTimeMs);
  }

  for (const [reason, count] of invalidReasonCounts) {
    issues.push(`${reason} (${count} ${count === 1 ? 'record' : 'records'}).`);
  }

  if (duplicateSiteIds.size > 0) {
    const issue = `Station siteid values must be unique (${duplicateSiteIds.size} duplicate ${duplicateSiteIds.size === 1 ? 'value' : 'values'}).`;
    issues.push(issue);
    blockingIssues.push(issue);
  }

  const totalRecords = rows.length;
  const validRatio = totalRecords === 0 ? 0 : validRecords.length / totalRecords;

  if (totalRecords === 0) {
    const issue = 'Payload contains no station records.';
    issues.push(issue);
    blockingIssues.push(issue);
  }
  if (validRecords.length < config.minRecords) {
    const issue = `Valid station coverage is below the required minimum of ${config.minRecords}.`;
    issues.push(issue);
    blockingIssues.push(issue);
  }
  const validCountyCount = new Set(validRecords.map((record) => record.county)).size;
  if (validCountyCount < config.minCounties) {
    const issue = `Valid county coverage is below the required minimum of ${config.minCounties}.`;
    issues.push(issue);
    blockingIssues.push(issue);
  }
  if (validRatio < config.minValidRatio) {
    const issue = `Valid station ratio is below the required minimum of ${formatRatio(config.minValidRatio)}.`;
    issues.push(issue);
    blockingIssues.push(issue);
  }

  return buildValidationResult({
    issues,
    blockingIssues,
    totalRecords,
    validRecords,
    validRatio,
    newestPublishTimeMs
  });
}

export function buildProductionCache(payload, options = {}) {
  const validation = validateAqiPayload(payload, options);
  if (!validation.ok) throw new AqiValidationError(validation.issues);

  const generatedAt = toDate(options.now ?? new Date(), 'Validation now').toISOString();
  const droppedCount = validation.totalRecords - validation.validRecordCount;

  const cache = {
    generatedAt,
    source: {
      kind: 'official-cache',
      dataset: 'AQX_P_432'
    },
    warnings:
      droppedCount > 0
        ? [`Dropped ${droppedCount} malformed station ${droppedCount === 1 ? 'row' : 'rows'}.`]
        : [],
    records: validation.validRecords
  };

  const cacheValidation = validateProductionCache(cache, options);
  if (!cacheValidation.ok) throw new AqiValidationError(cacheValidation.issues);
  return cache;
}

export function validateProductionCache(cache, options = {}) {
  const issues = [];
  const config = normalizeValidationOptions(options);

  if (!isPlainObject(cache)) {
    return {
      ok: false,
      issues: ['Cache must be a JSON object.'],
      totalRecords: 0,
      validRecordCount: 0,
      validRatio: 0,
      validRecords: [],
      newestPublishTime: null
    };
  }

  if (containsForbiddenCacheData(cache)) {
    issues.push('Cache contains forbidden URL or credential material.');
  }

  if (!hasExactKeys(cache, CACHE_FIELDS)) {
    issues.push('Production cache must contain only generatedAt, source, warnings, and records.');
  }

  if (!isPlainObject(cache.source) || cache.source.kind !== 'official-cache') {
    issues.push('Production cache source.kind must be official-cache; sample and fallback are rejected.');
  }
  if (!isPlainObject(cache.source) || cache.source.dataset !== 'AQX_P_432') {
    issues.push('Production cache source.dataset must be AQX_P_432.');
  }
  if (!isPlainObject(cache.source) || !hasExactKeys(cache.source, CACHE_SOURCE_FIELDS)) {
    issues.push('Production cache source must contain only kind and dataset.');
  }
  if (!Array.isArray(cache.warnings) || !cache.warnings.every((warning) => typeof warning === 'string')) {
    issues.push('Production cache warnings must be an array of strings.');
  }
  if (
    Array.isArray(cache.records) &&
    cache.records.some(
      (record) =>
        !isPlainObject(record) ||
        Object.keys(record).some((field) => !SAFE_RECORD_FIELD_SET.has(field))
    )
  ) {
    issues.push('Production cache station records contain unknown fields.');
  }

  const generatedAtMs = Date.parse(cache.generatedAt);
  if (typeof cache.generatedAt !== 'string' || !Number.isFinite(generatedAtMs)) {
    issues.push('Production cache generatedAt must be a valid timestamp.');
  } else {
    if (generatedAtMs - config.nowMs > config.futureToleranceMinutes * 60_000) {
      issues.push('Production cache generatedAt exceeds the allowed future tolerance.');
    }
    if (config.nowMs - generatedAtMs >= config.maxAgeHours * 3_600_000) {
      issues.push('Production cache generatedAt is older than the freshness limit.');
    }
  }

  const validation = validateAqiPayload(
    { source: cache.source, records: cache.records },
    options
  );

  if (validation.validRecordCount !== validation.totalRecords) {
    issues.push('Production cache may contain only fully valid station records.');
  }
  if (
    Number.isFinite(generatedAtMs) &&
    validation.newestPublishTime &&
    Date.parse(validation.newestPublishTime) - generatedAtMs >
      config.futureToleranceMinutes * 60_000
  ) {
    issues.push('Production cache generatedAt predates its newest source record.');
  }

  return {
    ...validation,
    ok: issues.length === 0 && validation.ok,
    issues: [...issues, ...validation.issues]
  };
}

export async function promoteAqiPayload(payload, options = {}) {
  const { outputPath, renameFile = rename } = options;
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error('AQI cache output path is required.');
  }

  const cache = buildProductionCache(payload, options);
  const existingCache = await readExistingCache(outputPath);
  assertPublishTimesDoNotRegress(cache, existingCache);
  await writeCacheAtomically(cache, outputPath, { ...options, renameFile });

  return {
    cache,
    outputPath,
    recordCount: cache.records.length
  };
}

async function readExistingCache(outputPath) {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return null;
  }
}

function assertPublishTimesDoNotRegress(candidate, existing) {
  if (
    !isPlainObject(existing) ||
    !isPlainObject(existing.source) ||
    existing.source.kind !== 'official-cache' ||
    !Array.isArray(existing.records)
  ) {
    return;
  }

  const existingTimes = getStationPublishTimes(existing.records);
  const candidateTimes = getStationPublishTimes(candidate.records);
  const existingNewest = Math.max(...existingTimes.values());
  const candidateNewest = Math.max(...candidateTimes.values());

  if (Number.isFinite(existingNewest) && Number.isFinite(candidateNewest) && candidateNewest < existingNewest) {
    throw new AqiValidationError(['Candidate cache newest publish time would move backward.']);
  }

  let regressedStationCount = 0;
  for (const [siteId, existingTime] of existingTimes) {
    const candidateTime = candidateTimes.get(siteId);
    if (candidateTime !== undefined && candidateTime < existingTime) regressedStationCount += 1;
  }
  if (regressedStationCount > 0) {
    throw new AqiValidationError([
      `Candidate cache would move ${regressedStationCount} station publish ${regressedStationCount === 1 ? 'time' : 'times'} backward.`
    ]);
  }
}

function getStationPublishTimes(records) {
  const times = new Map();
  for (const record of records) {
    const siteId = getNonEmptyString(record, 'siteid');
    const publishTimeMs = parseTaiwanPublishTime(getNonEmptyString(record, 'publishtime'));
    if (siteId && publishTimeMs !== null) times.set(siteId, publishTimeMs);
  }
  return times;
}

export async function writeCacheAtomically(cache, outputPath, options = {}) {
  const validation = validateProductionCache(cache, options);
  if (!validation.ok) throw new AqiValidationError(validation.issues);

  const outputDirectory = path.dirname(outputPath);
  const temporaryPath = path.join(
    outputDirectory,
    `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  );
  const renameFile = options.renameFile ?? rename;

  await mkdir(outputDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(cache, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    });
    await renameFile(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function validateRow(row, config) {
  const reasons = new Set();
  if (!isPlainObject(row)) {
    return { ok: false, reasons: ['Station row must be an object'], publishTimeMs: null };
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !getNonEmptyString(row, field));
  if (missingFields.length > 0) reasons.add('Required core fields are missing or are not strings');
  const county = getNonEmptyString(row, 'county');
  if (county && !TAIWAN_COUNTY_SET.has(county)) {
    reasons.add('County must be a recognized Taiwan county or city');
  }
  if (
    SAFE_RECORD_FIELDS.some(
      (field) => Object.hasOwn(row, field) && typeof row[field] !== 'string'
    )
  ) {
    reasons.add('Official AQI fields must be strings when present');
  }

  const aqiText = getNonEmptyString(row, 'aqi');
  const aqi = aqiText && /^\d+$/.test(aqiText) ? Number(aqiText) : Number.NaN;
  if (!Number.isInteger(aqi) || aqi < 0 || aqi > 500) {
    reasons.add('AQI must be an integer from 0 through 500');
  }

  const publishTime = getNonEmptyString(row, 'publishtime');
  const publishTimeMs = parseTaiwanPublishTime(publishTime);
  if (publishTimeMs === null) {
    reasons.add('Taiwan publish time is invalid');
  } else {
    const futureMs = publishTimeMs - config.nowMs;
    const ageMs = config.nowMs - publishTimeMs;
    if (futureMs > config.futureToleranceMinutes * 60_000) {
      reasons.add('Publish time exceeds the allowed future tolerance');
    }
    if (ageMs >= config.maxAgeHours * 3_600_000) {
      reasons.add('Publish time is older than the freshness limit');
    }
  }

  return { ok: reasons.size === 0, reasons: [...reasons], publishTimeMs };
}

function sanitizeRecord(row) {
  const record = {};
  for (const field of SAFE_RECORD_FIELDS) {
    if (typeof row[field] === 'string') record[field] = row[field].trim();
  }
  return record;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!isPlainObject(payload)) return null;
  if (Array.isArray(payload.records)) return payload.records;
  if (isPlainObject(payload.result) && Array.isArray(payload.result.records)) {
    return payload.result.records;
  }
  return null;
}

function getSourceKind(payload) {
  if (!isPlainObject(payload) || !isPlainObject(payload.source)) return null;
  return typeof payload.source.kind === 'string' ? payload.source.kind : null;
}

function getNonEmptyString(row, field) {
  if (!isPlainObject(row) || typeof row[field] !== 'string') return '';
  return row[field].trim();
}

function parseTaiwanPublishTime(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59 ||
    second < 0 || second > 59
  ) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day, hour - 8, minute, second);
  const taiwanDate = new Date(utcMs + 8 * 3_600_000);
  if (
    taiwanDate.getUTCFullYear() !== year ||
    taiwanDate.getUTCMonth() !== month - 1 ||
    taiwanDate.getUTCDate() !== day ||
    taiwanDate.getUTCHours() !== hour ||
    taiwanDate.getUTCMinutes() !== minute ||
    taiwanDate.getUTCSeconds() !== second
  ) {
    return null;
  }

  return utcMs;
}

function normalizeValidationOptions(options) {
  const config = {
    minRecords: options.minRecords ?? DEFAULT_VALIDATION_OPTIONS.minRecords,
    minCounties: options.minCounties ?? DEFAULT_VALIDATION_OPTIONS.minCounties,
    minValidRatio: options.minValidRatio ?? DEFAULT_VALIDATION_OPTIONS.minValidRatio,
    maxAgeHours: options.maxAgeHours ?? DEFAULT_VALIDATION_OPTIONS.maxAgeHours,
    futureToleranceMinutes:
      options.futureToleranceMinutes ?? DEFAULT_VALIDATION_OPTIONS.futureToleranceMinutes,
    nowMs: toDate(options.now ?? new Date(), 'Validation now').getTime()
  };

  if (!Number.isInteger(config.minRecords) || config.minRecords < 1) {
    throw new Error('minRecords must be a positive integer.');
  }
  if (
    !Number.isInteger(config.minCounties) ||
    config.minCounties < 1 ||
    config.minCounties > TAIWAN_COUNTIES.length
  ) {
    throw new Error(`minCounties must be an integer from 1 through ${TAIWAN_COUNTIES.length}.`);
  }
  if (
    typeof config.minValidRatio !== 'number' ||
    !Number.isFinite(config.minValidRatio) ||
    config.minValidRatio <= 0 ||
    config.minValidRatio > 1
  ) {
    throw new Error('minValidRatio must be greater than 0 and at most 1.');
  }
  if (
    typeof config.maxAgeHours !== 'number' ||
    !Number.isFinite(config.maxAgeHours) ||
    config.maxAgeHours <= 0
  ) {
    throw new Error('maxAgeHours must be greater than 0.');
  }
  if (
    typeof config.futureToleranceMinutes !== 'number' ||
    !Number.isFinite(config.futureToleranceMinutes) ||
    config.futureToleranceMinutes < 0
  ) {
    throw new Error('futureToleranceMinutes must be zero or greater.');
  }

  return config;
}

function buildValidationResult({
  issues,
  blockingIssues = issues,
  totalRecords,
  validRecords,
  validRatio = 0,
  newestPublishTimeMs
}) {
  return {
    ok: blockingIssues.length === 0,
    issues,
    totalRecords,
    validRecordCount: validRecords.length,
    validRatio,
    validRecords,
    newestPublishTime:
      newestPublishTimeMs === null ? null : new Date(newestPublishTimeMs).toISOString()
  };
}

function containsForbiddenCacheData(value) {
  if (typeof value === 'string') return URL_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenCacheData);
  if (!isPlainObject(value)) return false;

  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_KEY_PATTERN.test(key) || containsForbiddenCacheData(child)
  );
}

function toDate(value, label) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date.`);
  return date;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, allowedKeys) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length === allowedKeys.size && keys.every((key) => allowedKeys.has(key));
}

function formatRatio(value) {
  return `${Math.round(value * 10000) / 100}%`;
}
