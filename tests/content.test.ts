import { describe, expect, it } from 'vitest';
import { CATALOG, GROUPS, ID_BY_GLYPH, needsPicture } from '../src/content/catalog';
import { DRAWN } from '../src/components/drawn';
import { ANIMALS } from '../src/engine/words';
import { SHADOW_SETS } from '../src/games/shapes/ShapePuzzle';
import { NEEDS, TOYS } from '../src/components/needs';
import { EATERS } from '../src/games/feed/FeedTheBear';
import { LETTER_STROKES, LETTER_WORDS, letterLines, letterSet, VOWELS } from '../src/games/trace/letters';
import { findPlan, findGroup, findables } from '../src/games/sounds/WhoSays';
import { kindPlan, NEED_ORDER } from '../src/games/kindness/HelpAFriend';
import { patternPlan } from '../src/games/pattern/CopyMe';
import { buildWorkout, traceGameFor } from '../src/workout/plan';

describe('content catalog', () => {
  it('has about 50 animals and every group filled', () => {
    const by = (g: string) => CATALOG.filter((x) => x.group === g).length;
    expect(by('animals')).toBeGreaterThanOrEqual(50);
    for (const g of GROUPS) expect(by(g.id)).toBeGreaterThanOrEqual(20);
  });

  it('ids are unique, safe file names, with both languages', () => {
    const ids = CATALOG.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of CATALOG) {
      expect(x.id).toMatch(/^[a-z]+$/);
      expect(x.name.en && x.name.es).toBeTruthy();
    }
  });

  it('no emoji is used for two different things (a picture must replace the right one)', () => {
    const seen = new Map<string, string>();
    for (const x of CATALOG)
      for (const e of [x.emoji, ...(x.also ?? [])]) {
        expect(seen.get(e), `${e} used by ${seen.get(e)} and ${x.id}`).toBeUndefined();
        seen.set(e, x.id);
      }
  });

  it('every picture the games show can be replaced by art', () => {
    const used = [
      ...Object.values(ANIMALS).map((a) => a.emoji),
      ...SHADOW_SETS.flatMap((s) => s.items.map((i) => i.ch)),
      ...Object.values(NEEDS).map((n) => n.helper.emoji),
      ...TOYS.map((t) => t.emoji),
      ...EATERS.flatMap((e) => [e.emoji, e.food]),
    ];
    for (const e of used) expect(ID_BY_GLYPH[e], `no catalog entry for ${e}`).toBeTruthy();
  });

  it('things without an emoji have a drawing, or wait for a picture', () => {
    for (const x of CATALOG.filter(needsPicture)) expect(x.emoji).toBe('#' + x.id);
    expect(DRAWN['#water']).toBeTruthy();
  });
});

describe('Find It', () => {
  it('little one: animals only; older child also gets vehicles, people, things, food', () => {
    for (let r = 0; r < 6; r++) expect(findGroup(1, 7, r)).toBe('animals');
    const groups = new Set(Array.from({ length: 10 }, (_, r) => findGroup(2, 7, r)));
    expect(groups.size).toBeGreaterThanOrEqual(4);
  });

  it('choices are all from the asked group, include the answer, no repeats', () => {
    for (let r = 0; r < 8; r++) {
      const pl = findPlan(4, 31, r);
      expect(pl.choices.map((c) => c.id)).toContain(pl.answer.id);
      expect(new Set(pl.choices.map((c) => c.id)).size).toBe(pl.choices.length);
      for (const c of pl.choices) expect(c.group).toBe(pl.group);
    }
  });

  it('never shows something that still needs a picture', () => {
    for (const g of ['vehicles', 'characters', 'items', 'food'] as const) for (const x of findables(g)) expect(!needsPicture(x) || x.emoji in DRAWN).toBe(true);
  });
});

describe('letters', () => {
  it('every letter A–Z and Ñ has strokes, a word and voice lines', () => {
    const all = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ñ'];
    for (const l of all) {
      expect(LETTER_STROKES[l]?.length, l).toBeGreaterThan(0);
      expect(LETTER_WORDS[l], l).toBeTruthy();
      for (const ph of [letterLines.trace(l), letterLines.isFor(l)]) expect(ph.en && ph.es).toBeTruthy();
    }
  });

  it('vowels first, then the whole alphabet (Ñ only in Spanish)', () => {
    expect(letterSet(1, true)).toEqual(VOWELS);
    expect(letterSet(2, false)).toEqual(VOWELS);
    expect(letterSet(3, false)).toHaveLength(26);
    expect(letterSet(3, true)).toHaveLength(27);
    expect(letterSet(4, true)[14]).toBe('Ñ');
  });

  it('picture words start with their letter in both languages (Ñ and Z are special)', () => {
    for (const [l, w] of Object.entries(LETTER_WORDS)) {
      if (l === 'Ñ') continue;
      expect(w.en[0].toUpperCase(), l).toBe(l);
      expect(w.es[0].toUpperCase(), l).toBe(l);
    }
  });
});

describe('help a friend', () => {
  it('has new needs: play → ball, thirsty → a glass of water', () => {
    expect(NEEDS.play.helper.emoji).toBe('⚽');
    expect(NEEDS.thirsty.helper.emoji).toBe('#water');
    expect(NEED_ORDER.length).toBeGreaterThanOrEqual(10);
  });

  it('wrong choices never include the right answer', () => {
    for (let seed = 0; seed < 30; seed++)
      for (let r = 0; r < 10; r++) {
        const pl = kindPlan(2, seed, r);
        if (pl.mode !== 'help') continue;
        expect(pl.choices.filter((c) => c.emoji === pl.need.helper.emoji)).toHaveLength(1);
      }
  });
});

describe('copy me', () => {
  it('a new pattern every round', () => {
    for (const lvl of [2, 3, 4]) {
      const seqs = Array.from({ length: 3 }, (_, r) => patternPlan(lvl, 1000 + r * 101, r, 3).seq.join(','));
      expect(new Set(seqs).size).toBe(3);
    }
  });
});

describe('workout tracing', () => {
  it('alternates numbers and letters by day', () => {
    const d1 = new Date(2026, 9, 21);
    const d2 = new Date(2026, 9, 22);
    expect(traceGameFor(d1)).not.toBe(traceGameFor(d2));
    const ids = (d: Date) => buildWorkout('kid1', 20, true, d).flatMap((s) => (s.kind === 'game' ? [s.gameId] : []));
    expect(ids(d1).filter((g) => g.startsWith('trace'))).toHaveLength(1);
    expect(new Set([...ids(d1), ...ids(d2)])).toContain('trace-letters');
  });
});
