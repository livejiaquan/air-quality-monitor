import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API_KEY = process.env.MOENV_API_KEY;
const ENDPOINT = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const OUTPUT = path.resolve('public/data/aqi-latest.json');

if (!API_KEY) {
  console.error('MOENV_API_KEY is required. Register at https://data.moenv.gov.tw/api_term and set the key as an environment variable.');
  process.exit(1);
}

const url = new URL(ENDPOINT);
url.searchParams.set('format', 'json');
url.searchParams.set('limit', '1000');
url.searchParams.set('sort', 'ImportDate desc');
url.searchParams.set('api_key', API_KEY);

const response = await fetch(url, {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'taiwan-aqi-dashboard/0.1.0'
  }
});

if (!response.ok) {
  throw new Error(`MOENV AQI request failed: HTTP ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const records = Array.isArray(payload.records) ? payload.records : Array.isArray(payload) ? payload : [];

if (records.length === 0) {
  throw new Error('MOENV AQI response contained no records.');
}

const cache = {
  generatedAt: new Date().toISOString(),
  source: {
    kind: 'official-cache',
    dataset: 'AQX_P_432',
    url: 'https://data.moenv.gov.tw/dataset/detail/AQX_P_432'
  },
  warnings: [],
  records
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');

console.log(`Wrote ${records.length} AQI records to ${OUTPUT}`);

