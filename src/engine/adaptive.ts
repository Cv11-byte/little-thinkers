// Rule-based difficulty. Pure functions only, no randomness, no clocks.
//
//  - A round is "independent" when it was solved with no hint and at most 1 mistake.
//  - A round is "assisted" when a hint was used or there were 3+ mistakes.
//  - 3 independent rounds in a row at a level -> move up one level.
//  - 3 assisted rounds in a row at a level -> move down one level.
//  - Anything else keeps the level. Changes only happen between rounds.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 4;
export const STREAK = 3;

export interface RoundResult {
  mistakes: number;
  hints: number;
}

export type RoundKind = 'independent' | 'assisted' | 'mixed';

export function classify(r: RoundResult): RoundKind {
  if (r.hints === 0 && r.mistakes <= 1) return 'independent';
  if (r.hints > 0 || r.mistakes >= 3) return 'assisted';
  return 'mixed';
}

export interface LevelState {
  level: number;
  /** results since the last level change, newest last (kept short) */
  recent: RoundKind[];
}

export interface LevelUpdate {
  state: LevelState;
  change: 'up' | 'down' | null;
}

export function clampLevel(n: number): number {
  if (!Number.isFinite(n)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(n)));
}

export function applyRound(prev: LevelState, result: RoundResult): LevelUpdate {
  const kind = classify(result);
  const recent = [...prev.recent, kind].slice(-STREAK);
  const lastN = recent.length === STREAK ? recent : null;

  if (lastN && lastN.every((k) => k === 'independent') && prev.level < MAX_LEVEL) {
    return { state: { level: prev.level + 1, recent: [] }, change: 'up' };
  }
  if (lastN && lastN.every((k) => k === 'assisted') && prev.level > MIN_LEVEL) {
    return { state: { level: prev.level - 1, recent: [] }, change: 'down' };
  }
  return { state: { level: prev.level, recent }, change: null };
}

/** After this many mistakes in a round, the game shows a hint on its own. */
export const AUTO_HINT_AFTER = 2;
