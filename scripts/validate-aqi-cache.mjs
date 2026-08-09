import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateProductionCache } from './aqi-cache-contract.mjs';

const DEFAULT_CACHE_PATH = 'public/data/aqi-latest.json';

async function main() {
  const { cachePath, options } = parseArguments(process.argv.slice(2));
  let cache;

  try {
    cache = JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    throw new Error('AQI cache could not be read as JSON.');
  }

  const validation = validateProductionCache(cache, options);
  if (!validation.ok) {
    throw new Error(`AQI cache is not production-safe: ${validation.issues.join(' ')}`);
  }

  console.log(
    `Validated ${validation.validRecordCount}/${validation.totalRecords} AQI records; newest publish time ${validation.newestPublishTime}.`
  );
}

function parseArguments(args) {
  let cachePath = path.resolve(DEFAULT_CACHE_PATH);
  let pathProvided = false;
  const options = {};
  const valueFlags = new Map([
    ['--min-records', ['minRecords', parseInteger]],
    ['--min-counties', ['minCounties', parseInteger]],
    ['--min-valid-ratio', ['minValidRatio', parseNumber]],
    ['--max-age-hours', ['maxAgeHours', parseNumber]],
    ['--future-tolerance-minutes', ['futureToleranceMinutes', parseNumber]],
    ['--now', ['now', String]]
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      if (pathProvided) {
        throw new Error('Only one AQI cache path may be provided.');
      }
      cachePath = path.resolve(argument);
      pathProvided = true;
      continue;
    }

    const definition = valueFlags.get(argument);
    const rawValue = args[index + 1];
    if (!definition || rawValue === undefined || rawValue.startsWith('--')) {
      throw new Error('AQI validator received an invalid option.');
    }
    const [name, parse] = definition;
    options[name] = parse(rawValue, argument);
    index += 1;
  }

  return { cachePath, options };
}

function parseInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${flag} must be an integer.`);
  return parsed;
}

function parseNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${flag} must be a number.`);
  return parsed;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'AQI cache validation failed.';
  console.error(message);
  process.exitCode = 1;
});
