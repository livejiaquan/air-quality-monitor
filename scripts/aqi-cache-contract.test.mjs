import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AqiValidationError,
  TAIWAN_COUNTIES,
  buildProductionCache,
  promoteAqiPayload,
  validateAqiPayload,
  validateProductionCache,
  writeCacheAtomically
} from './aqi-cache-contract.mjs';
import { fetchOfficialAqiPayload, refreshAqiCache } from './fetch-aqi.mjs';

const NOW = '2026-08-09T04:00:00.000Z';
const temporaryDirectories = [];
const execFileAsync = promisify(execFile);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('production AQI payload validation', () => {
  it('accepts an official-style all-string payload and optional missing pollutant values', () => {
    const records = makeRecords(84);
    records[0].aqi = '0';
    records[1].aqi = '500';
    records[0].pollutant = '';
    records[0]['pm2.5'] = '-';
    records[1].o3 = '';
    delete records[2].so2;

    const validation = validateAqiPayload(records, { now: NOW });

    expect(validation.ok).toBe(true);
    expect(validation.validRecordCount).toBe(84);
    expect(validation.validRatio).toBe(1);
    expect(validation.newestPublishTime).toBe('2026-08-09T03:00:00.000Z');
  });

  it('rejects empty and below-coverage payloads with the production defaults', () => {
    const empty = validateAqiPayload({ records: [] }, { now: NOW });
    const partial = validateAqiPayload({ records: makeRecords(79) }, { now: NOW });

    expect(empty.ok).toBe(false);
    expect(empty.issues).toContain('Payload contains no station records.');
    expect(partial.ok).toBe(false);
    expect(partial.issues).toContain('Valid station coverage is below the required minimum of 80.');
  });

  it('rejects duplicate station ids even when coverage and validity ratio pass', () => {
    const records = makeRecords(84);
    records[83].siteid = records[0].siteid;

    const validation = validateAqiPayload({ records }, { now: NOW });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain('Station siteid values must be unique (1 duplicate value).');
  });

  it('rejects a station-rich payload that does not have nationwide county coverage', () => {
    const records = makeRecords(84, { county: '臺北市' });

    const validation = validateAqiPayload({ records }, { now: NOW });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain(
      'Valid county coverage is below the required minimum of 22.'
    );
  });

  it('rejects fictional county names instead of counting them toward national coverage', () => {
    const records = makeRecords(84).map((record, index) => ({
      ...record,
      county: `假縣${index % 20}`
    }));

    const validation = validateAqiPayload({ records }, { now: NOW });

    expect(validation.ok).toBe(false);
    expect(validation.validRecordCount).toBe(0);
    expect(validation.issues).toContain(
      'County must be a recognized Taiwan county or city (84 records).'
    );
  });

  it('rejects illegal AQI and missing required core fields', () => {
    const records = makeRecords(84);
    records[0].aqi = '501';
    records[1].county = '';
    records[2].pm10 = 22;

    const validation = validateAqiPayload(
      { records },
      { now: NOW, minValidRatio: 1 }
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain('AQI must be an integer from 0 through 500 (1 record).');
    expect(validation.issues).toContain('Required core fields are missing or are not strings (1 record).');
    expect(validation.issues).toContain('Official AQI fields must be strings when present (1 record).');
  });

  it('enforces the configurable valid-record ratio after excluding malformed rows', () => {
    const belowRatio = makeRecords(84);
    for (let index = 0; index < 5; index += 1) belowRatio[index].aqi = '-';

    const rejected = validateAqiPayload({ records: belowRatio }, { now: NOW });

    expect(rejected.ok).toBe(false);
    expect(rejected.validRecordCount).toBe(79);
    expect(rejected.issues).toContain('Valid station ratio is below the required minimum of 95%.');

    const withinRatio = makeRecords(84);
    for (let index = 0; index < 4; index += 1) withinRatio[index].aqi = '-';
    const cache = buildProductionCache({ records: withinRatio }, { now: NOW });

    expect(cache.records).toHaveLength(80);
    expect(cache.warnings).toEqual([
      'Dropped 4 malformed station rows.'
    ]);
  });

  it('rejects impossible, excessively future, and stale Taiwan publish times', () => {
    const impossible = makeRecords(84, { publishtime: '2026/02/30 11:00:00' });
    const future = makeRecords(84, { publishtime: '2026/08/09 12:16:00' });
    const stale = makeRecords(84, { publishtime: '2026/08/09 08:59:59' });

    expect(validateAqiPayload({ records: impossible }, { now: NOW }).issues).toContain(
      'Taiwan publish time is invalid (84 records).'
    );
    expect(validateAqiPayload({ records: future }, { now: NOW }).issues).toContain(
      'Publish time exceeds the allowed future tolerance (84 records).'
    );
    expect(validateAqiPayload({ records: stale }, { now: NOW }).issues).toContain(
      'Publish time is older than the freshness limit (84 records).'
    );
  });

  it('treats exactly three hours as stale while accepting the future-tolerance ceiling', () => {
    const exactlyStale = makeRecords(84, { publishtime: '2026/08/09 09:00:00' });
    const toleratedFuture = makeRecords(84, { publishtime: '2026/08/09 12:15:00' });

    const staleValidation = validateAqiPayload({ records: exactlyStale }, { now: NOW });
    const futureValidation = validateAqiPayload({ records: toleratedFuture }, { now: NOW });

    expect(staleValidation.ok).toBe(false);
    expect(staleValidation.issues).toContain(
      'Publish time is older than the freshness limit (84 records).'
    );
    expect(futureValidation.ok).toBe(true);
  });

  it.each(['sample', 'fallback'])('rejects %s caches from production validation', (kind) => {
    const cache = {
      generatedAt: NOW,
      source: { kind, dataset: 'AQX_P_432' },
      warnings: [],
      records: makeRecords(84)
    };

    const validation = validateProductionCache(cache, { now: NOW });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain(
      'Production cache source.kind must be official-cache; sample and fallback are rejected.'
    );
  });

  it('whitelists cache fields so request URLs, credentials, and unknown upstream metadata are not persisted', () => {
    const records = makeRecords(84);
    records[0].api_key = 'synthetic-secret-value';
    records[0].url = 'https://invalid.example/request?api_key=synthetic-secret-value';
    const cache = buildProductionCache(
      {
        requestUrl: 'https://invalid.example/request?api_key=synthetic-secret-value',
        records
      },
      { now: NOW }
    );
    const serialized = JSON.stringify(cache);

    expect(serialized).not.toContain('synthetic-secret-value');
    expect(serialized).not.toContain('https://');
    expect(cache.source).toEqual({ kind: 'official-cache', dataset: 'AQX_P_432' });
  });

  it('rejects forbidden material even when it appears in an otherwise allowed cache field', () => {
    const records = makeRecords(84);
    records[0].status = 'https://invalid.example/request';

    expect(() => buildProductionCache({ records }, { now: NOW })).toThrow(
      'Cache contains forbidden URL or credential material.'
    );
  });

  it('rejects unknown persisted cache fields and malformed warnings without echoing secret values', () => {
    const base = buildProductionCache({ records: makeRecords(84) }, { now: NOW });
    const secretValue = 'synthetic-raw-key-material';
    const variants = [
      { ...base, secret: secretValue },
      { ...base, source: { ...base.source, apiKeyMaterial: secretValue } },
      {
        ...base,
        records: [{ ...base.records[0], credential: secretValue }, ...base.records.slice(1)]
      },
      { ...base, warnings: 'not-an-array' }
    ];

    for (const cache of variants) {
      const validation = validateProductionCache(cache, { now: NOW });
      expect(validation.ok).toBe(false);
      expect(validation.issues.join(' ')).not.toContain(secretValue);
    }

    expect(validateProductionCache(variants[0], { now: NOW }).issues).toContain(
      'Production cache must contain only generatedAt, source, warnings, and records.'
    );
    expect(validateProductionCache(variants[1], { now: NOW }).issues).toContain(
      'Production cache source must contain only kind and dataset.'
    );
    expect(validateProductionCache(variants[2], { now: NOW }).issues).toContain(
      'Production cache station records contain unknown fields.'
    );
    expect(validateProductionCache(variants[3], { now: NOW }).issues).toContain(
      'Production cache warnings must be an array of strings.'
    );
  });

  it('requires every record already persisted in a production cache to be valid', () => {
    const base = buildProductionCache({ records: makeRecords(84) }, { now: NOW });
    const cache = {
      ...base,
      records: base.records.map((record, index) =>
        index === 0 ? { ...record, aqi: '501' } : record
      )
    };

    const validation = validateProductionCache(cache, { now: NOW });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain(
      'Production cache may contain only fully valid station records.'
    );
  });

  it('uses the caller supplied clock when revalidating persisted station timestamps', () => {
    const cache = buildProductionCache({ records: makeRecords(84) }, { now: NOW });

    expect(validateProductionCache(cache, { now: NOW }).ok).toBe(true);
    expect(
      validateProductionCache(cache, { now: '2026-08-09T08:00:00.000Z' }).issues
    ).toContain('Publish time is older than the freshness limit (84 records).');
  });

  it('rejects impossible future and stale cache generation timestamps', () => {
    const base = buildProductionCache({ records: makeRecords(84) }, { now: NOW });
    const future = { ...base, generatedAt: '2099-01-01T00:00:00.000Z' };
    const stale = { ...base, generatedAt: '2026-08-09T00:59:59.000Z' };

    expect(validateProductionCache(future, { now: NOW }).issues).toContain(
      'Production cache generatedAt exceeds the allowed future tolerance.'
    );
    expect(validateProductionCache(stale, { now: NOW }).issues).toContain(
      'Production cache generatedAt is older than the freshness limit.'
    );
  });
});

describe('atomic AQI cache promotion', () => {
  it('writes a validated cache through a same-directory atomic rename', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');

    const result = await promoteAqiPayload(
      { records: makeRecords(84) },
      { outputPath, now: NOW }
    );
    const cache = JSON.parse(await readFile(outputPath, 'utf8'));

    expect(result.recordCount).toBe(84);
    expect(validateProductionCache(cache, { now: NOW }).ok).toBe(true);
    expect(await readdir(directory)).toEqual(['aqi-latest.json']);
  });

  it('preserves the last-good cache and removes the temporary file when rename fails', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');
    const lastGood = '{"lastGood":true}\n';
    await writeFile(outputPath, lastGood, 'utf8');
    const cache = buildProductionCache({ records: makeRecords(84) }, { now: NOW });

    await expect(
      writeCacheAtomically(cache, outputPath, {
        now: NOW,
        renameFile: async () => {
          throw new Error('synthetic rename failure');
        }
      })
    ).rejects.toThrow('synthetic rename failure');

    expect(await readFile(outputPath, 'utf8')).toBe(lastGood);
    expect(await readdir(directory)).toEqual(['aqi-latest.json']);
  });

  it('does not touch the last-good cache when payload validation fails', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');
    const lastGood = '{"lastGood":true}\n';
    await writeFile(outputPath, lastGood, 'utf8');

    await expect(
      promoteAqiPayload({ records: [] }, { outputPath, now: NOW })
    ).rejects.toBeInstanceOf(AqiValidationError);

    expect(await readFile(outputPath, 'utf8')).toBe(lastGood);
    expect(await readdir(directory)).toEqual(['aqi-latest.json']);
  });

  it('preserves last-good when a full candidate response moves source time backward', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');
    const lastGood = buildProductionCache(
      { records: makeRecords(84, { publishtime: '2026/08/09 11:30:00' }) },
      { now: NOW }
    );
    await writeFile(outputPath, `${JSON.stringify(lastGood)}\n`, 'utf8');

    await expect(
      promoteAqiPayload({ records: makeRecords(84) }, { outputPath, now: NOW })
    ).rejects.toThrow('Candidate cache newest publish time would move backward.');

    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(lastGood);
  });

  it('preserves last-good when one station moves backward despite an equal newest time', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');
    const lastGood = buildProductionCache({ records: makeRecords(84) }, { now: NOW });
    const candidate = makeRecords(84);
    candidate[0].publishtime = '2026/08/09 10:30:00';
    await writeFile(outputPath, `${JSON.stringify(lastGood)}\n`, 'utf8');

    await expect(
      promoteAqiPayload({ records: candidate }, { outputPath, now: NOW })
    ).rejects.toThrow('Candidate cache would move 1 station publish time backward.');

    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(lastGood);
  });

  it('keeps the last-good cache when the fetched response fails validation', async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = path.join(directory, 'aqi-latest.json');
    const lastGood = '{"lastGood":true}\n';
    await writeFile(outputPath, lastGood, 'utf8');

    await expect(
      refreshAqiCache({
        apiKey: 'synthetic-key',
        outputPath,
        now: NOW,
        fetchImpl: async () => ({ ok: true, json: async () => ({ records: [] }) })
      })
    ).rejects.toBeInstanceOf(AqiValidationError);

    expect(await readFile(outputPath, 'utf8')).toBe(lastGood);
  });
});

describe('production cache validator CLI', () => {
  it('validates a production cache with workflow-configurable thresholds', async () => {
    const directory = await createTemporaryDirectory();
    const cachePath = path.join(directory, 'aqi-latest.json');
    const cache = buildProductionCache({ records: makeRecords(84) }, { now: NOW });
    await writeFile(cachePath, `${JSON.stringify(cache)}\n`, 'utf8');

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        path.resolve('scripts/validate-aqi-cache.mjs'),
        cachePath,
        '--now',
        NOW,
        '--min-records',
        '80',
        '--min-counties',
        '20',
        '--min-valid-ratio',
        '1'
      ],
      { cwd: process.cwd() }
    );

    expect(stderr).toBe('');
    expect(stdout).toContain('Validated 84/84 AQI records');
  });
});

describe('fetch error redaction', () => {
  it('does not expose the request URL or API key when the network layer throws', async () => {
    const apiKey = 'synthetic-secret-value';

    const request = fetchOfficialAqiPayload({
      apiKey,
      fetchImpl: async (requestUrl) => {
        throw new Error(`upstream failure for ${requestUrl}`);
      }
    });

    await expect(request).rejects.toThrow('MOENV AQI request failed before receiving a response.');
    await expect(request).rejects.not.toThrow(apiKey);
    await expect(request).rejects.not.toThrow('https://');
  });
});

function makeRecords(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => ({
    sitename: `測站 ${index + 1}`,
    county: TAIWAN_COUNTIES[index % TAIWAN_COUNTIES.length],
    aqi: String((index % 200) + 1),
    pollutant: index % 2 === 0 ? 'PM2.5' : '',
    status: '良好',
    so2: '1.2',
    co: '0.23',
    o3: '35',
    o3_8hr: '30',
    pm10: '22',
    'pm2.5': '11',
    no2: '8',
    nox: '9',
    no: '1',
    wind_speed: '2.1',
    wind_direc: '180',
    publishtime: '2026/08/09 11:00:00',
    co_8hr: '0.2',
    'pm2.5_avg': '10',
    pm10_avg: '20',
    so2_avg: '1',
    longitude: '121.500000',
    latitude: '25.000000',
    siteid: String(index + 1).padStart(3, '0'),
    ...overrides
  }));
}

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aqi-contract-'));
  temporaryDirectories.push(directory);
  return directory;
}
