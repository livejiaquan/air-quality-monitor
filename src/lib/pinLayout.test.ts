import { describe, expect, it } from 'vitest';
import { selectVisiblePins } from './pinLayout';

const box = { width: 36, height: 24, gap: 4 };

describe('selectVisiblePins', () => {
  it('keeps every pin when none overlap', () => {
    const visible = selectVisiblePins(
      [
        { id: 'a', x: 0, y: 0, priority: 1 },
        { id: 'b', x: 100, y: 0, priority: 2 },
        { id: 'c', x: 0, y: 100, priority: 3 }
      ],
      box
    );
    expect([...visible].sort()).toEqual(['a', 'b', 'c']);
  });

  it('gives a contested spot to the higher priority pin', () => {
    const visible = selectVisiblePins(
      [
        { id: 'low', x: 0, y: 0, priority: 40 },
        { id: 'high', x: 10, y: 5, priority: 180 }
      ],
      box
    );
    expect([...visible]).toEqual(['high']);
  });

  it('treats the gap as part of the box', () => {
    const touching = [
      { id: 'a', x: 0, y: 0, priority: 2 },
      { id: 'b', x: 38, y: 0, priority: 1 }
    ];
    expect(selectVisiblePins(touching, box).has('b')).toBe(false);
    expect(selectVisiblePins(touching, { ...box, gap: 0 }).has('b')).toBe(true);
  });

  it('lets a dropped pin free its spot for others', () => {
    // b loses to a; c only overlaps b, so it must still be placed.
    const visible = selectVisiblePins(
      [
        { id: 'a', x: 0, y: 0, priority: 3 },
        { id: 'b', x: 30, y: 0, priority: 2 },
        { id: 'c', x: 60, y: 0, priority: 1 }
      ],
      box
    );
    expect([...visible].sort()).toEqual(['a', 'c']);
  });
});
