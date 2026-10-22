import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'aqi:theme';
const STATION_KEY = 'aqi:station';

export type ThemeChoice = 'light' | 'dark';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: preferences simply don't persist.
  }
}

function systemTheme(): ThemeChoice {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const saved = read(THEME_KEY);
    return saved === 'dark' || saved === 'light' ? saved : systemTheme();
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#f6f7f9');
  }, [theme]);

  useEffect(() => {
    if (read(THEME_KEY)) return;
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(query.matches ? 'dark' : 'light');
    query?.addEventListener('change', onChange);
    return () => query?.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      write(THEME_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

export function readSavedStationId(): string | null {
  return read(STATION_KEY);
}

export function saveStationId(siteId: string | null) {
  write(STATION_KEY, siteId);
}
