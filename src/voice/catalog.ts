// Every line the app can say, in both languages, for recording ahead of time.
// Static lines are found by scanning the source for p('…', '…'); lines with blanks
// are built here from the same data tables and the same templates the games use.

import { COLORS, type Lang, NUMBER_WORDS, type Phrase, num } from '../engine/i18n';
import { L } from '../engine/lines';
import { ANIMALS } from '../engine/words';
import { GAMES, BOSS } from '../games/registry';
import { HOMES } from '../games/homes/AnimalHomes';
import { FIND_POOL, findableEver } from '../games/sounds/WhoSays';
import { CATALOG, THING_BY_ID } from '../content/catalog';
import { FRIENDS, NEED_ORDER, FEELINGS } from '../games/kindness/HelpAFriend';
import { NEEDS } from '../components/needs';
import { EATERS } from '../games/feed/FeedTheBear';
import { THEMES, THING } from '../games/balloons/PopBalloons';
import { BOSS_NEEDS, FUEL_COLORS, DOOR_SHAPES, fuelEs } from '../games/boss/RocketRescue';
import { LETTER_STROKES, letterLines } from '../games/trace/letters';
import { SHAPES } from '../games/shapes/shapes';

export function dynamicPhrases(): Phrase[] {
  const out: Phrase[] = [];
  const add = (...ph: Phrase[]) => out.push(...ph);

  // praise etc. without a name (named versions fall back to these)
  for (let i = 0; i < 3; i++) add(L.praise('', i));
  add(L.hi(''), L.alreadyWorkout(''), L.allDone(''), L.workoutHi(''), L.workoutBye(''));
  for (const g of [...GAMES, BOSS]) add(L.next(g.title), L.gameDone(g.title), g.title, g.skill);

  // letters
  for (const l of Object.keys(LETTER_STROKES)) add(letterLines.trace(l), letterLines.name(l), letterLines.sayIt(l), letterLines.isFor(l));

  for (let n = 1; n <= 10; n++) add(L.traceNumber(n), num(n));
  add(...NUMBER_WORDS);

  // animals
  for (const a of Object.values(ANIMALS)) add(a.name);
  for (const x of CATALOG) add(x.name);
  for (const { id } of FIND_POOL) {
    const a = THING_BY_ID[id];
    add(L.whereIs(a), L.thatsThe(a), L.theAnimal(a));
  }
  // vehicles, helpers, things, food (including ones waiting for a picture)
  for (const a of findableEver()) add(L.whereIs(a), L.thatsThe(a), L.theAnimal(a));
  for (const h of HOMES)
    for (const id of h.animals) {
      const a = ANIMALS[id];
      add(L.whereLive(a), L.livesIn(a, h.where));
    }

  // help a friend
  for (const fid of FRIENDS) {
    const a = ANIMALS[fid];
    add(L.doesNeed(a));
    for (const nid of NEED_ORDER) add(L.friendFeels(a, NEEDS[nid].feel));
  }
  for (const n of Object.values(NEEDS)) add(L.helperYes(n.helper.name));
  for (const id of BOSS_NEEDS) add(L.alienFeels(NEEDS[id].feel));
  for (const f of FEELINGS) add(L.whoFeels(f.name), L.thatFeels(f.name), L.yesFeels(f.name));

  // feeding
  for (const e of EATERS) {
    for (let t = 1; t <= 5; t++) add(L.give(e.en, e.esAl, t, { en: e.foodEn, es: e.foodEs, feminine: e.feminine }));
    add(L.whichMore(e.foodEn[1], e.foodEs[1]));
  }
  for (let n = 1; n <= 7; n++) add(L.yesMore(n));

  // pop & tap
  for (const th of THEMES)
    for (let n = 2; n <= 5; n++)
      for (const c of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
        const t = THING[th];
        add(L.pop(t.verbEn, t.verbEs, n, c, t.en[1], t.es[1]));
      }
  for (const c of Object.keys(COLORS) as (keyof typeof COLORS)[]) add(L.findColor(c), COLORS[c].name);

  // rocket rescue
  for (const c of FUEL_COLORS) add(L.fuelFirst(c, fuelEs(c)), L.fuelThatOne(c, fuelEs(c)), L.fuelFind(c, fuelEs(c)), L.fuelGlug(c, fuelEs(c)));
  for (let n = 2; n <= 5; n++) add(L.starPower(n));
  for (const s of DOOR_SHAPES) add(L.shapeNoFit(SHAPES[s].name), L.shapeFits(SHAPES[s].name));
  for (const s of Object.values(SHAPES)) add(s.name);
  for (const from of [3, 5]) add(L.countdown(Array.from({ length: from }, (_, i) => from - i)));
  for (let n = 1; n <= 5; n++) for (let w = 1; w <= 5; w++) if (n !== w) add(L.weNeed(n, w));

  return out;
}

/**
 * Lines heard less often (record these last when credits run short):
 * Find It's vehicles/people/things/food, letters after the vowels, and names of non-animal things.
 */
export function laterPhrases(): Phrase[] {
  const out: Phrase[] = [];
  for (const a of findableEver()) out.push(L.whereIs(a), L.thatsThe(a), L.theAnimal(a), a.name);
  for (const x of CATALOG) if (x.group !== 'animals') out.push(x.name);
  for (const l of Object.keys(LETTER_STROKES)) if (!'AEIOU'.includes(l)) out.push(letterLines.trace(l), letterLines.name(l), letterLines.sayIt(l), letterLines.isFor(l));
  return out;
}

/** Static p('en', 'es') and { en: '…', es: '…' } pairs found in source text. */
export function staticPhrasesFromSource(src: string): Phrase[] {
  const out: Phrase[] = [];
  const str = `(['"])((?:\\\\.|(?!\\1).)*?)\\1`;
  const unq = (s: string) => s.replace(/\\(['"\\])/g, '$1');
  const reP = new RegExp(`\\bp\\(\\s*${str}\\s*,\\s*${str.replace('\\1', '\\3').replace('\\1', '\\3')}\\s*\\)`, 'g');
  for (const m of src.matchAll(reP)) out.push({ en: unq(m[2]), es: unq(m[4]) });
  const reO = new RegExp(`\\ben:\\s*${str}\\s*,\\s*es:\\s*${str.replace('\\1', '\\3').replace('\\1', '\\3')}`, 'g');
  for (const m of src.matchAll(reO)) out.push({ en: unq(m[2]), es: unq(m[4]) });
  return out;
}

export interface CatalogLine {
  lang: Lang;
  text: string;
}

/** Unique lines per language. */
export function flatten(phrases: Phrase[]): CatalogLine[] {
  const seen = new Set<string>();
  const out: CatalogLine[] = [];
  for (const ph of phrases)
    for (const lang of ['en', 'es'] as Lang[]) {
      const text = ph[lang].replace(/\s+/g, ' ').trim();
      if (!text || text.includes('${')) continue;
      const k = lang + '|' + text;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ lang, text });
    }
  return out;
}
