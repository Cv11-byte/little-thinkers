// Number shapes as finger-tracing strokes, in a 400 x 500 box.
// Each number is a list of strokes traced in order.

export const GLYPH_W = 400;
export const GLYPH_H = 500;

export const NUMBER_STROKES: Record<number, string[]> = {
  1: ['M 150 140 L 225 70 L 225 440'],
  2: ['M 115 165 C 115 55, 300 55, 300 165 C 300 255, 170 320, 105 440 L 310 440'],
  3: ['M 115 115 C 185 45, 310 75, 295 165 C 285 225, 220 240, 190 240 C 285 240, 320 300, 305 360 C 285 450, 160 460, 105 400'],
  4: ['M 245 70 L 95 320 L 325 320', 'M 255 175 L 255 445'],
  5: ['M 295 75 L 140 75 L 125 225 C 200 185, 315 205, 310 315 C 305 430, 175 460, 110 400'],
  6: ['M 285 100 C 205 50, 105 140, 110 300 C 115 425, 300 440, 300 330 C 300 225, 150 225, 115 315'],
  7: ['M 100 80 L 305 80 L 165 445'],
  8: ['M 205 85 C 115 85, 115 210, 205 245 C 300 285, 300 440, 205 440 C 110 440, 110 285, 205 245 C 295 210, 295 85, 205 85'],
  9: ['M 290 170 C 290 75, 115 75, 115 170 C 115 265, 290 265, 290 170 L 290 300 C 290 405, 225 450, 125 425'],
  10: ['M 70 140 L 130 80 L 130 440', 'M 275 80 C 370 80, 370 440, 275 440 C 180 440, 180 80, 275 80'],
};

export interface TraceSettings {
  /** how close (glyph units) the finger must stay to the path */
  tolerance: number;
  /** fraction of a stroke that must be traced; near 1 means "all the way to the end" */
  finishAt: number;
  /** how far ahead (in 8-unit samples) one finger move can advance; small = must follow the line */
  lookAhead: number;
  /** numbers practiced at this level, in order (picks up where the child left off) */
  numbers: number[];
}

const ONE_TO_TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function traceSettings(level: number): TraceSettings {
  switch (level) {
    case 1:
      return { tolerance: 95, finishAt: 0.95, lookAhead: 6, numbers: ONE_TO_TEN };
    case 2:
      return { tolerance: 72, finishAt: 0.97, lookAhead: 5, numbers: ONE_TO_TEN };
    case 3:
      return { tolerance: 62, finishAt: 0.98, lookAhead: 4, numbers: ONE_TO_TEN };
    default:
      return { tolerance: 52, finishAt: 0.99, lookAhead: 4, numbers: ONE_TO_TEN };
  }
}

export interface Pt2 {
  x: number;
  y: number;
}

/**
 * Advance along sampled points if the finger is near one of the next few samples.
 * Returns the new index (unchanged if the finger is off the path).
 */
export function advance(samples: Pt2[], idx: number, finger: Pt2, tolerance: number, lookAhead = 4): number {
  let best = idx;
  const end = Math.min(samples.length - 1, idx + lookAhead);
  for (let k = idx + 1; k <= end; k++) {
    const s = samples[k];
    if (Math.hypot(s.x - finger.x, s.y - finger.y) <= tolerance) best = k;
  }
  return best;
}

/** Is the finger close enough to the star (current point) to grab it? */
export function nearHead(samples: Pt2[], idx: number, finger: Pt2, tolerance: number): boolean {
  const h = samples[idx];
  return !!h && Math.hypot(h.x - finger.x, h.y - finger.y) <= tolerance * 1.25;
}
