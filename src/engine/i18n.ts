// All words the kids hear or see live here, in both languages.
// Games never hard-code text: they build a Phrase and hand it to speech.

export type Lang = 'en' | 'es';
export type LangMode = 'en' | 'es' | 'both';

export interface Phrase {
  en: string;
  es: string;
  /** used for the recorded voice when there is no recording of this exact line (e.g. lines with a name) */
  alt?: Phrase;
}

export const p = (en: string, es: string): Phrase => ({ en, es });

/** Text to show on screen for the current mode. */
export function label(ph: Phrase, mode: LangMode): string {
  if (mode === 'en') return ph.en;
  if (mode === 'es') return ph.es;
  return `${ph.es} · ${ph.en}`;
}

/** Order in which phrases are spoken. "Both" says Spanish first, then English. */
export function spokenLangs(mode: LangMode): Lang[] {
  if (mode === 'both') return ['es', 'en'];
  return [mode];
}

// ---------- shared vocabulary ----------

export type ColorId = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'pink';

export const COLORS: Record<ColorId, { hex: string; dark: string; name: Phrase; plural: Phrase }> = {
  red: { hex: '#E8524A', dark: '#B83A33', name: p('red', 'rojo'), plural: p('red', 'rojos') },
  blue: { hex: '#3D8BE8', dark: '#2A66B0', name: p('blue', 'azul'), plural: p('blue', 'azules') },
  yellow: { hex: '#F7C431', dark: '#C99A12', name: p('yellow', 'amarillo'), plural: p('yellow', 'amarillos') },
  green: { hex: '#4CB86A', dark: '#33884C', name: p('green', 'verde'), plural: p('green', 'verdes') },
  purple: { hex: '#9B6BD6', dark: '#7249A8', name: p('purple', 'morado'), plural: p('purple', 'morados') },
  orange: { hex: '#F58A3A', dark: '#C46520', name: p('orange', 'anaranjado'), plural: p('orange', 'anaranjados') },
  pink: { hex: '#F27BB0', dark: '#C9578A', name: p('pink', 'rosa'), plural: p('pink', 'rosas') },
};

export const NUMBER_WORDS: Phrase[] = [
  p('zero', 'cero'),
  p('one', 'uno'),
  p('two', 'dos'),
  p('three', 'tres'),
  p('four', 'cuatro'),
  p('five', 'cinco'),
  p('six', 'seis'),
  p('seven', 'siete'),
  p('eight', 'ocho'),
  p('nine', 'nueve'),
  p('ten', 'diez'),
];

export const num = (n: number): Phrase => NUMBER_WORDS[n] ?? p(String(n), String(n));

export const PRAISE: Phrase[] = [
  p('Great job!', '¡Muy bien!'),
  p('You did it!', '¡Lo lograste!'),
  p('Awesome!', '¡Excelente!'),
  p('Well done!', '¡Bravo!'),
  p('Amazing!', '¡Increíble!'),
];

export const TRY_AGAIN: Phrase[] = [
  p('Try again!', '¡Otra vez!'),
  p('Hmm, not that one.', 'Mmm, ese no.'),
  p('Almost! Try again.', '¡Casi! Intenta otra vez.'),
];

export const UI = {
  appName: p('Little Thinkers', 'Pequeños Pensadores'),
  whoIsPlaying: p('Who is playing?', '¿Quién va a jugar?'),
  allDone: p('All done! Great playing!', '¡Ya terminamos! ¡Qué bien jugaste!'),
  playAgain: p('Play again', 'Otra vez'),
  otherGame: p('Other games', 'Otros juegos'),
  newSticker: p('You got a new sticker!', '¡Ganaste una calcomanía!'),
  stickers: p('My stickers', 'Mis calcomanías'),
  breakTime: p('Time for a break!', '¡Hora de descansar!'),
  pickGame: p('What do you want to play?', '¿Qué quieres jugar?'),
};

let praiseIdx = 0;
export function nextPraise(): Phrase {
  praiseIdx = (praiseIdx + 1) % PRAISE.length;
  return PRAISE[praiseIdx];
}
let tryIdx = 0;
export function nextTryAgain(): Phrase {
  tryIdx = (tryIdx + 1) % TRY_AGAIN.length;
  return TRY_AGAIN[tryIdx];
}
