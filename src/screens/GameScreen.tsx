import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../engine/lines';
import { AUTO_HINT_AFTER, applyRound } from '../engine/adaptive';
import { type LangMode, type Phrase, UI, p } from '../engine/i18n';
import { Bi, LangToggle } from '../components/lang';
import { HoldButton } from '../components/HoldButton';
import { sfx } from '../engine/sfx';
import { speak, stopSpeech, whenQuiet } from '../engine/speech';
import { Stage, useStageSize } from '../engine/stage';
import { type AppData, type KidId, getStats, levelState } from '../engine/storage';
import { GAME_BY_ID } from '../games/registry';
import type { RoundApi } from '../games/types';
import { KIDS, STICKERS } from '../app/kids';

interface Props {
  kid: KidId;
  gameId: string;
  data: AppData;
  update: (f: (d: AppData) => AppData) => void;
  lang: LangMode;
  onHome: () => void;
  /** true when the play-time limit has been reached */
  timeUp: () => boolean;
  onBreak: () => void;
  onLang: (m: LangMode) => void;
  /** set when the game is one stop of the Brain Workout */
  workout?: { rounds: number; level?: number; /** grown-up picked the difficulty: don't change the level */ fixed?: boolean; onDone: () => void; onPause: () => void };
}

type Phase = 'play' | 'between' | 'end';



/** Minimum time a celebration stays up, and the pause after a wrong try. */
const CELEBRATE_MS = 1700;
const MISTAKE_LOCK_MS = 900;

export function GameScreen({ kid, gameId, data, update, lang, onHome, timeUp, onBreak, onLang, workout }: Props) {
  const def = GAME_BY_ID[gameId];
  const startLevel = workout?.level ?? getStats(data, kid, gameId).level;
  const [level, setLevel] = useState(startLevel);
  const [total, setTotal] = useState(() => workout?.rounds ?? def.rounds(startLevel));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [hint, setHint] = useState(0);
  const [sticker, setSticker] = useState<string | null>(null);
  const [levelNote, setLevelNote] = useState<'up' | 'down' | null>(null);
  /** true while instructions play or right after a wrong try: taps are ignored */
  const [locked, setLocked] = useState(true);
  const lockGen = useRef(0);
  const seedBase = useMemo(() => Math.floor(Math.random() * 100000), []);
  const mistakes = useRef(0);
  const hints = useRef(0);
  const instruction = useRef<Phrase[]>([]);
  const solvedRef = useRef(false);
  const praiseCount = useRef(0);
  const timers = useRef<number[]>([]);
  const areaRef = useRef<HTMLDivElement>(null);
  const size = useStageSize(areaRef);
  const name = KIDS[kid].name;
  const dataRef = useRef(data);
  dataRef.current = data;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // starts locked; the game's first instruction unlocks it (fallback after 6 s)
    const fallback = window.setTimeout(() => {
      if (lockGen.current === 0) setLocked(false);
    }, 6000);
    timers.current.push(fallback);
    return () => {
      alive.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      lockGen.current++;
      stopSpeech();
    };
  }, []);
  const after = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  /** Lock input until `until` resolves (and at least `minMs` has passed). */
  const lockWhile = (until: Promise<void>, minMs: number) => {
    const g = ++lockGen.current;
    setLocked(true);
    const min = new Promise<void>((r) => window.setTimeout(r, minMs));
    void Promise.all([until, min]).then(() => {
      if (g === lockGen.current) setLocked(false);
    });
  };

  const startRound = (r: number, lvl: number) => {
    // no taps until the new round's instruction runs (it unlocks), 6 s at most
    lockWhile(new Promise<void>((res) => window.setTimeout(res, 6000)), 0);
    mistakes.current = 0;
    hints.current = 0;
    solvedRef.current = false;
    setHint(0);
    setLevel(lvl);
    setRound(r);
    setPhase('play');
  };

  const finishRound = () => {
    if (solvedRef.current) return;
    solvedRef.current = true;
    lockGen.current++;
    setLocked(false);
    const result = { mistakes: mistakes.current, hints: hints.current };
    let newLevel = level;
    let change: 'up' | 'down' | null = null;
    const s = { ...getStats(dataRef.current, kid, gameId) };
    s.rounds += 1;
    s.hints += result.hints;
    s.mistakes += result.mistakes;
    if (result.hints === 0 && result.mistakes <= 1) s.independent += 1;
    s.lastPlayed = Date.now();
    if (def.adaptive && !workout?.fixed) {
      // the round was played at `level`; adapt from there
      const u = applyRound({ ...levelState(s), level }, result);
      s.level = u.state.level;
      s.recent = u.state.recent;
      newLevel = u.state.level;
      change = u.change;
    }
    update((d) => {
      const cur = d.kids[kid].games[gameId];
      // keep any memory the game wrote this round
      const merged = { ...s, mem: { ...s.mem, ...(cur?.mem ?? {}) } };
      return { ...d, kids: { ...d.kids, [kid]: { ...d.kids[kid], games: { ...d.kids[kid].games, [gameId]: merged } } } };
    });
    setLevelNote((prev) => change ?? prev);
    const isLast = round + 1 >= total;

    if (isLast && !workout) {
      const owned = new Set(dataRef.current.kids[kid].stickers);
      const fresh = STICKERS.filter((x) => !owned.has(x));
      const st = (fresh.length ? fresh : STICKERS)[Math.floor(Math.random() * (fresh.length || STICKERS.length))];
      // let whatever the game is saying finish first
      void whenQuiet().then(() => {
        if (!alive.current) return;
        setSticker(st);
        update((d) => ({ ...d, kids: { ...d.kids, [kid]: { ...d.kids[kid], stickers: [...d.kids[kid].stickers, st] } } }));
        setPhase('end');
        sfx.fanfare();
        void speak([L.allDone(name), UI.newSticker]);
      });
      return;
    }

    // Visual celebration. Spoken praise only now and then, with the child's name.
    setPhase('between');
    sfx.win();
    praiseCount.current += 1;
    const sayName = isLast || praiseCount.current % 3 === 0;
    const quiet = whenQuiet().then(() => {
      if (sayName) {
        return speak(L.praise(name, praiseCount.current));
      }
    });
    const minShow = new Promise<void>((r) => window.setTimeout(r, CELEBRATE_MS));
    void Promise.all([quiet, minShow]).then(() => {
      if (!alive.current) return; // left the screen
      if (isLast && workout) {
        workout.onDone();
        return;
      }
      if (!workout && timeUp()) {
        onBreak();
        return;
      }
      startRound(round + 1, newLevel);
    });
  };

  const showHint = () => {
    hints.current += 1;
    setHint((h) => h + 1);
  };

  const api: RoundApi = {
    level,
    seed: seedBase + round * 101 + level * 7,
    round,
    totalRounds: total,
    sessionSeed: seedBase,
    kid,
    name,
    hint,
    memory: {
      get: (key) => getStats(dataRef.current, kid, gameId).mem[key],
      set: (key, n) =>
        update((d) => {
          const cur = getStats(d, kid, gameId);
          return { ...d, kids: { ...d.kids, [kid]: { ...d.kids[kid], games: { ...d.kids[kid].games, [gameId]: { ...cur, mem: { ...cur.mem, [key]: n } } } } } };
        }),
    },
    instruct(ph) {
      instruction.current = Array.isArray(ph) ? ph : [ph];
      const s = speak(instruction.current);
      // options appear and become tappable once the instruction has been heard
      lockWhile(s, 700);
      return s;
    },
    say(ph) {
      return speak(ph);
    },
    mistake(words) {
      mistakes.current += 1;
      const n = mistakes.current;
      if (n === AUTO_HINT_AFTER) after(showHint, 900);
      const s = words === false ? Promise.resolve() : speak(words ?? p('Try again!', '¡Otra vez!'));
      lockWhile(s, MISTAKE_LOCK_MS);
      return s;
    },
    solved: finishRound,
  };

  const playAgain = () => {
    setSticker(null);
    setLevelNote(null);
    const lvl = getStats(dataRef.current, kid, gameId).level;
    setTotal(def.rounds(lvl));
    if (timeUp()) {
      onBreak();
      return;
    }
    startRound(0, lvl);
  };

  const Game = def.Component;
  const orient = size.W >= size.H ? 'l' : 'p';
  const leave = workout ? workout.onPause : onHome;

  return (
    <div className="game-screen" data-testid="game-screen" data-game={gameId} data-level={level} data-round={round} data-phase={phase} data-locked={locked}>
      <header className="game-bar">
        <HoldButton className="round-btn home-btn" label="Hold to go home" testId="home" onHold={leave}>
          🏠
        </HoldButton>
        <div className="round-stars" aria-label={`Round ${round + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => {
            const done = i < round || (i === round && phase !== 'play');
            return (
              <span key={i} className={'rstar' + (done ? ' done' : i === round ? ' now' : '')}>
                <StarShape />
              </span>
            );
          })}
        </div>
        <div className="bar-right">
          <LangToggle
            mode={lang}
            onChange={(m) => {
              onLang(m);
              // say the instruction again in the new language
              window.setTimeout(() => lockWhile(speak(instruction.current), 300), 60);
            }}
          />
          <button
            className={'round-btn' + (locked && phase === 'play' ? ' talking' : '')}
            aria-label="Say it again"
            data-testid="repeat"
            onClick={() => lockWhile(speak(instruction.current), 300)}
          >
            <span>🔊</span>
          </button>
          <button
            className="round-btn hint-btn"
            aria-label="Hint"
            data-testid="hint"
            onClick={() => {
              if (locked || phase !== 'play') return;
              sfx.tap();
              showHint();
            }}
          >
            <span>💡</span>
          </button>
        </div>
      </header>
      <div className="play-area" ref={areaRef}>
        {size.ready && phase !== 'end' && (
          <Stage W={size.W} H={size.H}>
            <Game key={`${round}-${level}-${orient}`} api={api} />
          </Stage>
        )}
        {/* guardrail: while the game is talking or celebrating, taps don't go through */}
        {(locked || phase === 'between') && <div className="input-lock" data-testid="input-lock" aria-hidden />}
        {phase === 'between' && (
          <div className="overlay celebrate" data-testid="between" aria-hidden>
            <div className="cel-rays" />
            <div className="cel-star">
              <StarShape />
            </div>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="cel-spark" style={{ ['--a' as string]: `${i * 30}deg`, animationDelay: `${(i % 4) * 40}ms` }} />
            ))}
          </div>
        )}
        {phase === 'end' && (
          <div className="overlay end" data-testid="session-end">
            <div className="confetti" aria-hidden>
              {Array.from({ length: 28 }, (_, i) => (
                <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.15}s`, background: ['#E8524A', '#3D8BE8', '#F7C431', '#4CB86A', '#9B6BD6'][i % 5] }} />
              ))}
            </div>
            <div className="end-card pop-in">
              <div className="end-stars" aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className="end-star" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                    <StarShape />
                  </span>
                ))}
              </div>
              <div className="end-title">
                <Bi ph={UI.allDone} mode={lang} />
              </div>
              {sticker && (
                <div className="sticker-reveal" data-testid="sticker">
                  <span className="sticker-big">{sticker}</span>
                </div>
              )}
              {levelNote === 'up' && (
                <div className="level-note">
                  ⬆️ <Bi ph={{ en: 'Next time: a little harder!', es: '¡La próxima vez: un poquito más difícil!' }} mode={lang} />
                </div>
              )}
              <div className="end-buttons">
                <button className="big-btn again" data-testid="play-again" onClick={playAgain}>
                  <span className="big-btn-icon">🔁</span>
                  <Bi ph={UI.playAgain} mode={lang} />
                </button>
                <button className="big-btn other" data-testid="other-games" onClick={onHome}>
                  <span className="big-btn-icon">🎲</span>
                  <Bi ph={UI.otherGame} mode={lang} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A soft, rounded five-point star used for progress and celebrations. */
export function StarShape() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="starfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="1" stopColor="#F5B11E" />
        </linearGradient>
      </defs>
      <path
        d="M50 6 C53 6 55 8 56.5 11 L66 31 L88 34 C95 35 97 42 92 47 L76 62 L80 84 C81 91 75 95 69 92 L50 81 L31 92 C25 95 19 91 20 84 L24 62 L8 47 C3 42 5 35 12 34 L34 31 L43.5 11 C45 8 47 6 50 6 Z"
        fill="url(#starfill)"
        stroke="#E09A10"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse cx="40" cy="36" rx="7" ry="11" fill="#fff" opacity="0.55" transform="rotate(-25 40 36)" />
    </svg>
  );
}
