// The Brain Workout: a fixed, calm path through the games, with movement breaks,
// ending in the boss game and a goodbye. Pure functions so it can be tested.

import { type Phrase, p } from '../engine/i18n';
import type { AppData, KidId } from '../engine/storage';
import { clampLevel } from '../engine/adaptive';
import { makeRng } from '../engine/rng';
import { ROUNDS_BY_LEVEL } from '../engine/storage';

export type Station =
  | { kind: 'game'; gameId: string; rounds: number; /** fixed level for this stop (Mix-Up) */ level?: number }
  | { kind: 'move'; move: MoveId }
  | { kind: 'boss'; level?: number };

export type MoveId = 'frog' | 'giraffe' | 'elephant' | 'bird';

export interface Move {
  id: MoveId;
  emoji: string;
  say: Phrase;
  count: number;
}

export const MOVES: Record<MoveId, Move> = {
  frog: { id: 'frog', emoji: '🐸', say: p('Stand up! Jump like a frog!', '¡Párate! ¡Salta como una rana!'), count: 5 },
  giraffe: { id: 'giraffe', emoji: '🦒', say: p('Stand up tall! Reach up high like a giraffe!', '¡Párate! ¡Estírate alto como una jirafa!'), count: 3 },
  elephant: { id: 'elephant', emoji: '🐘', say: p('Stomp, stomp, like an elephant!', '¡Pisa fuerte como un elefante!'), count: 5 },
  bird: { id: 'bird', emoji: '🐦', say: p('Flap your arms like a little bird!', '¡Mueve los brazos como un pajarito!'), count: 5 },
};

const MOVE_ORDER: MoveId[] = ['frog', 'giraffe', 'elephant', 'bird'];

/** Games in the order a workout visits them: warm-up first, the trickiest near the end. */
export const WORKOUT_ORDER: Record<KidId, string[]> = {
  // 'trace' = numbers one day, letters the next
  kid1: ['pop-balloons', 'who-says', 'trace', 'more-less', 'shape-puzzle', 'copy-me', 'block-puzzle', 'help-a-friend', 'feed-the-bear', 'animal-homes', 'rocket-maze'],
  kid2: ['pop-balloons', 'who-says', 'feed-the-bear', 'animal-homes', 'shape-puzzle', 'block-puzzle', 'copy-me', 'help-a-friend'],
};

/** minutes → [games, rounds per game, move break after every N games] */
const SHAPE: Record<number, [number, number, number]> = {
  10: [4, 2, 2],
  20: [7, 3, 3],
  30: [11, 4, 3],
};

/** Tracing alternates by day: numbers on even days, letters on odd days. */
export function traceGameFor(day: Date): string {
  const n = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000);
  return n % 2 === 0 ? 'trace-numbers' : 'trace-letters';
}

export function buildWorkout(kid: KidId, minutes: number, moveBreaks = true, day = new Date(), level = 0): Station[] {
  const [nGames, baseRounds, every] = SHAPE[minutes] ?? SHAPE[20];
  // a harder chosen level also means more stars per game
  const rounds = level ? Math.max(baseRounds, ROUNDS_BY_LEVEL[level]) : baseRounds;
  const games = WORKOUT_ORDER[kid].slice(0, nGames).map((g) => (g === 'trace' ? traceGameFor(day) : g));
  const out: Station[] = [];
  let moves = 0;
  games.forEach((gameId, i) => {
    out.push({ kind: 'game', gameId, rounds });
    const last = i === games.length - 1;
    if (moveBreaks && !last && (i + 1) % every === 0) out.push({ kind: 'move', move: MOVE_ORDER[moves++ % MOVE_ORDER.length] });
  });
  // one last wiggle before the big finale
  if (moveBreaks) out.push({ kind: 'move', move: MOVE_ORDER[moves % MOVE_ORDER.length] });
  out.push({ kind: 'boss' });
  return out;
}

/** Boss difficulty follows how the child is doing in the games of this workout. */
export function bossLevel(data: AppData, kid: KidId, stations: Station[]): number {
  const levels = stations.flatMap((s) => (s.kind === 'game' ? [data.kids[kid].games[s.gameId]?.level ?? (kid === 'kid1' ? 2 : 1)] : []));
  if (!levels.length) return kid === 'kid1' ? 2 : 1;
  return clampLevel(Math.round(levels.reduce((a, b) => a + b, 0) / levels.length));
}

/** If the session is running long, skip straight to the finale. */
export function nextIndex(stations: Station[], current: number, elapsedMs: number, minutes: number): number {
  const next = current + 1;
  if (next >= stations.length) return next;
  const over = elapsedMs > minutes * 60_000;
  if (over && stations[next].kind !== 'boss') return stations.findIndex((s) => s.kind === 'boss');
  return next;
}

/**
 * Mix-Up: games in a random order, each at a random level, so one stop can be a long
 * 5-star challenge and the next a quick easy one. One move break in the middle, the
 * rocket finale at a random level, no once-a-day limit.
 */
export function buildMix(kid: KidId, games: string[], seed: number, count = 8): Station[] {
  const rng = makeRng(seed);
  const maxLevel = kid === 'kid1' ? 4 : 3;
  const out: Station[] = [];
  let last = '';
  for (let i = 0; i < count; i++) {
    let g = games[Math.floor(rng() * games.length)];
    for (let t = 0; t < 10 && g === last; t++) g = games[Math.floor(rng() * games.length)];
    last = g;
    const level = 1 + Math.floor(rng() * maxLevel);
    // short and easy, or long and hard
    const rounds = Math.max(2, ROUNDS_BY_LEVEL[level] - (rng() < 0.4 ? 1 : 0));
    out.push({ kind: 'game', gameId: g, rounds, level });
    if (i === Math.floor(count / 2) - 1) out.push({ kind: 'move', move: MOVE_ORDER[Math.floor(rng() * MOVE_ORDER.length)] });
  }
  out.push({ kind: 'boss', level: 1 + Math.floor(rng() * maxLevel) });
  return out;
}
