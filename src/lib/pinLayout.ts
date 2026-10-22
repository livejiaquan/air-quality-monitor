export type PinCandidate = {
  id: string;
  /** Screen position of the pin centre, in pixels. */
  x: number;
  y: number;
  /** Higher wins a contested spot. */
  priority: number;
};

export type PinBox = { width: number; height: number; gap: number };

/**
 * Greedy collision avoidance for map labels: candidates are placed in
 * priority order, and any pin whose box would overlap an already placed
 * one is left out (the map draws it as a small dot instead). Returns the
 * ids that get a full number pin.
 */
export function selectVisiblePins(candidates: PinCandidate[], box: PinBox): Set<string> {
  const halfWidth = box.width / 2 + box.gap / 2;
  const halfHeight = box.height / 2 + box.gap / 2;
  const placed: PinCandidate[] = [];
  const visible = new Set<string>();

  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority)) {
    const collides = placed.some(
      (other) => Math.abs(other.x - candidate.x) < halfWidth * 2 && Math.abs(other.y - candidate.y) < halfHeight * 2
    );
    if (!collides) {
      placed.push(candidate);
      visible.add(candidate.id);
    }
  }

  return visible;
}
