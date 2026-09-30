import { describe, expect, it } from 'vitest';
import { getFreshness } from './aqi';
import { formatHours, formatPublishTime } from './format';

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


describe('observation timestamps', () => {
  it('does not round normalized freshness across the three-hour stop', () => {
    const before = getFreshness('2026-09-30T01:00:01Z', '2026-09-30T04:00:00Z');
    expect(before.isStale).toBe(false);
    expect(formatHours(before.hoursSinceUpdate)).toBe('2.9 小時前');
    const boundary = getFreshness('2026-09-30T01:00:00Z', '2026-09-30T04:00:00Z');
    expect(boundary.isStale).toBe(true);
    expect(formatHours(boundary.hoursSinceUpdate)).toBe('3.0 小時前');
  });

  it('includes the year and explicit Taiwan-local time without echoing invalid dates', () => {
    expect(formatPublishTime('2026-09-30T03:00:00Z')).toBe('2026/09/30 11:00');
    expect(formatPublishTime('2026-09-29T16:00:00Z')).toBe('2026/09/30 00:00');
    expect(formatPublishTime(null)).toBe('未知');
    expect(formatPublishTime('bad date')).toBe('未知');
  });
});
