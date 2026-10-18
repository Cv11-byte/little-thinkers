// The Brain Workout: a fixed, calm path through the games, with movement breaks,
// ending in the boss game and a goodbye. Pure functions so it can be tested.

import { type Phrase, p } from '../engine/i18n';
import type { AppData, KidId } from '../engine/storage';
import { clampLevel } from '../engine/adaptive';

export type Station = { kind: 'game'; gameId: string; rounds: number } | { kind: 'move'; move: MoveId } | { kind: 'boss' };

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
  kid1: ['pop-balloons', 'who-says', 'shape-puzzle', 'feed-the-bear', 'copy-me', 'animal-homes', 'trace-numbers', 'help-a-friend', 'rocket-maze'],
  kid2: ['pop-balloons', 'who-says', 'feed-the-bear', 'animal-homes', 'shape-puzzle', 'copy-me', 'help-a-friend'],
};

/** minutes → [games, rounds per game, move break after every N games] */
const SHAPE: Record<number, [number, number, number]> = {
  10: [4, 2, 2],
  20: [7, 3, 3],
  30: [9, 4, 3],
};

export function buildWorkout(kid: KidId, minutes: number, moveBreaks = true): Station[] {
  const [nGames, rounds, every] = SHAPE[minutes] ?? SHAPE[20];
  const games = WORKOUT_ORDER[kid].slice(0, nGames);
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
