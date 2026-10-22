import { normalizeAqiPayload, type AqiDataset, type SourceKind } from './aqi';

type StaticAqiCache = {
  generatedAt?: string;
  source?: {
    kind?: SourceKind;
    dataset?: string;
    url?: string;
  };
  records?: unknown[];
  warnings?: string[];
};

export type DemoMode = 'normal' | 'error' | 'empty' | 'loading';

const CACHE_URL = `${import.meta.env.BASE_URL}data/aqi-latest.json`;

export async function loadAqiDataset(mode: DemoMode = getDemoMode()): Promise<AqiDataset> {
  if (mode === 'error') {
    throw new Error('Demo error: unable to load AQI cache.');
  }

  if (mode === 'loading') {
    return new Promise(() => undefined);
  }

  if (mode === 'empty') {
    return normalizeAqiPayload(
      { records: [] },
      {
        generatedAt: new Date().toISOString(),
        sourceKind: 'fallback'
      }
    );
  }

  const response = await fetch(CACHE_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache'
  });

  if (!response.ok) {
    throw new Error(`AQI cache request failed with HTTP ${response.status}.`);
  }

  const cache = (await response.json()) as StaticAqiCache;
  const dataset = normalizeAqiPayload(
    { records: Array.isArray(cache.records) ? cache.records : [] },
    {
      generatedAt: cache.generatedAt,
      nowISO: new Date().toISOString(),
      sourceKind: parseSourceKind(cache.source?.kind),
      sourceUrl: cache.source?.url
    }
  );

  return {
    ...dataset,
    warnings: [...(Array.isArray(cache.warnings) ? cache.warnings : []), ...dataset.warnings]
  };
}

function parseSourceKind(value: unknown): SourceKind {
  if (value === 'official-cache' || value === 'sample' || value === 'fallback') return value;
  return 'fallback';
}

export function getDemoMode(search = window.location.search): DemoMode {
  const params = new URLSearchParams(search);
  const mode = params.get('demo');
  if (mode === 'error' || mode === 'empty' || mode === 'loading') return mode;
  return 'normal';
}
