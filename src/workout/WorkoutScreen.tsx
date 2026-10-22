import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../engine/lines';
import { type LangMode, type Phrase, num, p } from '../engine/i18n';
import { sfx } from '../engine/sfx';
import { speak, stopSpeech } from '../engine/speech';
import { type AppData, type KidId, todayKey } from '../engine/storage';
import { BOSS, GAME_BY_ID } from '../games/registry';
import { GameScreen } from '../screens/GameScreen';
import { Bi, LangToggle } from '../components/lang';
import { KIDS } from '../app/kids';
import { MOVES, type MoveId, type Station, bossLevel, buildMix, buildWorkout, nextIndex } from './plan';
import { MENU_ORDER } from '../games/registry';
import { LevelPicker, LevelStars } from '../components/LevelPicker';
import { MIX_TITLE, WORKOUT_TITLE } from '../screens/MenuScreen';

interface Props {
  kid: KidId;
  data: AppData;
  update: (f: (d: AppData) => AppData) => void;
  lang: LangMode;
  onLang: (m: LangMode) => void;
  /** leave early (back to the menu), workout not finished */
  onQuit: () => void;
  /** grown-up wants to leave the goodbye screen */
  onParent: () => void;
  /** 'workout' = the Brain Workout; 'mix' = Mix-Up (random games and levels) */
  mode?: 'workout' | 'mix';
}

type View = 'intro' | 'map' | 'play' | 'bye';

const stationTitle = (s: Station): Phrase =>
  s.kind === 'game' ? GAME_BY_ID[s.gameId].title : s.kind === 'boss' ? BOSS.title : p('Move break', 'A moverse');
const stationIcon = (s: Station) => (s.kind === 'game' ? GAME_BY_ID[s.gameId].icon : s.kind === 'boss' ? '🚀' : MOVES[s.move].emoji);

export function WorkoutScreen({ kid, data, update, lang, onLang, onQuit, onParent, mode = 'workout' }: Props) {
  const mix = mode === 'mix';
  const minutes = mix ? 60 : data.settings.workout[kid];
  /** 0 = automatic; 1–4 = the grown-up's chosen difficulty for every game */
  const fixedLevel = mix ? 0 : data.settings.workoutLevel[kid];
  const stations = useMemo(
    () => (mix ? buildMix(kid, MENU_ORDER[kid].filter((g) => g !== 'block-builder'), Math.floor(Math.random() * 1e6)) : buildWorkout(kid, minutes, data.settings.moveBreaks, new Date(), fixedLevel)),
    [kid, minutes], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const lastStop = stations[stations.length - 1];
  const boss = useMemo(() => (lastStop.kind === 'boss' && lastStop.level) || fixedLevel || bossLevel(data, kid, stations), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState<View>('intro');
  const [paused, setPaused] = useState(false);
  const started = useRef(0);
  const name = KIDS[kid].name;

  useEffect(() => () => stopSpeech(), []);

  const begin = () => {
    sfx.tap();
    started.current = Date.now();
    setIdx(0);
    setView('map');
  };

  const advance = () => {
    const n = nextIndex(stations, idx, Date.now() - started.current, minutes);
    if (n >= stations.length) {
      finish();
      return;
    }
    setIdx(n);
    setView('map');
  };

  const finish = () => {
    if (mix) {
      setView('bye');
      return;
    }
    const day = todayKey();
    update((d) => {
      const k = d.kids[kid];
      if (k.workouts.includes(day)) return d;
      return { ...d, kids: { ...d.kids, [kid]: { ...k, workouts: [...k.workouts, day] } } };
    });
    setView('bye');
  };

  const station = stations[idx];
  const langBtn = (
    <div className="wk-lang">
      <LangToggle mode={lang} onChange={onLang} />
    </div>
  );

  if (view === 'intro') {
    return (
      <div className="wk-screen intro" data-testid="workout-intro">
        <div className="wk-lang">
          {!mix && (
            <LevelPicker
              level={fixedLevel}
              lang={lang}
              testId="workout-level"
              onChange={(l) => update((d) => ({ ...d, settings: { ...d.settings, workoutLevel: { ...d.settings.workoutLevel, [kid]: l } } }))}
            />
          )}
          <LangToggle mode={lang} onChange={onLang} />
        </div>
        <Intro name={name} lang={lang} stations={stations} onGo={begin} onBack={onQuit} mix={mix} />
      </div>
    );
  }
  if (view === 'bye') {
    return mix ? <MixDone lang={lang} onBack={onQuit} /> : <Goodbye kid={kid} data={data} lang={lang} onParent={onParent} />;
  }
  if (view === 'map') {
    return (
      <div className="wk-screen" data-testid="workout-map" data-station={idx}>
        {langBtn}
        <JourneyMap stations={stations} current={idx} lang={lang} kid={kid} onGo={() => setView('play')} />
      </div>
    );
  }

  // view === 'play'
  return (
    <div className="wk-play" data-testid="workout-play" data-kind={station.kind}>
      {station.kind === 'move' ? (
        <MoveBreak move={station.move} lang={lang} onDone={advance} />
      ) : (
        <GameScreen
          key={idx}
          kid={kid}
          gameId={station.kind === 'boss' ? BOSS.id : station.gameId}
          data={data}
          update={update}
          lang={lang}
          onLang={onLang}
          onHome={() => setPaused(true)}
          timeUp={() => false}
          onBreak={() => undefined}
          workout={{
            rounds: station.kind === 'boss' ? BOSS.rounds(boss) : station.rounds,
            level: station.kind === 'boss' ? boss : station.level ?? (fixedLevel || undefined),
            fixed: !!fixedLevel || station.kind === 'boss' || station.level !== undefined,
            onDone: station.kind === 'boss' ? finish : advance,
            onPause: () => setPaused(true),
          }}
        />
      )}
      {paused && (
        <div className="gate" data-testid="workout-paused">
          <div className="pause-card">
            <button className="big-btn again" data-testid="resume" onClick={() => setPaused(false)}>
              <span className="big-btn-icon">▶️</span>
              <Bi ph={p('Keep going', 'Seguir')} mode={lang} />
            </button>
            <button
              className="quiet-btn"
              data-testid="quit-workout"
              onClick={() => {
                setPaused(false);
                onQuit();
              }}
            >
              <Bi ph={p('Stop for now', 'Parar por ahora')} mode={lang} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({ name, lang, stations, onGo, onBack, mix }: { name: string; lang: LangMode; stations: Station[]; onGo: () => void; onBack: () => void; mix: boolean }) {
  useEffect(() => {
    void speak([
      mix ? p("It's Mix-Up time! Every game is a surprise.", '¡Es hora de la Mezcla Sorpresa! Cada juego es una sorpresa.') : L.workoutHi(name),
      mix ? p('Some are easy, some are tricky!', '¡Unos son fáciles y otros son difíciles!') : p("We'll play games, move our bodies, and then fix a rocket!", '¡Vamos a jugar, a movernos y a arreglar un cohete!'),
      p('When you are ready, press the green button to start!', '¡Cuando estés listo, aprieta el botón verde para empezar!'),
    ]);
  }, [name]);
  return (
    <div className="wk-intro">
      <button className="round-btn wk-back" aria-label="Back" data-testid="workout-back" onClick={onBack}>
        <span>⬅️</span>
      </button>
      <div className="wk-guide" aria-hidden>
        {mix ? '🎲' : '🦉'}
      </div>
      <h1>
        <Bi ph={mix ? MIX_TITLE : WORKOUT_TITLE} mode={lang} />
      </h1>
      <div className="wk-preview" aria-hidden>
        {stations.map((s, i) => (
          <span key={i} className={'wk-dot ' + s.kind}>
            {stationIcon(s)}
          </span>
        ))}
      </div>
      <p className="wk-press" data-testid="workout-press">
        <Bi ph={p('Press the green button to start!', '¡Aprieta el botón verde para empezar!')} mode={lang} />
      </p>
      <div className="go-wrap">
        <button className="go-btn pulse-go" data-testid="workout-go" onClick={onGo}>
          <span>▶</span>
          <Bi ph={p("Let's go!", '¡Vamos!')} mode={lang} />
        </button>
        <span className="go-point" aria-hidden>
          👆
        </span>
      </div>
    </div>
  );
}

/** How long the "next game" bar takes to fill; the game starts when it's full (and the words are done). */
export const MAP_BAR_MS = 5500;

function JourneyMap({ stations, current, lang, kid, onGo }: { stations: Station[]; current: number; lang: LangMode; kid: KidId; onGo: () => void }) {
  const s = stations[current];
  const prev = current > 0 ? stations[current - 1] : null;
  const went = useRef(false);
  const [barFull, setBarFull] = useState(false);
  const [talked, setTalked] = useState(false);

  useEffect(() => {
    went.current = false;
    setBarFull(false);
    setTalked(false);
    const title = stationTitle(s);
    const lines: Phrase[] = [];
    // say that the last stop is finished, so the switch is clear
    if (prev && prev.kind === 'game') {
      sfx.win();
      lines.push(L.gameDone(GAME_BY_ID[prev.gameId].title));
    } else if (prev && prev.kind === 'move') {
      lines.push(p('Great moving!', '¡Muy bien movido!'));
    }
    lines.push(
      s.kind === 'boss'
        ? p("Last one! The astronaut's rocket is broken. Let's fix it!", '¡El último! El cohete del astronauta está roto. ¡Vamos a arreglarlo!')
        : s.kind === 'move'
          ? p('Time to move our bodies!', '¡Hora de mover el cuerpo!')
          : L.next(title),
    );
    // the bar fills on its own; this only waits for the words (never more than 12 s)
    const cap = window.setTimeout(() => setTalked(true), 12000);
    void speak(lines).then(() => setTalked(true));
    const bar = window.setTimeout(() => setBarFull(true), MAP_BAR_MS);
    return () => {
      window.clearTimeout(cap);
      window.clearTimeout(bar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (barFull && talked && !went.current) {
      went.current = true;
      const t = window.setTimeout(onGo, 350);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barFull, talked]);

  return (
    <div className="journey">
      {prev && prev.kind === 'game' && (
        <div className="journey-done pop-in" data-testid="station-done">
          <span className="jd-check">✔</span>
          <span className="jd-icon">{stationIcon(prev)}</span>
          <Bi ph={p('Finished!', '¡Terminado!')} mode={lang} />
        </div>
      )}
      <div className="journey-path">
        {stations.map((st, i) => {
          const state = i < current ? 'done' : i === current ? 'now' : 'later';
          return (
            <div key={i} className={`stop ${state} ${st.kind}`} data-testid={`stop-${i}`}>
              {i === current && <span className="stop-kid">{KIDS[kid].avatar}</span>}
              <span className="stop-icon">{state === 'done' ? '✔️' : stationIcon(st)}</span>
            </div>
          );
        })}
      </div>
      <div className="journey-next">
        <span className="jn-label">
          <Bi ph={p('Next', 'Sigue')} mode={lang} />
        </span>
        <span className="jn-icon">{stationIcon(s)}</span>
        <span className="jn-title">
          <Bi ph={stationTitle(s)} mode={lang} />
        </span>
        {s.kind === 'game' && s.level !== undefined && (
          <span className="jn-level" data-testid="station-level">
            <LevelStars level={s.level} />
            {'⭐'.repeat(s.rounds)}
          </span>
        )}
        {s.kind === 'game' && (
          <span className="jn-skill">
            <Bi ph={GAME_BY_ID[s.gameId].skill} mode={lang} />
          </span>
        )}
      </div>
      {/* no button to press: the next stop starts when the bar is full */}
      <div className="auto-next" data-testid="station-countdown" data-full={barFull} aria-hidden>
        <span key={current} style={{ animationDuration: `${MAP_BAR_MS}ms` }} />
      </div>
    </div>
  );
}

function MoveBreak({ move, lang, onDone }: { move: MoveId; lang: LangMode; onDone: () => void }) {
  const m = MOVES[move];
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const run = async () => {
      await Promise.race([speak(m.say), new Promise((r) => setTimeout(r, 5000))]);
      for (let i = 1; i <= m.count; i++) {
        if (!alive.current) return;
        setCount(i);
        sfx.count(i - 1);
        await Promise.race([Promise.all([speak(num(i)), new Promise((r) => setTimeout(r, 1300))]), new Promise((r) => setTimeout(r, 2500))]);
      }
      if (!alive.current) return;
      setFinished(true);
      sfx.win();
      await Promise.race([speak(p('Great moving! Sit down, let’s keep going.', '¡Muy bien! Siéntate, vamos a seguir.')), new Promise((r) => setTimeout(r, 5000))]);
      if (alive.current) window.setTimeout(() => alive.current && onDone(), 900);
    };
    void run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="move-break" data-testid="move-break" data-count={count} data-finished={finished}>
      <div className="stand-up">
        🧍 <Bi ph={p('Stand up!', '¡Párate!')} mode={lang} />
      </div>
      <div className="move-stage">
        <MoverKid move={move} />
        <div className={'move-animal ' + move} key={count}>
          {m.emoji}
        </div>
      </div>
      <div className="move-say">
        <Bi ph={m.say} mode={lang} />
      </div>
      <div className="move-count">
        {Array.from({ length: m.count }, (_, i) => (
          <span key={i} className={i < count ? 'on' : ''}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A simple cartoon kid that shows the movement, so it's clear what to do. */
function MoverKid({ move }: { move: MoveId }) {
  return (
    <svg viewBox="0 0 220 260" className={'mover-kid ' + move} aria-hidden>
      <ellipse cx="110" cy="250" rx="60" ry="8" fill="#000" opacity="0.1" />
      <g className="body">
        <g className="leg-l">
          <rect x="90" y="170" width="18" height="70" rx="9" fill="#3D5A99" />
          <ellipse cx="96" cy="240" rx="16" ry="9" fill="#E8524A" />
        </g>
        <g className="leg-r">
          <rect x="112" y="170" width="18" height="70" rx="9" fill="#3D5A99" />
          <ellipse cx="124" cy="240" rx="16" ry="9" fill="#E8524A" />
        </g>
        <rect x="78" y="100" width="64" height="82" rx="26" fill="#4CB86A" />
        <g className="arm-l">
          <rect x="74" y="108" width="16" height="62" rx="8" fill="#F2C29B" />
        </g>
        <g className="arm-r">
          <rect x="130" y="108" width="16" height="62" rx="8" fill="#F2C29B" />
        </g>
        <circle cx="110" cy="66" r="38" fill="#F2C29B" />
        <path d="M 74 58 Q 80 22 112 26 Q 146 28 146 60 Q 132 44 110 46 Q 90 46 74 58 Z" fill="#5A3B24" />
        <circle cx="97" cy="68" r="5" fill="#33403A" />
        <circle cx="123" cy="68" r="5" fill="#33403A" />
        <path d="M 98 84 Q 110 94 122 84" stroke="#33403A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="88" cy="80" r="6" fill="#F58A7A" opacity="0.5" />
        <circle cx="132" cy="80" r="6" fill="#F58A7A" opacity="0.5" />
      </g>
    </svg>
  );
}

function Goodbye({ kid, data, lang, onParent }: { kid: KidId; data: AppData; lang: LangMode; onParent: () => void }) {
  const name = KIDS[kid].name;
  const lines = useMemo(
    () => [
      L.workoutBye(name),
      p('See you tomorrow!', '¡Nos vemos mañana!'),
      p("It's time to turn off the iPad. Bye bye!", 'Es hora de apagar el iPad. ¡Adiós!'),
    ],
    [name],
  );
  useEffect(() => {
    sfx.fanfare();
    void speak(lines);
  }, [lines]);

  // last 7 days, today on the right
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: todayKey(d), label: d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'narrow' }) };
  });
  const done = new Set(data.kids[kid].workouts);

  return (
    <div className="goodbye" data-testid="workout-goodbye">
      <button className="parent-lock" aria-label="Grown-ups" data-testid="goodbye-parent" onClick={onParent}>
        🔒
      </button>
      <div className="bye-sky" aria-hidden>
        <span className="bye-moon">🌙</span>
        <span className="bye-star s1">✨</span>
        <span className="bye-star s2">⭐</span>
        <span className="bye-star s3">✨</span>
      </div>
      <div className="bye-guide" aria-hidden>
        <span className="bye-owl">🦉</span>
        <span className="bye-wave">👋</span>
      </div>
      <div className="bye-trophy pop-in" aria-hidden>
        🏆
      </div>
      <h1>
        <Bi ph={p('All done for today!', '¡Terminamos por hoy!')} mode={lang} />
      </h1>
      <p className="bye-sub">
        <Bi ph={p('See you tomorrow!', '¡Nos vemos mañana!')} mode={lang} />
      </p>
      <div className="bye-week" aria-label="This week">
        {days.map((d) => (
          <span key={d.key} className={'bye-day' + (done.has(d.key) ? ' on' : '')}>
            <b>{done.has(d.key) ? '★' : ''}</b>
            <i>{d.label}</i>
          </span>
        ))}
      </div>
      <button className="round-btn bye-replay" aria-label="Say it again" onClick={() => void speak(lines)}>
        <span>🔊</span>
      </button>
    </div>
  );
}

function MixDone({ lang, onBack }: { lang: LangMode; onBack: () => void }) {
  useEffect(() => {
    sfx.fanfare();
    void speak([p('Mix-Up done! Great playing!', '¡Terminamos la Mezcla! ¡Qué bien jugaste!')]);
  }, []);
  return (
    <div className="goodbye mix-done" data-testid="mix-done">
      <div className="bye-trophy pop-in" aria-hidden>
        🎉
      </div>
      <h1>
        <Bi ph={p('Mix-Up done!', '¡Terminamos la Mezcla!')} mode={lang} />
      </h1>
      <p className="bye-sub">
        <Bi ph={p('Great playing!', '¡Qué bien jugaste!')} mode={lang} />
      </p>
      <button className="go-btn" data-testid="mix-back" onClick={onBack}>
        <span>🏠</span>
        <Bi ph={p('Back to games', 'Volver a los juegos')} mode={lang} />
      </button>
    </div>
  );
}
