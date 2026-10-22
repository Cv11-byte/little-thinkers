// Everything is saved on this device only. No accounts, no network.

import { type LangMode } from './i18n';
import { type LevelState, type RoundKind, clampLevel } from './adaptive';

export type KidId = 'kid1' | 'kid2';

export interface GameStats {
  level: number;
  recent: RoundKind[];
  rounds: number;
  independent: number;
  hints: number;
  mistakes: number;
  lastPlayed: number | null;
  /** small per-game memory, e.g. which number to trace next */
  mem: Record<string, number>;
}

export interface KidData {
  games: Record<string, GameStats>;
  stickers: string[];
  /** local dates (YYYY-MM-DD) when the Brain Workout was finished */
  workouts: string[];
}

export interface Settings {
  lang: LangMode;
  voice: boolean;
  sounds: boolean;
  /** minutes; 0 = no limit */
  playLimit: number;
  /** Brain Workout length in minutes, per kid */
  workout: Record<KidId, number>;
  /** "stand up and move" breaks inside the Brain Workout */
  moveBreaks: boolean;
  /** level for every game in the menu, per kid: 0 = automatic (each game adapts), 1–4 = fixed */
  playLevel: Record<KidId, number>;
  /** only allow one Brain Workout per day (off = play it anytime) */
  workoutOncePerDay: boolean;
  /** Brain Workout difficulty per kid: 0 = automatic (each game's own level), 1–4 = fixed for every game */
  workoutLevel: Record<KidId, number>;
  /** the children's names, typed in the grown-up corner (kept only on this device) */
  names: Record<KidId, string>;
}

export const WORKOUT_LENGTHS = [10, 20, 30];

/** stars (rounds) per game at each level: harder levels are longer */
export const ROUNDS_BY_LEVEL: Record<number, number> = { 1: 3, 2: 3, 3: 4, 4: 5 };

export interface AppData {
  version: 1;
  settings: Settings;
  kids: Record<KidId, KidData>;
}

export const STORAGE_KEY = 'little-thinkers:v1';

export const DEFAULT_START_LEVEL: Record<KidId, number> = { kid1: 2, kid2: 1 };

export function defaultSettings(): Settings {
  return { lang: 'both', voice: true, sounds: true, playLimit: 0, workout: { kid1: 20, kid2: 10 }, moveBreaks: true, workoutLevel: { kid1: 0, kid2: 0 }, playLevel: { kid1: 0, kid2: 0 }, workoutOncePerDay: false, names: { kid1: '', kid2: '' } };
}

export function defaultData(): AppData {
  return {
    version: 1,
    settings: defaultSettings(),
    kids: { kid1: emptyKid(), kid2: emptyKid() },
  };
}

export function emptyKid(): KidData {
  return { games: {}, stickers: [], workouts: [] };
}

export function newStats(kid: KidId): GameStats {
  return {
    level: DEFAULT_START_LEVEL[kid],
    recent: [],
    rounds: 0,
    independent: 0,
    hints: 0,
    mistakes: 0,
    lastPlayed: null,
    mem: {},
  };
}

export function getStats(data: AppData, kid: KidId, gameId: string): GameStats {
  return data.kids[kid].games[gameId] ?? newStats(kid);
}

export function levelState(s: GameStats): LevelState {
  return { level: s.level, recent: s.recent };
}

// ---------- validation: never trust what's in storage ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonNeg = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const KINDS: RoundKind[] = ['independent', 'assisted', 'mixed'];

function cleanStats(v: unknown, kid: KidId): GameStats {
  if (!isObj(v)) return newStats(kid);
  return {
    level: typeof v.level === 'number' ? clampLevel(v.level) : DEFAULT_START_LEVEL[kid],
    recent: Array.isArray(v.recent) ? (v.recent.filter((k) => KINDS.includes(k as RoundKind)) as RoundKind[]).slice(-3) : [],
    rounds: nonNeg(v.rounds),
    independent: nonNeg(v.independent),
    hints: nonNeg(v.hints),
    mistakes: nonNeg(v.mistakes),
    lastPlayed: typeof v.lastPlayed === 'number' && Number.isFinite(v.lastPlayed) ? v.lastPlayed : null,
    mem: isObj(v.mem)
      ? Object.fromEntries(Object.entries(v.mem).filter(([k, n]) => /^[a-z0-9-]{1,20}$/.test(k) && typeof n === 'number' && Number.isFinite(n)) as [string, number][])
      : {},
  };
}

function cleanKid(v: unknown, kid: KidId): KidData {
  const out: KidData = emptyKid();
  if (!isObj(v)) return out;
  if (isObj(v.games)) {
    for (const [id, st] of Object.entries(v.games)) {
      if (/^[a-z0-9-]{1,40}$/.test(id)) out.games[id] = cleanStats(st, kid);
    }
  }
  if (Array.isArray(v.workouts)) out.workouts = v.workouts.filter((s): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)).slice(-400);
  if (Array.isArray(v.stickers)) out.stickers = v.stickers.filter((s): s is string => typeof s === 'string' && s.length < 20).slice(0, 500);
  return out;
}

export function sanitize(raw: unknown): AppData {
  const d = defaultData();
  if (!isObj(raw) || raw.version !== 1) return d;
  if (isObj(raw.settings)) {
    const s = raw.settings;
    if (s.lang === 'en' || s.lang === 'es' || s.lang === 'both') d.settings.lang = s.lang;
    if (typeof s.voice === 'boolean') d.settings.voice = s.voice;
    if (typeof s.sounds === 'boolean') d.settings.sounds = s.sounds;
    if (typeof s.playLimit === 'number' && [0, 10, 15, 20, 30].includes(s.playLimit)) d.settings.playLimit = s.playLimit;
    if (typeof s.moveBreaks === 'boolean') d.settings.moveBreaks = s.moveBreaks;
    if (isObj(s.names)) {
      for (const k of ['kid1', 'kid2'] as KidId[]) {
        const n = s.names[k];
        if (typeof n === 'string') d.settings.names[k] = cleanName(n);
      }
    }
    if (typeof s.workoutOncePerDay === 'boolean') d.settings.workoutOncePerDay = s.workoutOncePerDay;
    if (isObj(s.playLevel)) {
      for (const k of ['kid1', 'kid2'] as KidId[]) {
        const m = s.playLevel[k];
        if (typeof m === 'number' && [0, 1, 2, 3, 4].includes(m)) d.settings.playLevel[k] = m;
      }
    }
    if (isObj(s.workoutLevel)) {
      for (const k of ['kid1', 'kid2'] as KidId[]) {
        const m = s.workoutLevel[k];
        if (typeof m === 'number' && [0, 1, 2, 3, 4].includes(m)) d.settings.workoutLevel[k] = m;
      }
    }
    if (isObj(s.workout)) {
      for (const k of ['kid1', 'kid2'] as KidId[]) {
        const m = s.workout[k];
        if (typeof m === 'number' && WORKOUT_LENGTHS.includes(m)) d.settings.workout[k] = m;
      }
    }
  }
  if (isObj(raw.kids)) {
    d.kids.kid1 = cleanKid(raw.kids.kid1, 'kid1');
    d.kids.kid2 = cleanKid(raw.kids.kid2, 'kid2');
  }
  return d;
}

// ---------- repository (swap localStorage for something else later) ----------

export interface ProgressRepository {
  load(): AppData;
  save(data: AppData): void;
  reset(): AppData;
}

export class LocalStorageRepository implements ProgressRepository {
  constructor(private key = STORAGE_KEY) {}

  private store(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  load(): AppData {
    try {
      const raw = this.store()?.getItem(this.key);
      if (!raw) return defaultData();
      return sanitize(JSON.parse(raw));
    } catch {
      return defaultData();
    }
  }

  save(data: AppData) {
    try {
      // write to a temp key first so an interrupted write can't corrupt saved progress
      const s = this.store();
      if (!s) return;
      const json = JSON.stringify(data);
      s.setItem(this.key + ':tmp', json);
      s.setItem(this.key, json);
      s.removeItem(this.key + ':tmp');
    } catch {
      /* storage full or blocked: keep playing without saving */
    }
  }

  reset(): AppData {
    const d = defaultData();
    try {
      const s = this.store();
      const keep = this.load().settings;
      d.settings = keep;
      s?.setItem(this.key, JSON.stringify(d));
    } catch {
      /* ignore */
    }
    return d;
  }
}

export class MemoryRepository implements ProgressRepository {
  private data: AppData = defaultData();
  load() {
    return sanitize(JSON.parse(JSON.stringify(this.data)));
  }
  save(d: AppData) {
    this.data = JSON.parse(JSON.stringify(d));
  }
  reset() {
    const keep = this.data.settings;
    this.data = defaultData();
    this.data.settings = keep;
    return this.load();
  }
}

/** Today's date in the iPad's own time zone, e.g. 2026-10-17 */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function workoutDoneToday(data: AppData, kid: KidId, now = new Date()): boolean {
  return data.kids[kid].workouts.includes(todayKey(now));
}

export function cleanName(n: string): string {
  return n.replace(/[<>{}\[\]\\/"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
}
