import { describe, expect, it } from 'vitest';
import { AQI_CATEGORIES } from './aqi';
import { AQI_SCALE, AQI_SWATCHES, getScalePosition } from './palette';

describe('AQI palette', () => {
  it('keeps the display scale aligned with the official category bands', () => {
    const official = AQI_CATEGORIES.filter((category) => category.id !== 'unknown');
    expect(AQI_SCALE.map(({ id, min, max }) => ({ id, min, max }))).toEqual(official.map(({ id, min, max }) => ({ id, min, max })));
  });

  it('has a swatch for every category', () => {
    for (const category of AQI_CATEGORIES) expect(AQI_SWATCHES[category.id]).toBeDefined();
  });
});

describe('getScalePosition', () => {
  it('places category boundaries on equal-width segment edges', () => {
    expect(getScalePosition(0)).toBe(0);
    expect(getScalePosition(50)).toBeCloseTo(100 / 6);
    expect(getScalePosition(100)).toBeCloseTo(200 / 6);
    expect(getScalePosition(300)).toBeCloseTo(500 / 6);
    expect(getScalePosition(500)).toBe(100);
  });

  it('clamps out-of-range values', () => {
    expect(getScalePosition(-5)).toBe(0);
    expect(getScalePosition(650)).toBe(100);
  });
});
