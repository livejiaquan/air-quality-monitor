import { describe, expect, it } from 'vitest';
import { formatHours } from './format';

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
