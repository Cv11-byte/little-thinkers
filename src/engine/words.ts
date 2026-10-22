// Shared bilingual vocabulary for animals and things.
import { type Phrase, p } from './i18n';

export interface Animal {
  id: string;
  emoji: string;
  name: Phrase;
  /** Spanish with article, e.g. "la vaca" */
  es: string;
  /** English with article, e.g. "the cow" */
  en: string;
  sound?: Phrase;
}

const a = (id: string, emoji: string, en: string, esArt: string, sound?: Phrase): Animal => {
  const esName = esArt.replace(/^(el|la) /, '');
  return { id, emoji, name: p(en, esName), es: esArt, en: 'the ' + en, sound };
};

export const ANIMALS: Record<string, Animal> = {
  cow: a('cow', '🐄', 'cow', 'la vaca', p('Moo! Moo!', '¡Mu! ¡Mu!')),
  pig: a('pig', '🐖', 'pig', 'el cochinito', p('Oink! Oink!', '¡Oinc! ¡Oinc!')),
  chicken: a('chicken', '🐔', 'chicken', 'la gallina', p('Cluck, cluck!', '¡Coc, coc, coc!')),
  sheep: a('sheep', '🐑', 'sheep', 'la oveja', p('Baa! Baa!', '¡Bee! ¡Bee!')),
  horse: a('horse', '🐴', 'horse', 'el caballo', p('Neigh!', '¡Iiiii!')),
  dog: a('dog', '🐶', 'dog', 'el perro', p('Woof! Woof!', '¡Guau! ¡Guau!')),
  cat: a('cat', '🐱', 'cat', 'el gato', p('Meow!', '¡Miau!')),
  duck: a('duck', '🦆', 'duck', 'el pato', p('Quack! Quack!', '¡Cuac! ¡Cuac!')),
  rooster: a('rooster', '🐓', 'rooster', 'el gallo', p('Cock-a-doodle-doo!', '¡Quiquiriquí!')),
  frog: a('frog', '🐸', 'frog', 'la rana', p('Ribbit! Ribbit!', '¡Croac! ¡Croac!')),
  lion: a('lion', '🦁', 'lion', 'el león', p('Roar!', '¡Grrraaar!')),
  owl: a('owl', '🦉', 'owl', 'el búho', p('Hoo! Hoo!', '¡Uu! ¡Uu!')),
  bee: a('bee', '🐝', 'bee', 'la abeja', p('Buzz!', '¡Bzzz!')),
  snake: a('snake', '🐍', 'snake', 'la serpiente', p('Hiss!', '¡Sss!')),
  fish: a('fish', '🐟', 'fish', 'el pez'),
  octopus: a('octopus', '🐙', 'octopus', 'el pulpo'),
  whale: a('whale', '🐳', 'whale', 'la ballena'),
  crab: a('crab', '🦀', 'crab', 'el cangrejo'),
  dolphin: a('dolphin', '🐬', 'dolphin', 'el delfín'),
  monkey: a('monkey', '🐒', 'monkey', 'el mono'),
  elephant: a('elephant', '🐘', 'elephant', 'el elefante'),
  parrot: a('parrot', '🦜', 'parrot', 'el perico'),
  tiger: a('tiger', '🐯', 'tiger', 'el tigre'),
  penguin: a('penguin', '🐧', 'penguin', 'el pingüino'),
  polarbear: a('polarbear', '🐻‍❄️', 'polar bear', 'el oso polar'),
  seal: a('seal', '🦭', 'seal', 'la foca'),
  bear: a('bear', '🐻', 'bear', 'el oso'),
  bunny: a('bunny', '🐰', 'bunny', 'el conejo'),
  puppy: a('puppy', '🐶', 'puppy', 'el perrito'),
  kitty: a('kitty', '🐱', 'kitty', 'el gatito'),
  panda: a('panda', '🐼', 'panda', 'el panda'),
  fox: a('fox', '🦊', 'fox', 'el zorro'),
  giraffe: a('giraffe', '🦒', 'giraffe', 'la jirafa'),
  zebra: a('zebra', '🦓', 'zebra', 'la cebra'),
  turtle: a('turtle', '🐢', 'turtle', 'la tortuga'),
  butterfly: a('butterfly', '🦋', 'butterfly', 'la mariposa'),
  snail: a('snail', '🐌', 'snail', 'el caracol'),
  bird: a('bird', '🐦', 'bird', 'el pajarito'),
  eagle: a('eagle', '🦅', 'eagle', 'el águila'),
  squirrel: a('squirrel', '🐿️', 'squirrel', 'la ardilla'),
  sloth: a('sloth', '🦥', 'sloth', 'el perezoso'),
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
