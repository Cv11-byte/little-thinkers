import { describe, expect, it } from 'vitest';
import { moreLessPlan } from '../src/games/moreless/MoreLess';
import { PUZZLES, parsePuzzle, puzzlePlan, rotate, normalize } from '../src/games/blocks/BlockPuzzle';
import { buildMix, buildWorkout } from '../src/workout/plan';
import { MENU_ORDER, GAME_SKILLS, GAMES } from '../src/games/registry';
import { ROUNDS_BY_LEVEL, sanitize } from '../src/engine/storage';

describe('Más o Menos', () => {
  it('compare rounds always have a clear answer within the level range', () => {
    const max: Record<number, number> = { 1: 5, 2: 6, 3: 8, 4: 10 };
    for (const lvl of [1, 2, 3, 4])
      for (let s = 0; s < 40; s++)
        for (const r of [0, 2]) {
          const pl = moreLessPlan(lvl, s, r);
          expect(pl.kind).toBe('compare');
          expect(pl.a).not.toBe(pl.b);
          expect(Math.max(pl.a, pl.b)).toBeLessThanOrEqual(max[lvl]);
          expect(Math.min(pl.a, pl.b)).toBeGreaterThanOrEqual(1);
          if (lvl === 1) expect(Math.abs(pl.a - pl.b)).toBeGreaterThanOrEqual(3);
        }
  });

  it('little one only hears "more"; later levels take turns with "less"', () => {
    for (let r = 0; r < 4; r++) expect(moreLessPlan(1, 3, r).ask).toBe('more');
    expect(moreLessPlan(2, 3, 1).ask).toBe('less');
  });

  it('take-away rounds (levels 3–4) have the answer among 3 options and something left', () => {
    for (const lvl of [3, 4])
      for (let s = 0; s < 40; s++) {
        const pl = moreLessPlan(lvl, s, 1);
        expect(pl.kind).toBe('takeaway');
        expect(pl.left).toBe(pl.start - pl.eat);
        expect(pl.left).toBeGreaterThanOrEqual(1);
        expect(pl.options).toContain(pl.left);
        expect(pl.options.length).toBe(3);
      }
  });
});

describe('Construir (block puzzle)', () => {
  it('every puzzle is cut into connected pieces that fill it exactly', () => {
    for (const [lvl, list] of Object.entries(PUZZLES))
      for (const pz of list) {
        const { outline, pieces } = parsePuzzle(pz);
        expect(pieces.reduce((n, p) => n + p.cells.length, 0)).toBe(outline.length);
        expect(pieces.length).toBeGreaterThanOrEqual(Number(lvl) <= 1 ? 2 : Number(lvl) === 2 ? 3 : 3);
        for (const p of pieces) {
          // connected
          const set = new Set(p.cells.map((c) => c.join(',')));
          const seen = new Set([p.cells[0].join(',')]);
          const stack = [p.cells[0]];
          while (stack.length) {
            const [c, r] = stack.pop()!;
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const k = `${c + dc},${r + dr}`;
              if (set.has(k) && !seen.has(k)) {
                seen.add(k);
                stack.push([c + dc, r + dr]);
              }
            }
          }
          expect(seen.size, `${pz.name.en} piece ${p.letter}`).toBe(p.cells.length);
        }
      }
  });

  it('four turns bring a piece back; only the top level turns pieces', () => {
    const L: [number, number][] = [[0, 0], [0, 1], [1, 1]];
    expect(rotate(rotate(rotate(rotate(L))))).toEqual(normalize(L));
    expect(puzzlePlan(3, 5, 0).turns.every((t) => t === 0)).toBe(true);
    expect(puzzlePlan(4, 5, 0).rotateOn).toBe(true);
  });
});

describe('levels, rounds and modes', () => {
  it('harder levels mean more stars per game (3 → 5)', () => {
    expect(ROUNDS_BY_LEVEL[1]).toBe(3);
    expect(ROUNDS_BY_LEVEL[4]).toBe(5);
    const g = (lvl: number) => buildWorkout('kid1', 20, true, new Date(2026, 9, 21), lvl).find((s) => s.kind === 'game');
    // workout: Hard and Expert add a round per game
    expect(g(0)!.kind === 'game' && g(0)!.rounds).toBe(2);
    expect(g(4)!.kind === 'game' && g(4)!.rounds).toBe(4);
  });

  it('Mix-Up: random games at mixed levels, never the same game twice in a row, ends with the rocket', () => {
    const m = buildMix('kid1', MENU_ORDER.kid1, 1234);
    const games = m.flatMap((s) => (s.kind === 'game' ? [s] : []));
    expect(games.length).toBe(8);
    for (let i = 1; i < games.length; i++) expect(games[i].gameId).not.toBe(games[i - 1].gameId);
    expect(m[m.length - 1].kind).toBe('boss');
    const levels = new Set(games.map((g) => g.level));
    expect(levels.size).toBeGreaterThan(1);
    for (const g of games) expect(g.rounds).toBeGreaterThanOrEqual(2);
    // the little one never gets the hardest level
    for (const s of buildMix('kid2', MENU_ORDER.kid2, 99)) if (s.kind === 'game') expect(s.level).toBeLessThanOrEqual(3);
  });

  it('settings: chosen level and once-a-day survive saving', () => {
    const d = sanitize({ version: 1, settings: { playLevel: { kid1: 3, kid2: 9 }, workoutOncePerDay: true }, kids: {} });
    expect(d.settings.playLevel).toEqual({ kid1: 3, kid2: 0 });
    expect(d.settings.workoutOncePerDay).toBe(true);
    expect(sanitize({}).settings.workoutOncePerDay).toBe(false);
  });

  it('every game is on the skills map', () => {
    for (const g of GAMES) expect(GAME_SKILLS[g.id], g.id).toBeTruthy();
  });
});
