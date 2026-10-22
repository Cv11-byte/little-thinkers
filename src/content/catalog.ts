// Everything a child can see and name in the games, in five groups.
// Each entry is shown as an emoji until a picture is added:
//   src/art/<group>/<id>.png   (or .webp / .jpg / .svg), e.g. src/art/animals/lion.png
// The picture then replaces that emoji everywhere in the app (see engine/art.ts).
//
// Chosen from the words toddlers learn first (MacArthur-Bates CDI word lists:
// animals, vehicles, toys, food, clothing, household items, people) plus
// boy favorites: diggers, rescue vehicles, dinosaurs, community helpers.

import { type Phrase, p } from '../engine/i18n';

export type Group = 'animals' | 'characters' | 'vehicles' | 'items' | 'food';

export interface Thing {
  id: string;
  group: Group;
  /**
   * emoji shown until a picture exists. '#id' means there is no good emoji: the app draws
   * it (components/drawn.tsx) or it waits for a picture before games use it.
   */
  emoji: string;
  /** other emoji in the app that mean the same thing (they use the same picture) */
  also?: string[];
  name: Phrase;
  /** Spanish with article: "el bombero" */
  es: string;
  /** English with article: "the firefighter" */
  en: string;
  plural?: boolean;
}

const t = (group: Group, id: string, emoji: string, en: string, esArt: string, opts: { also?: string[]; plural?: boolean } = {}): Thing => ({
  id,
  group,
  emoji,
  also: opts.also,
  name: p(en, esArt.replace(/^(el|la|los|las) /, '')),
  es: esArt,
  en: 'the ' + en,
  plural: opts.plural,
});

const A = (id: string, emoji: string, en: string, es: string, also?: string[]) => t('animals', id, emoji, en, es, { also });
const C = (id: string, emoji: string, en: string, es: string) => t('characters', id, emoji, en, es);
const V = (id: string, emoji: string, en: string, es: string) => t('vehicles', id, emoji, en, es);
const I = (id: string, emoji: string, en: string, es: string, plural = false, also?: string[]) => t('items', id, emoji, en, es, { plural, also });
const F = (id: string, emoji: string, en: string, es: string, plural = false) => t('food', id, emoji, en, es, { plural });

export const CATALOG: Thing[] = [
  // ---------- animals (50) ----------
  // farm & pets
  A('dog', '🐶', 'dog', 'el perro', ['🐕']),
  A('cat', '🐱', 'cat', 'el gato', ['🐈']),
  A('cow', '🐄', 'cow', 'la vaca', ['🐮']),
  A('horse', '🐴', 'horse', 'el caballo', ['🐎']),
  A('pig', '🐖', 'pig', 'el cochinito', ['🐷']),
  A('sheep', '🐑', 'sheep', 'la oveja'),
  A('goat', '🐐', 'goat', 'la chiva'),
  A('chicken', '🐔', 'chicken', 'la gallina'),
  A('rooster', '🐓', 'rooster', 'el gallo'),
  A('duck', '🦆', 'duck', 'el pato'),
  A('rabbit', '🐰', 'bunny', 'el conejo', ['🐇']),
  A('donkey', '🫏', 'donkey', 'el burro'),
  A('mouse', '🐭', 'mouse', 'el ratón', ['🐁']),
  // wild
  A('lion', '🦁', 'lion', 'el león'),
  A('tiger', '🐯', 'tiger', 'el tigre', ['🐅']),
  A('elephant', '🐘', 'elephant', 'el elefante'),
  A('giraffe', '🦒', 'giraffe', 'la jirafa'),
  A('zebra', '🦓', 'zebra', 'la cebra'),
  A('monkey', '🐒', 'monkey', 'el mono', ['🐵']),
  A('gorilla', '🦍', 'gorilla', 'el gorila'),
  A('bear', '🐻', 'bear', 'el oso'),
  A('polarbear', '🐻‍❄️', 'polar bear', 'el oso polar'),
  A('panda', '🐼', 'panda', 'el panda'),
  A('hippo', '🦛', 'hippo', 'el hipopótamo'),
  A('rhino', '🦏', 'rhino', 'el rinoceronte'),
  A('kangaroo', '🦘', 'kangaroo', 'el canguro'),
  A('koala', '🐨', 'koala', 'el koala'),
  A('fox', '🦊', 'fox', 'el zorro'),
  A('wolf', '🐺', 'wolf', 'el lobo'),
  A('deer', '🦌', 'deer', 'el venado'),
  A('squirrel', '🐿️', 'squirrel', 'la ardilla'),
  A('sloth', '🦥', 'sloth', 'el perezoso'),
  A('crocodile', '🐊', 'crocodile', 'el cocodrilo'),
  A('snake', '🐍', 'snake', 'la serpiente'),
  A('frog', '🐸', 'frog', 'la rana'),
  A('turtle', '🐢', 'turtle', 'la tortuga'),
  // birds
  A('owl', '🦉', 'owl', 'el búho'),
  A('eagle', '🦅', 'eagle', 'el águila'),
  A('penguin', '🐧', 'penguin', 'el pingüino'),
  A('parrot', '🦜', 'parrot', 'el perico'),
  A('bird', '🐦', 'bird', 'el pajarito'),
  // ocean
  A('fish', '🐟', 'fish', 'el pez', ['🐠']),
  A('whale', '🐳', 'whale', 'la ballena', ['🐋']),
  A('dolphin', '🐬', 'dolphin', 'el delfín'),
  A('shark', '🦈', 'shark', 'el tiburón'),
  A('octopus', '🐙', 'octopus', 'el pulpo'),
  A('crab', '🦀', 'crab', 'el cangrejo'),
  A('seal', '🦭', 'seal', 'la foca'),
  // bugs
  A('bee', '🐝', 'bee', 'la abeja'),
  A('butterfly', '🦋', 'butterfly', 'la mariposa'),
  A('ladybug', '🐞', 'ladybug', 'la catarina'),
  A('snail', '🐌', 'snail', 'el caracol'),
  // dinosaurs
  A('trex', '🦖', 'T. rex', 'el tiranosaurio'),
  A('dinosaur', '🦕', 'dinosaur', 'el dinosaurio'),

  // ---------- characters: helpers, family, pretend play (26) ----------
  C('firefighter', '🧑‍🚒', 'firefighter', 'el bombero'),
  C('police', '👮', 'police officer', 'el policía'),
  C('doctor', '🧑‍⚕️', 'doctor', 'el doctor'),
  C('nurse', '👩‍⚕️', 'nurse', 'la enfermera'),
  C('dentist', '#dentist', 'dentist', 'el dentista'),
  C('builder', '👷', 'construction worker', 'el constructor'),
  C('farmer', '🧑‍🌾', 'farmer', 'el granjero'),
  C('chef', '🧑‍🍳', 'chef', 'el cocinero'),
  C('teacher', '🧑‍🏫', 'teacher', 'la maestra'),
  C('astronaut', '🧑‍🚀', 'astronaut', 'el astronauta'),
  C('pilot', '🧑‍✈️', 'pilot', 'el piloto'),
  C('mailcarrier', '#mailcarrier', 'mail carrier', 'el cartero'),
  C('mechanic', '🧑‍🔧', 'mechanic', 'el mecánico'),
  C('trashcollector', '#trashcollector', 'garbage collector', 'el basurero'),
  C('scientist', '🧑‍🔬', 'scientist', 'el científico'),
  C('soccerplayer', '⛹️', 'soccer player', 'el futbolista'),
  C('baby', '👶', 'baby', 'el bebé'),
  C('mommy', '👩', 'mommy', 'mamá'),
  C('daddy', '👨', 'daddy', 'papá'),
  C('grandma', '👵', 'grandma', 'la abuela'),
  C('grandpa', '👴', 'grandpa', 'el abuelo'),
  C('brother', '👦', 'brother', 'el hermano'),
  C('robot', '🤖', 'robot', 'el robot'),
  C('pirate', '🏴‍☠️', 'pirate', 'el pirata'),
  C('superhero', '🦸', 'superhero', 'el superhéroe'),
  C('knight', '#knight', 'knight', 'el caballero'),

  // ---------- vehicles (23) ----------
  V('car', '🚗', 'car', 'el carro'),
  V('racecar', '🏎️', 'race car', 'el carro de carreras'),
  V('truck', '🚚', 'truck', 'el camión'),
  V('firetruck', '🚒', 'fire truck', 'el camión de bomberos'),
  V('policecar', '🚓', 'police car', 'la patrulla'),
  V('ambulance', '🚑', 'ambulance', 'la ambulancia'),
  V('schoolbus', '🚌', 'school bus', 'el autobús'),
  V('garbagetruck', '#garbagetruck', 'garbage truck', 'el camión de la basura'),
  V('dumptruck', '#dumptruck', 'dump truck', 'el camión de volteo'),
  V('excavator', '#excavator', 'excavator', 'la excavadora'),
  V('bulldozer', '#bulldozer', 'bulldozer', 'el bulldozer'),
  V('mixer', '#mixer', 'cement mixer', 'la revolvedora'),
  V('crane', '🏗️', 'crane', 'la grúa'),
  V('tractor', '🚜', 'tractor', 'el tractor'),
  V('train', '🚂', 'train', 'el tren'),
  V('airplane', '✈️', 'airplane', 'el avión'),
  V('helicopter', '🚁', 'helicopter', 'el helicóptero'),
  V('rocket', '🚀', 'rocket', 'el cohete'),
  V('boat', '⛵', 'boat', 'el barco', ),
  V('submarine', '#submarine', 'submarine', 'el submarino'),
  V('motorcycle', '🏍️', 'motorcycle', 'la moto'),
  V('bicycle', '🚲', 'bike', 'la bicicleta'),
  V('scooter', '🛴', 'scooter', 'el patín'),

  // ---------- items: home, clothes, toys (50) ----------
  // eating
  I('fork', '🍴', 'fork', 'el tenedor'),
  I('spoon', '🥄', 'spoon', 'la cuchara'),
  I('plate', '🍽️', 'plate', 'el plato'),
  I('cup', '🥤', 'cup', 'el vaso'),
  I('bowl', '🥣', 'bowl', 'el tazón'),
  I('bottle', '🍼', 'bottle', 'la mamila'),
  I('water', '#water', 'glass of water', 'el vaso de agua'),
  // bath & bed
  I('toothbrush', '🪥', 'toothbrush', 'el cepillo de dientes'),
  I('soap', '🧼', 'soap', 'el jabón'),
  I('towel', '#towel', 'towel', 'la toalla'),
  I('bathtub', '🛁', 'bathtub', 'la tina'),
  I('potty', '🚽', 'potty', 'la bacinica'),
  I('comb', '🪮', 'comb', 'el peine'),
  I('bed', '🛏️', 'bed', 'la cama'),
  I('pillow', '#pillow', 'pillow', 'la almohada'),
  I('blanket', '#blanket', 'blanket', 'la cobija'),
  I('bandage', '🩹', 'bandage', 'la curita'),
  // clothes
  I('shirt', '👕', 'shirt', 'la camisa'),
  I('pants', '👖', 'pants', 'los pantalones', true),
  I('shoes', '👟', 'shoes', 'los zapatos', true),
  I('socks', '🧦', 'socks', 'los calcetines', true),
  I('cap', '🧢', 'cap', 'la gorra'),
  I('jacket', '🧥', 'jacket', 'la chamarra'),
  I('pajamas', '#pajamas', 'pajamas', 'la pijama'),
  I('boots', '🥾', 'boots', 'las botas', true),
  I('diaper', '#diaper', 'diaper', 'el pañal'),
  // toys
  I('ball', '⚽', 'ball', 'la pelota'),
  I('blocks', '🧱', 'blocks', 'los bloques', true),
  I('teddy', '🧸', 'teddy bear', 'el osito'),
  I('book', '📖', 'book', 'el libro', false, ['📚']),
  I('balloon', '🎈', 'balloon', 'el globo'),
  I('drum', '🥁', 'drum', 'el tambor'),
  I('guitar', '🎸', 'guitar', 'la guitarra'),
  I('kite', '🪁', 'kite', 'el papalote'),
  I('crayons', '🖍️', 'crayons', 'los crayones', true),
  I('bubbles', '🫧', 'bubbles', 'las burbujas', true),
  // around the house
  I('chair', '🪑', 'chair', 'la silla'),
  I('door', '🚪', 'door', 'la puerta'),
  I('window', '🪟', 'window', 'la ventana'),
  I('lamp', '💡', 'light', 'la luz'),
  I('key', '🔑', 'key', 'la llave'),
  I('phone', '📱', 'phone', 'el teléfono'),
  I('clock', '⏰', 'clock', 'el reloj'),
  I('tv', '📺', 'TV', 'la tele'),
  I('umbrella', '☂️', 'umbrella', 'el paraguas', false, ['☔']),
  I('flashlight', '🔦', 'flashlight', 'la linterna'),
  I('backpack', '🎒', 'backpack', 'la mochila'),
  I('glasses', '👓', 'glasses', 'los lentes', true),
  I('broom', '🧹', 'broom', 'la escoba'),
  I('hammer', '🔨', 'hammer', 'el martillo'),
  I('shovel', '🪏', 'shovel', 'la pala'),

  // ---------- food (27) ----------
  F('apple', '🍎', 'apple', 'la manzana'),
  F('banana', '🍌', 'banana', 'el plátano'),
  F('orange', '🍊', 'orange', 'la naranja'),
  F('grapes', '🍇', 'grapes', 'las uvas', true),
  F('strawberry', '🍓', 'strawberry', 'la fresa'),
  F('watermelon', '🍉', 'watermelon', 'la sandía'),
  F('pear', '🍐', 'pear', 'la pera'),
  F('pineapple', '🍍', 'pineapple', 'la piña'),
  F('carrot', '🥕', 'carrot', 'la zanahoria'),
  F('corn', '🌽', 'corn', 'el elote'),
  F('broccoli', '🥦', 'broccoli', 'el brócoli'),
  F('tomato', '🍅', 'tomato', 'el tomate'),
  F('avocado', '🥑', 'avocado', 'el aguacate'),
  F('bread', '🍞', 'bread', 'el pan'),
  F('cheese', '🧀', 'cheese', 'el queso'),
  F('egg', '🥚', 'egg', 'el huevo'),
  F('milk', '🥛', 'milk', 'la leche'),
  F('juice', '🧃', 'juice', 'el jugo'),
  F('cookie', '🍪', 'cookie', 'la galleta'),
  F('pizza', '🍕', 'pizza', 'la pizza'),
  F('icecream', '🍦', 'ice cream', 'el helado'),
  F('cake', '🎂', 'cake', 'el pastel'),
  F('tortilla', '🫓', 'tortilla', 'la tortilla'),
  F('taco', '🌮', 'taco', 'el taco'),
  F('rice', '🍚', 'rice', 'el arroz'),
  F('beans', '🫘', 'beans', 'los frijoles', true),
  F('bone', '🦴', 'bone', 'el hueso'),
];

export const GROUPS: { id: Group; name: Phrase }[] = [
  { id: 'animals', name: p('Animals', 'Animales') },
  { id: 'characters', name: p('People', 'Personas') },
  { id: 'vehicles', name: p('Vehicles', 'Vehículos') },
  { id: 'items', name: p('Things', 'Cosas') },
  { id: 'food', name: p('Food', 'Comida') },
];

/** no emoji fits: shown only once a picture (or a built-in drawing) exists */
export const needsPicture = (x: Thing) => x.emoji.startsWith('#');

export const THING_BY_ID: Record<string, Thing> = Object.fromEntries(CATALOG.map((x) => [x.id, x]));

/** emoji (or drawing name) → catalog id, including the "also" emoji */
export const ID_BY_GLYPH: Record<string, string> = Object.fromEntries(
  CATALOG.flatMap((x) => [[x.emoji, x.id] as const, ...(x.also ?? []).map((e) => [e, x.id] as const)]),
);
