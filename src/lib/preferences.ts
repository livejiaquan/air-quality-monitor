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

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const saved = read(THEME_KEY);
    // Light by default, like the IQAir reference; dark stays one tap away and is remembered.
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#f6f7f9');
  }, [theme]);

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
