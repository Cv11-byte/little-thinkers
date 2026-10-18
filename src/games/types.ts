import type { ComponentType } from 'react';
import type { Phrase } from '../engine/i18n';
import type { KidId } from '../engine/storage';

/** What the game screen hands each round of a game. */
export interface RoundApi {
  /** 1 = easiest (the younger child), 2 = the older child's start, up to 4 */
  level: number;
  seed: number;
  /** 0-based index of this round inside the play session */
  round: number;
  /** same for every round of one session (pick a different answer each round from it) */
  sessionSeed: number;
  kid: KidId;
  /** the child's name (may be empty), for an occasional personal touch */
  name: string;
  /** small numbers this game remembers between sessions for this child */
  memory: { get(key: string): number | undefined; set(key: string, n: number): void };
  /** increases every time a hint should be shown (button or automatic) */
  hint: number;
  /** set the instruction (repeat button replays it) and speak it */
  instruct(ph: Phrase | Phrase[]): Promise<void>;
  /** speak something without changing the instruction */
  say(ph: Phrase | Phrase[]): Promise<void>;
  /** a wrong try: soft sound + gentle words. Pass false to stay silent, or a phrase to say instead. */
  mistake(words?: Phrase | Phrase[] | false): Promise<void>;
  /** the round is finished */
  solved(): void;
}

export interface GameDef {
  id: string;
  title: Phrase;
  /** emoji shown on the menu tile */
  icon: string;
  /** learning goal, shown to parents */
  skill: Phrase;
  tint: string;
  rounds(level: number): number;
  /** false for free-play games that never change level */
  adaptive: boolean;
  Component: ComponentType<{ api: RoundApi }>;
}
