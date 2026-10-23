import { describe, expect, it } from 'vitest';
import { formatAge, formatHours, formatPublishLabel } from './format';

describe('formatHours', () => {
  it('does not round a still-fresh age up to the three-hour hard stop', () => {
    expect(formatHours(2.99)).toBe('2.9 小時前');
    expect(formatHours(3)).toBe('3.0 小時前');
  });

  it('does not round across the day-display boundary', () => {
    expect(formatHours(47.99)).toBe('47 小時前');
    expect(formatHours(48)).toBe('2 天前');
  });
});

describe('formatPublishLabel', () => {
  const now = new Date('2026-10-22T08:30:00Z'); // 16:30 in Taipei

  it('shows only the Taipei clock time for today', () => {
    expect(formatPublishLabel('2026-10-22T07:00:00Z', now)).toBe('15:00');
  });

  it('adds the Taipei date when the publish day differs', () => {
    expect(formatPublishLabel('2026-10-21T15:30:00Z', now)).toBe('10/21 23:30');
  });

  it('falls back for missing or invalid input', () => {
    expect(formatPublishLabel(null, now)).toBe('時間未知');
    expect(formatPublishLabel('not-a-date', now)).toBe('時間未知');
  });
});

describe('formatAge', () => {
  it('uses whole minutes, hours or days', () => {
    expect(formatAge(0.005)).toBe('1 分鐘前');
    expect(formatAge(0.5)).toBe('30 分鐘前');
    expect(formatAge(1)).toBe('1 小時前');
    expect(formatAge(4.8)).toBe('4 小時前');
    expect(formatAge(47.9)).toBe('47 小時前');
    expect(formatAge(50)).toBe('2 天前');
    expect(formatAge(null)).toBe('時間未知');
  });
});
