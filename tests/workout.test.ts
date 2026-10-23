import { describe, expect, it } from 'vitest';
import { bossLevel, buildWorkout, nextIndex } from '../src/workout/plan';
import { bossPlan } from '../src/games/boss/RocketRescue';
import { GAME_BY_ID, MENU_ORDER } from '../src/games/registry';
import { defaultData, todayKey, workoutDoneToday } from '../src/engine/storage';

describe('Brain Workout plan', () => {
  it('always ends with a move break and then the boss', () => {
    for (const kid of ['kid1', 'kid2'] as const)
      for (const m of [10, 20, 30]) {
        const w = buildWorkout(kid, m);
        expect(w[w.length - 1]).toEqual({ kind: 'boss' });
        expect(w[w.length - 2].kind).toBe('move');
        for (const s of w) if (s.kind === 'game') expect(GAME_BY_ID[s.gameId]).toBeDefined();
      }
  });

  it('every length visits every game (except Free Build); longer means more rounds', () => {
    for (const kid of ['kid1', 'kid2'] as const) {
      const all = MENU_ORDER[kid].filter((g) => g !== 'block-builder').sort();
      for (const m of [10, 20, 30]) {
        const ids = buildWorkout(kid, m).flatMap((s) => (s.kind === 'game' ? [s.gameId] : []));
        expect([...ids].sort()).toEqual(all);
      }
    }
    const r = (m: number) => (buildWorkout('kid1', m).find((s) => s.kind === 'game') as { rounds: number }).rounds;
    expect([r(10), r(20), r(30)]).toEqual([1, 2, 3]);
  });

  it('never puts two move breaks in a row', () => {
    for (const m of [10, 20, 30]) {
      const w = buildWorkout('kid1', m);
      for (let i = 1; i < w.length; i++) expect(w[i].kind === 'move' && w[i - 1].kind === 'move').toBe(false);
    }
  });

  it('never skips a stop, even when it runs long', () => {
    const w = buildWorkout('kid1', 20);
    const bossAt = w.findIndex((s) => s.kind === 'boss');
    expect(nextIndex(w, 0, 0, 20)).toBe(1);
    expect(nextIndex(w, 0, 90 * 60_000, 20)).toBe(1);
    expect(nextIndex(w, bossAt, 0, 20)).toBe(w.length);
  });

  it('boss level follows the games', () => {
    const d = defaultData();
    const w = buildWorkout('kid1', 10);
    expect(bossLevel(d, 'kid1', w)).toBe(2);
    for (const s of w) if (s.kind === 'game') d.kids.kid1.games[s.gameId] = { level: 4, recent: [], rounds: 0, independent: 0, hints: 0, mistakes: 0, lastPlayed: null, mem: {} };
    expect(bossLevel(d, 'kid1', w)).toBe(4);
    expect(bossLevel(d, 'kid2', buildWorkout('kid2', 10))).toBe(1);
  });

  it('boss puzzles always include the right answer', () => {
    for (let seed = 1; seed < 200; seed += 7)
      for (const lvl of [1, 2, 3, 4]) {
        const b = bossPlan(lvl, seed);
        expect(b.fuel).toContain(b.fuelTarget);
        expect(b.doors).toContain(b.door);
        expect(Math.max(...b.seq)).toBeLessThan(b.lights);
        for (let i = 1; i < b.seq.length; i++) expect(b.seq[i]).not.toBe(b.seq[i - 1]);
      }
    expect(bossPlan(1, 5).countFrom).toBe(0);
    expect(bossPlan(4, 5).countFrom).toBe(5);
  });

  it('knows when today is done', () => {
    const d = defaultData();
    const now = new Date(2026, 9, 17, 9, 0);
    expect(workoutDoneToday(d, 'kid1', now)).toBe(false);
    d.kids.kid1.workouts.push(todayKey(now));
    expect(workoutDoneToday(d, 'kid1', now)).toBe(true);
    expect(workoutDoneToday(d, 'kid1', new Date(2026, 9, 18, 9, 0))).toBe(false);
    expect(todayKey(now)).toBe('2026-10-17');
  });
});
