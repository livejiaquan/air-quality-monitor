import type { AqiCategoryId } from './aqi';

export type AqiSwatch = {
  /** Background fill following the official Taiwan hue (green → maroon). */
  fill: string;
  /** Text colour drawn on top of `fill`, chosen for ≥4.5:1 contrast. */
  ink: string;
};

// Official MOENV hues (綠/黃/橘/紅/紫/褐紅) close to the EPA reference values,
// with lightness tuned so the number on top stays readable. Category text and
// the number are always shown next to the colour, so colour is never the only cue.
export const AQI_SWATCHES: Record<AqiCategoryId, AqiSwatch> = {
  good: { fill: '#34b864', ink: '#052e16' },
  moderate: { fill: '#f6d743', ink: '#3b2f00' },
  sensitive: { fill: '#fb8c2c', ink: '#3a1500' },
  unhealthy: { fill: '#d92b3a', ink: '#ffffff' },
  veryUnhealthy: { fill: '#8b45b0', ink: '#ffffff' },
  hazardous: { fill: '#7e0023', ink: '#ffffff' },
  unknown: { fill: '#9aa3b2', ink: '#111827' }
};

export const AQI_SCALE: Array<{ id: AqiCategoryId; label: string; min: number; max: number }> = [
  { id: 'good', label: '良好', min: 0, max: 50 },
  { id: 'moderate', label: '普通', min: 51, max: 100 },
  { id: 'sensitive', label: '敏感族群不健康', min: 101, max: 150 },
  { id: 'unhealthy', label: '所有族群不健康', min: 151, max: 200 },
  { id: 'veryUnhealthy', label: '非常不健康', min: 201, max: 300 },
  { id: 'hazardous', label: '危害', min: 301, max: 500 }
];

/**
 * Position (0–100%) of an AQI value on a scale where each of the six
 * categories gets an equal-width segment, like a typical AQI scale bar.
 */
export function getScalePosition(aqi: number): number {
  if (!Number.isFinite(aqi) || aqi <= 0) return 0;
  const index = AQI_SCALE.findIndex((band) => aqi <= band.max);
  if (index === -1) return 100;
  const band = AQI_SCALE[index];
  const lower = index === 0 ? 0 : AQI_SCALE[index - 1].max;
  const within = (aqi - lower) / (band.max - lower);
  return Math.min(100, Math.max(0, ((index + within) / AQI_SCALE.length) * 100));
}
