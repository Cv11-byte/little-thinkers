import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository, MemoryRepository, STORAGE_KEY, defaultData, getStats, sanitize } from '../src/engine/storage';

describe('saved progress', () => {
  beforeEach(() => localStorage.clear());

  it('starts the older child at level 2 and the younger at level 1', () => {
    const d = defaultData();
    expect(getStats(d, 'kid1', 'rocket-maze').level).toBe(2);
    expect(getStats(d, 'kid2', 'rocket-maze').level).toBe(1);
  });

  it('round-trips through localStorage', () => {
    const repo = new LocalStorageRepository();
    const d = defaultData();
    d.settings.lang = 'es';
    d.kids.kid1.games['pop-balloons'] = { ...getStats(d, 'kid1', 'pop-balloons'), level: 3, rounds: 7 };
    d.kids.kid2.stickers = ['🦄'];
    repo.save(d);
    const back = repo.load();
    expect(back.settings.lang).toBe('es');
    expect(back.kids.kid1.games['pop-balloons'].level).toBe(3);
    expect(back.kids.kid1.games['pop-balloons'].rounds).toBe(7);
    expect(back.kids.kid2.stickers).toEqual(['🦄']);
  });

  it('recovers from broken JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    expect(new LocalStorageRepository().load()).toEqual(defaultData());
  });

  it('recovers from the wrong version or shape', () => {
    expect(sanitize({ version: 99 })).toEqual(defaultData());
    expect(sanitize(null)).toEqual(defaultData());
    expect(sanitize([1, 2])).toEqual(defaultData());
  });

  it('cleans bad values instead of crashing', () => {
    const d = sanitize({
      version: 1,
      settings: { lang: 'fr', voice: 'yes', playLimit: 999 },
      kids: {
        kid1: { games: { 'rocket-maze': { level: 42, rounds: -5, recent: ['independent', 'nonsense'] }, 'bad id!': { level: 2 } }, stickers: ['🦄', 5] },
        kid2: 'garbage',
      },
    });
    expect(d.settings.lang).toBe('both');
    expect(d.settings.voice).toBe(true);
    expect(d.settings.playLimit).toBe(0);
    expect(d.kids.kid1.games['rocket-maze'].level).toBe(4);
    expect(d.kids.kid1.games['rocket-maze'].rounds).toBe(0);
    expect(d.kids.kid1.games['rocket-maze'].recent).toEqual(['independent']);
    expect(d.kids.kid1.games['bad id!']).toBeUndefined();
    expect(d.kids.kid1.stickers).toEqual(['🦄']);
    expect(d.kids.kid2).toEqual({ games: {}, stickers: [], workouts: [] });
  });

  it('reset clears progress but keeps settings', () => {
    const repo = new MemoryRepository();
    const d = defaultData();
    d.settings.lang = 'en';
    d.kids.kid1.stickers = ['🐙'];
    repo.save(d);
    const r = repo.reset();
    expect(r.settings.lang).toBe('en');
    expect(r.kids.kid1.stickers).toEqual([]);
  });
});
