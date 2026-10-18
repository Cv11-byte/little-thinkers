import { describe, expect, it } from 'vitest';
import { AUTO_HINT_AFTER, MAX_LEVEL, MIN_LEVEL, applyRound, clampLevel, classify } from '../src/engine/adaptive';

const solo = { mistakes: 0, hints: 0 };
const oneSlip = { mistakes: 1, hints: 0 };
const helped = { mistakes: 0, hints: 1 };
const struggled = { mistakes: 3, hints: 0 };
const mixed = { mistakes: 2, hints: 0 };

describe('classify', () => {
  it('separates solo wins from assisted ones', () => {
    expect(classify(solo)).toBe('independent');
    expect(classify(oneSlip)).toBe('independent');
    expect(classify(helped)).toBe('assisted');
    expect(classify(struggled)).toBe('assisted');
    expect(classify(mixed)).toBe('mixed');
  });
});

describe('applyRound', () => {
  it('moves up after 3 solo wins in a row', () => {
    let s = { level: 2, recent: [] as ReturnType<typeof classify>[] };
    let r = applyRound(s, solo);
    expect(r.change).toBeNull();
    r = applyRound(r.state, oneSlip);
    expect(r.change).toBeNull();
    r = applyRound(r.state, solo);
    expect(r.change).toBe('up');
    expect(r.state).toEqual({ level: 3, recent: [] });
    s = r.state;
    expect(applyRound(s, solo).change).toBeNull();
  });

  it('moves down after 3 assisted rounds in a row', () => {
    let st = { level: 3, recent: [] as ReturnType<typeof classify>[] };
    for (let i = 0; i < 2; i++) st = applyRound(st, helped).state;
    const r = applyRound(st, struggled);
    expect(r.change).toBe('down');
    expect(r.state.level).toBe(2);
  });

  it('keeps the level when the evidence is mixed', () => {
    let st = { level: 2, recent: [] as ReturnType<typeof classify>[] };
    for (const res of [solo, helped, solo, mixed, solo, helped]) {
      const r = applyRound(st, res);
      expect(r.change).toBeNull();
      st = r.state;
    }
    expect(st.level).toBe(2);
  });

  it('never goes past the top or bottom level', () => {
    let top = { level: MAX_LEVEL, recent: [] as ReturnType<typeof classify>[] };
    for (let i = 0; i < 5; i++) top = applyRound(top, solo).state;
    expect(top.level).toBe(MAX_LEVEL);
    let bottom = { level: MIN_LEVEL, recent: [] as ReturnType<typeof classify>[] };
    for (let i = 0; i < 5; i++) bottom = applyRound(bottom, helped).state;
    expect(bottom.level).toBe(MIN_LEVEL);
  });

  it('is deterministic', () => {
    const a = applyRound({ level: 2, recent: ['independent', 'independent'] }, solo);
    const b = applyRound({ level: 2, recent: ['independent', 'independent'] }, solo);
    expect(a).toEqual(b);
  });

  it('offers a hint after two wrong tries', () => {
    expect(AUTO_HINT_AFTER).toBe(2);
  });

  it('clamps odd stored levels', () => {
    expect(clampLevel(9)).toBe(MAX_LEVEL);
    expect(clampLevel(-3)).toBe(MIN_LEVEL);
    expect(clampLevel(NaN)).toBe(MIN_LEVEL);
    expect(clampLevel(2.4)).toBe(2);
  });
});
