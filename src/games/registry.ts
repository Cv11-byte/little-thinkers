import type { KidId } from '../engine/storage';
import type { GameDef } from './types';
import { rocketMaze } from './maze/RocketMaze';
import { popBalloons } from './balloons/PopBalloons';
import { traceNumbers } from './trace/TraceNumbers';
import { traceLetters } from './trace/TraceLetters';
import { animalHomes } from './homes/AnimalHomes';
import { feedTheBear } from './feed/FeedTheBear';
import { whoSays } from './sounds/WhoSays';
import { copyMe } from './pattern/CopyMe';
import { shapePuzzle } from './shapes/ShapePuzzle';
import { helpAFriend } from './kindness/HelpAFriend';
import { blockBuilder } from './blocks/BlockBuilder';
import { rocketRescue } from './boss/RocketRescue';

export const GAMES: GameDef[] = [rocketMaze, popBalloons, traceNumbers, traceLetters, animalHomes, feedTheBear, whoSays, copyMe, shapePuzzle, helpAFriend, blockBuilder];

/** The boss game is only reached through the Brain Workout. */
export const BOSS = rocketRescue;

export const GAME_BY_ID: Record<string, GameDef> = Object.fromEntries([...GAMES, BOSS].map((g) => [g.id, g]));

/** Menu order per kid: easiest-to-start games first for the younger one. */
export const MENU_ORDER: Record<KidId, string[]> = {
  kid1: ['rocket-maze', 'pop-balloons', 'trace-numbers', 'trace-letters', 'animal-homes', 'feed-the-bear', 'who-says', 'copy-me', 'shape-puzzle', 'help-a-friend', 'block-builder'],
  kid2: ['pop-balloons', 'who-says', 'feed-the-bear', 'animal-homes', 'shape-puzzle', 'block-builder', 'copy-me', 'rocket-maze', 'trace-numbers', 'trace-letters', 'help-a-friend'],
};
