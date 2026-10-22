import type { KidId } from '../engine/storage';
import type { GameDef } from './types';
import { rocketMaze } from './maze/RocketMaze';
import { popBalloons } from './balloons/PopBalloons';
import { traceNumbers } from './trace/TraceNumbers';
import { traceLetters } from './trace/TraceLetters';
import { moreLess } from './moreless/MoreLess';
import { animalHomes } from './homes/AnimalHomes';
import { feedTheBear } from './feed/FeedTheBear';
import { whoSays } from './sounds/WhoSays';
import { copyMe } from './pattern/CopyMe';
import { shapePuzzle } from './shapes/ShapePuzzle';
import { helpAFriend } from './kindness/HelpAFriend';
import { blockBuilder } from './blocks/BlockBuilder';
import { blockPuzzle } from './blocks/BlockPuzzle';
import { rocketRescue } from './boss/RocketRescue';

export const GAMES: GameDef[] = [rocketMaze, popBalloons, traceNumbers, traceLetters, moreLess, animalHomes, feedTheBear, whoSays, copyMe, shapePuzzle, helpAFriend, blockPuzzle, blockBuilder];

/** The boss game is only reached through the Brain Workout. */
export const BOSS = rocketRescue;

export const GAME_BY_ID: Record<string, GameDef> = Object.fromEntries([...GAMES, BOSS].map((g) => [g.id, g]));

/** Menu order per kid: easiest-to-start games first for the younger one. */
export const MENU_ORDER: Record<KidId, string[]> = {
  kid1: ['rocket-maze', 'pop-balloons', 'trace-numbers', 'trace-letters', 'more-less', 'animal-homes', 'feed-the-bear', 'who-says', 'copy-me', 'shape-puzzle', 'help-a-friend', 'block-puzzle', 'block-builder'],
  kid2: ['pop-balloons', 'who-says', 'feed-the-bear', 'more-less', 'animal-homes', 'shape-puzzle', 'block-puzzle', 'block-builder', 'copy-me', 'rocket-maze', 'trace-numbers', 'trace-letters', 'help-a-friend'],
};

/** What each game builds, for the grown-up skills map (first = main skill). */
export type SkillArea = 'problem' | 'math' | 'language' | 'letters' | 'memory' | 'motor' | 'feelings' | 'creative' | 'logic';

export const SKILL_AREAS: { id: SkillArea; en: string; es: string; color: string }[] = [
  { id: 'problem', en: 'Problem solving', es: 'Resolver problemas', color: '#3D7BD9' },
  { id: 'logic', en: 'Sorting & logic', es: 'Clasificar y lógica', color: '#9B6BD6' },
  { id: 'math', en: 'Numbers & math', es: 'Números y matemáticas', color: '#2BB3B1' },
  { id: 'language', en: 'Words & listening', es: 'Palabras y escuchar', color: '#4CB86A' },
  { id: 'letters', en: 'Letters', es: 'Letras', color: '#E8524A' },
  { id: 'memory', en: 'Memory & attention', es: 'Memoria y atención', color: '#F27BB0' },
  { id: 'motor', en: 'Finger control', es: 'Motricidad fina', color: '#F5A623' },
  { id: 'feelings', en: 'Feelings & kindness', es: 'Emociones y bondad', color: '#E06D5A' },
  { id: 'creative', en: 'Creativity', es: 'Creatividad', color: '#F58A3A' },
];

export const GAME_SKILLS: Record<string, SkillArea[]> = {
  'rocket-maze': ['problem', 'motor'],
  'pop-balloons': ['math', 'logic'],
  'trace-numbers': ['math', 'motor'],
  'trace-letters': ['letters', 'motor', 'language'],
  'more-less': ['math', 'logic'],
  'animal-homes': ['logic', 'language'],
  'feed-the-bear': ['math', 'motor'],
  'who-says': ['language', 'memory'],
  'copy-me': ['memory'],
  'shape-puzzle': ['logic', 'motor'],
  'help-a-friend': ['feelings', 'language'],
  'block-puzzle': ['problem', 'logic', 'motor'],
  'block-builder': ['creative', 'motor'],
  'rocket-rescue': ['problem', 'math', 'memory', 'feelings'],
};
