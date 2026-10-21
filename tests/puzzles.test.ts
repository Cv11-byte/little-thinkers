import { describe, expect, it } from 'vitest';
import { MAZES, findPath, isDeadEnd, moveToward, parseMaze } from '../src/games/maze/logic';
import { NUMBER_STROKES, advance, nearHead, traceSettings } from '../src/games/trace/glyphs';
import { popPlan } from '../src/games/balloons/PopBalloons';
import { HOMES, homesPlan } from '../src/games/homes/AnimalHomes';
import { feedPlan } from '../src/games/feed/FeedTheBear';
import { FIND_POOL, findPlan } from '../src/games/sounds/WhoSays';
import { patternPlan } from '../src/games/pattern/CopyMe';
import { shapePlan } from '../src/games/shapes/ShapePuzzle';
import { kindPlan } from '../src/games/kindness/HelpAFriend';
import { landingRow } from '../src/games/blocks/BlockBuilder';
import { GAMES } from '../src/games/registry';

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);

describe('Rocket Maze', () => {
  it('every maze can be solved', () => {
    for (const [level, list] of Object.entries(MAZES)) {
      for (const rows of list) {
        const m = parseMaze(rows);
        expect(rows.every((r) => r.length === rows[0].length), `ragged maze at level ${level}`).toBe(true);
        expect(findPath(m, m.start, m.goal), `unsolvable maze at level ${level}: ${rows.join('/')}`).not.toBeNull();
      }
    }
  });

  it('mazes get longer as levels go up', () => {
    const avg = (lvl: number) => {
      const lens = MAZES[lvl].map((r) => {
        const m = parseMaze(r);
        return findPath(m, m.start, m.goal)!.length;
      });
      return lens.reduce((a, b) => a + b, 0) / lens.length;
    };
    expect(avg(2)).toBeGreaterThan(avg(1));
    expect(avg(4)).toBeGreaterThan(avg(2));
  });

  it('the astronaut only moves along the road, a short hop at a time', () => {
    const m = parseMaze(['S..#', '##.#', 'R..#']);
    expect(moveToward(m, [0, 0], [0, 1], 2)).toEqual([[0, 1]]);
    // across space: not allowed even though the cells are close on screen
    expect(moveToward(m, [0, 0], [2, 0], 2)).toBeNull();
    // too far in one jump for big kids, fine in easy mode
    expect(moveToward(m, [0, 0], [2, 2], 2)).toBeNull();
    const far = moveToward(m, [0, 0], [2, 2], 99)!;
    expect(far[far.length - 1]).toEqual([2, 2]);
  });

  it('spots dead ends but not the start or the rocket', () => {
    const m = parseMaze(['S...#R', '#.#.#.', '#.#...', '#.####']);
    expect(isDeadEnd(m, [3, 1])).toBe(true);
    expect(isDeadEnd(m, m.start)).toBe(false);
    expect(isDeadEnd(m, m.goal)).toBe(false);
  });
});

describe('Trace Numbers', () => {
  it('has strokes for 1 to 9', () => {
    for (let n = 1; n <= 10; n++) expect(NUMBER_STROKES[n].length).toBeGreaterThan(0);
  });

  it('progress only moves forward when the finger is on the path', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i * 8, y: 0 }));
    expect(advance(line, 0, { x: 300, y: 300 }, 60)).toBe(0);
    expect(advance(line, 0, { x: 24, y: 5 }, 30)).toBeGreaterThan(0);
    // a finger 80 units ahead can't pull the star forward in one jump
    expect(advance(line, 0, { x: 80, y: 0 }, 20)).toBe(0);
    // cannot skip far ahead along the path in one move
    expect(advance(line, 0, { x: 390, y: 0 }, 30)).toBe(0);
  });

  it('tracing only starts when the finger touches the star', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i * 8, y: 0 }));
    expect(nearHead(line, 0, { x: 10, y: 10 }, 60)).toBe(true);
    expect(nearHead(line, 0, { x: 300, y: 0 }, 60)).toBe(false);
  });

  it('is easier for little ones', () => {
    expect(traceSettings(1).tolerance).toBeGreaterThan(traceSettings(4).tolerance);
    // no early auto-finish: the line has to be traced (almost) to the end
    for (const l of [2, 3, 4]) expect(traceSettings(l).finishAt).toBeGreaterThanOrEqual(0.97);
    // a single move can only advance a short way, so the child must follow the line
    for (const l of [1, 2, 3, 4]) expect(traceSettings(l).lookAhead * 8).toBeLessThanOrEqual(48);
    expect(traceSettings(2).numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(traceSettings(1).numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('puzzle plans are valid at every level', () => {
  it('pop: says N and there are exactly N of that color', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4])
        for (const round of [0, 1, 2]) {
          const p = popPlan(lvl, seed, round);
          expect(p.colors.filter((c) => c === p.target).length).toBe(p.nTarget);
          expect(p.nTarget).toBe(lvl + 1);
          expect(p.colors.length).toBeGreaterThanOrEqual(6);
        }
  });

  it('pop: a new color and theme each round', () => {
    for (const seed of SEEDS) {
      const a = popPlan(2, seed, 0);
      const b = popPlan(2, seed, 1);
      const c = popPlan(2, seed, 2);
      expect(new Set([a.target, b.target, c.target]).size).toBe(3);
      expect(new Set([a.theme, b.theme, c.theme]).size).toBe(3);
    }
  });

  it('animal homes: every animal has its home on screen, no repeats, no ambiguous animals', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4])
        for (const round of [0, 1, 2]) {
          const p = homesPlan(lvl, seed, round);
          const ids = p.animals.map((a) => a.animal.id);
          expect(new Set(ids).size).toBe(ids.length);
          for (const a of p.animals) {
            expect(p.homes.some((h) => h.id === a.home)).toBe(true);
            expect(HOMES.find((h) => h.id === a.home)!.animals).toContain(a.animal.id);
          }
        }
    const all = HOMES.flatMap((h) => h.animals);
    expect(new Set(all).size).toBe(all.length); // no animal belongs to two homes
    expect(all).not.toContain('polarbear');
    expect(all).not.toContain('seal');
  });

  it('feed: target is never more than the food available; compare plates differ', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4])
        for (const round of [0, 1, 2]) {
          const p = feedPlan(lvl, seed, round);
          if (p.mode === 'feed') {
            expect(p.target).toBeGreaterThan(0);
            expect(p.target).toBeLessThanOrEqual(p.available);
          } else {
            expect(lvl).toBe(4);
            expect(Math.abs(p.left - p.right)).toBeGreaterThanOrEqual(2);
          }
        }
    expect(feedPlan(1, 5, 0).target).toBe(1);
  });

  it('find the animal: different animal every round, answer always offered', () => {
    for (const seed of SEEDS) {
      const asked = new Set<string>();
      for (let round = 0; round < 6; round++) {
        const p = findPlan(3, seed, round);
        expect(p.choices.map((c) => c.id)).toContain(p.answer.id);
        expect(new Set(p.choices.map((c) => c.id)).size).toBe(p.choices.length);
        asked.add(p.answer.id);
      }
      expect(asked.size).toBe(6);
    }
    for (const lvl of [1, 2, 3, 4]) expect(findPlan(lvl, 1, 0).choices.length).toBe([2, 3, 4, 6][lvl - 1]);
    expect(FIND_POOL.length).toBeGreaterThanOrEqual(20);
  });

  it('copy me: sequence length grows with level and never repeats a pad back to back', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4]) {
        const p = patternPlan(lvl, seed);
        expect(p.seq.length).toBe(lvl);
        for (let i = 1; i < p.seq.length; i++) expect(p.seq[i]).not.toBe(p.seq[i - 1]);
        expect(Math.max(...p.seq)).toBeLessThan(p.pads);
      }
  });

  it('shapes & shadows: right count, mixes board and shadow rounds', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4]) {
        const kinds = new Set<string>();
        for (const round of [0, 1, 2, 3]) {
          const p = shapePlan(lvl, seed, round);
          kinds.add(p.kind);
          const n = p.kind === 'board' ? p.shapes.length : p.items.length;
          expect(n).toBe([2, 3, 4, 6][lvl - 1]);
          if (p.kind === 'board') expect(new Set(p.shapes).size).toBe(p.shapes.length);
          else expect(new Set(p.items.map((i) => i.ch)).size).toBe(p.items.length);
        }
        expect(kinds.size).toBe(2);
      }
  });

  it('help a friend: exactly one helpful choice, the rest are toys', () => {
    for (const seed of SEEDS)
      for (const lvl of [1, 2, 3, 4])
        for (const round of [0, 1]) {
          const p = kindPlan(lvl, seed, round);
          if (p.mode === 'help') {
            expect(p.choices.filter((c) => c.right)).toHaveLength(1);
            expect(p.choices.find((c) => c.right)!.emoji).toBe(p.need.helper.emoji);
          } else expect(p.faces.map((f) => f.face)).toContain(p.answer.face);
        }
  });

  it('blocks stack with gravity', () => {
    const placed = [
      { t: { w: 1 }, col: 2, row: 0 },
      { t: { w: 2 }, col: 2, row: 1 },
    ];
    expect(landingRow([], 0, 1)).toBe(0);
    expect(landingRow(placed, 2, 1)).toBe(2);
    expect(landingRow(placed, 3, 1)).toBe(2);
    expect(landingRow(placed, 4, 1)).toBe(0);
    expect(landingRow(placed, 1, 2)).toBe(2);
  });
});

describe('registry', () => {
  it('has 11 games covering each learning goal', () => {
    expect(GAMES).toHaveLength(11);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(11);
    for (const g of GAMES) {
      expect(g.title.en && g.title.es).toBeTruthy();
      expect(g.rounds(1)).toBeGreaterThan(0);
    }
  });
});
