// Capital letters as finger-tracing strokes (same 400 x 500 box as the numbers),
// in the stroke order taught in preschool: top to bottom, left to right.
// Each letter has a picture word that starts with it in English and Spanish
// (the same word when possible, so one picture works for both languages).

import { type Phrase, p } from '../../engine/i18n';

export const LETTER_STROKES: Record<string, string[]> = {
  A: ['M 200 75 L 85 440', 'M 200 75 L 315 440', 'M 135 305 L 265 305'],
  B: ['M 110 75 L 110 440', 'M 110 75 L 215 75 C 320 75, 320 250, 215 250 L 110 250', 'M 110 250 L 230 250 C 340 250, 340 440, 230 440 L 110 440'],
  C: ['M 310 130 C 250 50, 95 70, 95 255 C 95 440, 250 460, 310 380'],
  D: ['M 110 75 L 110 440', 'M 110 75 L 185 75 C 345 75, 345 440, 185 440 L 110 440'],
  E: ['M 120 75 L 120 440', 'M 120 75 L 300 75', 'M 120 255 L 270 255', 'M 120 440 L 300 440'],
  F: ['M 120 75 L 120 440', 'M 120 75 L 300 75', 'M 120 255 L 270 255'],
  G: ['M 310 130 C 250 50, 95 70, 95 255 C 95 440, 270 460, 310 360 L 310 275 L 215 275'],
  H: ['M 100 75 L 100 440', 'M 300 75 L 300 440', 'M 100 255 L 300 255'],
  I: ['M 200 75 L 200 440', 'M 120 75 L 280 75', 'M 120 440 L 280 440'],
  J: ['M 270 75 L 270 330 C 270 460, 110 460, 105 360'],
  K: ['M 110 75 L 110 440', 'M 300 75 L 110 285', 'M 180 210 L 310 440'],
  L: ['M 120 75 L 120 440 L 300 440'],
  M: ['M 85 440 L 85 75 L 200 300 L 315 75 L 315 440'],
  N: ['M 100 440 L 100 75 L 300 440 L 300 75'],
  Ñ: ['M 100 440 L 100 140 L 300 440 L 300 140', 'M 115 85 C 150 40, 190 115, 225 75 C 250 50, 270 50, 290 70'],
  O: ['M 200 75 C 55 75, 55 440, 200 440 C 345 440, 345 75, 200 75'],
  P: ['M 110 75 L 110 440', 'M 110 75 L 215 75 C 330 75, 330 265, 215 265 L 110 265'],
  Q: ['M 200 75 C 55 75, 55 440, 200 440 C 345 440, 345 75, 200 75', 'M 225 340 L 325 450'],
  R: ['M 110 75 L 110 440', 'M 110 75 L 215 75 C 330 75, 330 265, 215 265 L 110 265', 'M 200 265 L 310 440'],
  S: ['M 305 120 C 260 55, 100 60, 105 160 C 110 250, 300 240, 300 340 C 300 450, 130 460, 95 385'],
  T: ['M 85 75 L 315 75', 'M 200 75 L 200 440'],
  U: ['M 100 75 L 100 330 C 100 460, 300 460, 300 330 L 300 75'],
  V: ['M 85 75 L 200 440 L 315 75'],
  W: ['M 60 75 L 130 440 L 200 180 L 270 440 L 340 75'],
  X: ['M 95 75 L 305 440', 'M 305 75 L 95 440'],
  Y: ['M 90 75 L 200 255', 'M 310 75 L 200 255 L 200 440'],
  Z: ['M 95 75 L 305 75 L 95 440 L 305 440'],
};

export const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** Spanish alphabet: Ñ comes after N */
const AZ_ES = [...AZ.slice(0, 14), 'Ñ', ...AZ.slice(14)];

/** Letters practiced at a level. Vowels first (how reading starts in Spanish, and the same 5 in English). */
export function letterSet(level: number, spanish: boolean): string[] {
  if (level <= 2) return VOWELS;
  return spanish ? AZ_ES : AZ;
}

/** Spanish letter names, so the voice says "be", "hache", "eñe"... */
export const ES_NAME: Record<string, string> = {
  A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'efe', G: 'ge', H: 'hache', I: 'i', J: 'jota', K: 'ka', L: 'ele', M: 'eme',
  N: 'ene', Ñ: 'eñe', O: 'o', P: 'pe', Q: 'cu', R: 'erre', S: 'ese', T: 'te', U: 'u', V: 'uve', W: 'doble u', X: 'equis', Y: 'ye', Z: 'zeta',
};

interface Word {
  en: string;
  es: string;
  /** picture (emoji, or '#name' for a built-in drawing) */
  pic: string;
  /** a different word in Spanish (shown as a second picture in "both" mode) */
  esPic?: string;
}

export const LETTER_WORDS: Record<string, Word> = {
  A: { en: 'airplane', es: 'avión', pic: '✈️' },
  B: { en: 'ball', es: 'balón', pic: '⚽' },
  C: { en: 'car', es: 'carro', pic: '🚗' },
  D: { en: 'dinosaur', es: 'dinosaurio', pic: '🦕' },
  E: { en: 'elephant', es: 'elefante', pic: '🐘' },
  F: { en: 'flower', es: 'flor', pic: '🌸' },
  G: { en: 'gorilla', es: 'gorila', pic: '🦍' },
  H: { en: 'helicopter', es: 'helicóptero', pic: '🚁' },
  I: { en: 'iguana', es: 'iguana', pic: '🦎' },
  J: { en: 'jaguar', es: 'jaguar', pic: '🐆' },
  K: { en: 'koala', es: 'koala', pic: '🐨' },
  L: { en: 'lion', es: 'león', pic: '🦁' },
  M: { en: 'monkey', es: 'mono', pic: '🐒' },
  N: { en: 'nest', es: 'nido', pic: '🪺' },
  Ñ: { en: 'pineapple', es: 'piña', pic: '🍍' },
  O: { en: 'ocean', es: 'océano', pic: '🌊' },
  P: { en: 'penguin', es: 'pingüino', pic: '🐧' },
  Q: { en: 'quesadilla', es: 'quesadilla', pic: '🫓' },
  R: { en: 'robot', es: 'robot', pic: '🤖' },
  S: { en: 'snake', es: 'serpiente', pic: '🐍' },
  T: { en: 'train', es: 'tren', pic: '🚂' },
  U: { en: 'unicorn', es: 'unicornio', pic: '🦄' },
  V: { en: 'volcano', es: 'volcán', pic: '🌋' },
  W: { en: 'waffle', es: 'wafle', pic: '🧇' },
  X: { en: 'xylophone', es: 'xilófono', pic: '#xylophone' },
  Y: { en: 'yo-yo', es: 'yoyo', pic: '🪀' },
  Z: { en: 'zebra', es: 'zapato', pic: '🦓', esPic: '👟' },
};

const enName = (l: string) => l;

export const letterLines = {
  trace: (l: string): Phrase => p(`Trace the letter ${enName(l)}!`, `¡Traza la letra ${ES_NAME[l]}!`),
  name: (l: string): Phrase => p(`${enName(l)}!`, `¡${ES_NAME[l]}!`),
  sayIt: (l: string): Phrase => p(`Say it with me: ${enName(l)}!`, `¡Dilo conmigo: ${ES_NAME[l]}!`),
  /** "A is for airplane!" — Ñ is only in Spanish, so its English line talks about the Spanish word */
  isFor: (l: string): Phrase => {
    const w = LETTER_WORDS[l];
    if (l === 'Ñ') return p('Ñ, like in piña. Piña means pineapple!', '¡Eñe, como en piña!');
    return p(`${enName(l)} is for ${w.en}!`, `¡${cap(ES_NAME[l])} de ${w.es}!`);
  },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
