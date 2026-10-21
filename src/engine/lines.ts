// Every spoken sentence that has a blank in it lives here, so the voice script
// (scripts/phrases.ts) can list every possible line and record it ahead of time.
// Lines with the child's name carry an `alt` without the name: if a recording of
// the named line doesn't exist, the recording of the plain line is used instead.

import { type ColorId, COLORS, type Phrase, num, p } from './i18n';
import { type Animal, cap } from './words';

/** anything with a name and a Spanish article (animals, vehicles, things...) */
interface Named {
  name: Phrase;
  es: string;
  plural?: boolean;
}

const withName = (name: string, build: (comma: string, space: string) => Phrase): Phrase => {
  const line = build(name ? `, ${name}` : '', name ? ` ${name}` : '');
  return name ? { ...line, alt: build('', '') } : line;
};

export const L = {
  // ---- app & praise ----
  hi: (name: string) => withName(name, (_c, s) => p(`Hi${s}! What do you want to play?`, `¡Hola${s}! ¿Qué quieres jugar?`)),
  alreadyWorkout: (name: string) =>
    withName(name, (c) => p(`You already did your brain workout today${c}!`, `¡Ya hiciste tu ejercicio mental hoy${c}!`)),
  praise: (name: string, i: number) =>
    withName(name, (c) => [p(`Great job${c}!`, `¡Muy bien${c}!`), p(`You did it${c}!`, `¡Lo hiciste${c}!`), p(`Wow${c}!`, `¡Guau${c}!`)][i % 3]),
  allDone: (name: string) => withName(name, (c) => p(`All done${c}! Great playing!`, `¡Terminamos${c}! ¡Qué bien jugaste!`)),
  workoutHi: (name: string) =>
    withName(name, (_c, s) => p(`Hi${s}! It's time for your brain workout!`, `¡Hola${s}! ¡Es hora de tu ejercicio mental!`)),
  workoutBye: (name: string) =>
    withName(name, (c) => p(`Great job today${c}! Your brain did a big workout.`, `¡Muy buen trabajo hoy${c}! Tu cerebro hizo mucho ejercicio.`)),
  gameDone: (title: Phrase) => p(`${title.en}: all done!`, `¡${title.es}: terminado!`),
  next: (title: Phrase) => p(`Next: ${title.en}!`, `Ahora: ¡${title.es}!`),

  // ---- trace ----
  traceNumber: (n: number) => p(`Trace the number ${n}!`, `¡Traza el número ${num(n).es}!`),

  // ---- animals ----
  whereIs: (a: Named) =>
    a.plural ? p(`Where are the ${a.name.en}?`, `¿Dónde están ${a.es}?`) : p(`Where is the ${a.name.en}?`, `¿Dónde está ${a.es}?`),
  thatsThe: (a: Named) =>
    a.plural
      ? p(`Those are the ${a.name.en}.`, `${a.es.startsWith('las ') ? 'Esas' : 'Esos'} son ${a.es}.`)
      : p(`That's the ${a.name.en}.`, `${a.es.startsWith('la ') ? 'Esa' : 'Ese'} es ${a.es}.`),
  theAnimal: (a: Named) => p(`The ${a.name.en}!`, `¡${cap(a.es)}!`),
  whereLive: (a: Animal) => p(`Where does the ${a.name.en} live?`, `¿Dónde vive ${a.es}?`),
  livesIn: (a: Animal, where: Phrase) => p(`The ${a.name.en} lives ${where.en}!`, `¡${cap(a.es)} vive ${where.es}!`),

  // ---- help a friend ----
  friendFeels: (a: Animal, feel: Phrase) => p(`The ${a.name.en} ${feel.en}`, `${cap(a.es)} ${feel.es}`),
  doesNeed: (a: Animal) => p(`Hmm, does the ${a.name.en} need that?`, `Mmm, ¿${a.es} necesita eso?`),
  helperYes: (name: Phrase) => p(`${cap(name.en)}!`, `¡${cap(name.es)}!`),
  whoFeels: (f: Phrase) => p(`Who feels ${f.en}?`, `¿Quién está ${f.es}?`),
  thatFeels: (f: Phrase) => p(`That one is ${f.en}.`, `Ese está ${f.es}.`),
  yesFeels: (f: Phrase) => p(`Yes! ${cap(f.en)}!`, `¡Sí! ¡${cap(f.es)}!`),

  // ---- feeding ----
  give: (eaterEn: string, esAl: string, t: number, food: { en: [string, string]; es: [string, string]; feminine: boolean }) =>
    p(
      `Give the ${eaterEn} ${t} ${t === 1 ? food.en[0] : food.en[1]}!`,
      `¡Dale ${t === 1 ? (food.feminine ? 'una' : 'un') : num(t).es} ${t === 1 ? food.es[0] : food.es[1]} ${esAl}!`,
    ),
  whichMore: (foodEn: string, foodEs: string) => p(`Which plate has more ${foodEn}?`, `¿Qué plato tiene más ${foodEs}?`),
  yesMore: (n: number) => p(`Yes! ${n} is more!`, `¡Sí! ${num(n).es} es más.`),

  // ---- pop & tap ----
  pop: (verbEn: string, verbEs: string, n: number, color: ColorId, thingEn: string, thingEs: string) =>
    p(`${verbEn} ${n} ${COLORS[color].name.en} ${thingEn}!`, `¡${verbEs} ${num(n).es} ${thingEs} ${COLORS[color].plural.es}!`),
  findColor: (color: ColorId) => p(`Find ${COLORS[color].name.en}!`, `¡Busca ${COLORS[color].name.es}!`),

  // ---- rocket rescue ----
  fuelFirst: (color: ColorId, es: string) => p(`First, fuel! Tap the ${COLORS[color].name.en} fuel can.`, `¡Primero, gasolina! Toca la lata ${es}.`),
  fuelThatOne: (color: ColorId, es: string) => p(`That one is ${COLORS[color].name.en}.`, `Esa es ${es}.`),
  fuelFind: (color: ColorId, es: string) => p(`Find ${COLORS[color].name.en}!`, `¡Busca la ${es}!`),
  fuelGlug: (color: ColorId, es: string) => p(`${COLORS[color].name.en}! Glug, glug, glug!`, `¡${cap(es)}! ¡Glu, glu, glu!`),
  starPower: (n: number) => p(`The rocket needs star power! Tap ${n} stars.`, `¡El cohete necesita estrellas! Toca ${num(n).es} estrellas.`),
  shapeNoFit: (name: Phrase) => p(`That's a ${name.en}. It doesn't fit.`, `Ese es un ${name.es}. No cabe.`),
  shapeFits: (name: Phrase) => p(`The ${name.en} fits!`, `¡El ${name.es} sí cabe!`),
  alienFeels: (feel: Phrase) => p(`A little alien wants to come too. But he ${feel.en}`, `Un extraterrestre quiere venir también. Pero ${feel.es}`),
  countdown: (order: number[]) =>
    p(`Everything is fixed! Count down to blast off. Tap ${order.join(', ')}!`, `¡Todo listo! Cuenta para despegar. Toca ${order.map((n) => num(n).es).join(', ')}.`),
  weNeed: (n: number, want: number) => p(`That's ${n}. We need ${want}!`, `Ese es el ${num(n).es}. ¡Necesitamos el ${num(want).es}!`),
};
