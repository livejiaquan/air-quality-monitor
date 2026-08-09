import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { promoteAqiPayload } from './aqi-cache-contract.mjs';

const ENDPOINT = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const DEFAULT_OUTPUT = path.resolve('public/data/aqi-latest.json');

export async function fetchOfficialAqiPayload({ apiKey, fetchImpl = fetch } = {}) {
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('MOENV_API_KEY is required.');
  }

  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set('format', 'json');
  requestUrl.searchParams.set('limit', '1000');
  requestUrl.searchParams.set('sort', 'ImportDate desc');
  requestUrl.searchParams.set('api_key', apiKey.trim());

  let response;
  try {
    response = await fetchImpl(requestUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'taiwan-aqi-dashboard/0.1.0'
      }
    });
  } catch {
    throw new Error('MOENV AQI request failed before receiving a response.');
  }

  if (!response?.ok) {
    const status = Number.isInteger(response?.status) ? response.status : 'unknown';
    throw new Error(`MOENV AQI request failed with HTTP status ${status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('MOENV AQI response was not valid JSON.');
  }
}

export async function refreshAqiCache({
  apiKey = process.env.MOENV_API_KEY,
  outputPath = DEFAULT_OUTPUT,
  fetchImpl = fetch,
  ...validationOptions
} = {}) {
  const payload = await fetchOfficialAqiPayload({ apiKey, fetchImpl });
  return promoteAqiPayload(payload, {
    outputPath,
    ...validationOptions
  });
}

async function main() {
  const result = await refreshAqiCache();
  console.log(`Promoted ${result.recordCount} validated AQI records to the production cache.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'AQI cache refresh failed.';
    console.error(message);
    process.exitCode = 1;
  });
}
