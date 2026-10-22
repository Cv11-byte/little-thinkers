import { type LangMode, UI, p } from '../engine/i18n';
import { Bi, LangToggle } from '../components/lang';
import { type AppData, type KidId, getStats, workoutDoneToday } from '../engine/storage';
import { GAME_BY_ID, MENU_ORDER } from '../games/registry';
import { KIDS } from '../app/kids';
import { LevelPicker } from '../components/LevelPicker';

interface Props {
  kid: KidId;
  data: AppData;
  lang: LangMode;
  onGame: (id: string) => void;
  onBack: () => void;
  onStickers: () => void;
  onWorkout: () => void;
  onMix: () => void;
  onLevel: (l: number) => void;
  onLang: (m: LangMode) => void;
}

export const WORKOUT_TITLE = p('Brain Workout', 'Ejercicio Mental');
export const MIX_TITLE = p('Mix-Up', 'Mezcla Sorpresa');

export function MenuScreen({ kid, data, lang, onGame, onBack, onStickers, onWorkout, onMix, onLevel, onLang }: Props) {
  const k = KIDS[kid];
  const doneToday = workoutDoneToday(data, kid);
  // "done" only blocks the card when the grown-up turned on once-a-day
  const done = doneToday && data.settings.workoutOncePerDay;
  const chosen = data.settings.playLevel[kid];
  const days = data.kids[kid].workouts.length;
  return (
    <div className="menu-screen" data-testid="menu-screen" style={{ ['--kid' as string]: k.color, ['--kid-soft' as string]: k.soft }}>
      <header className="menu-bar">
        <button className="round-btn" aria-label="Back" data-testid="back" onClick={onBack}>
          <span>⬅️</span>
        </button>
        <div className="menu-kid">
          <span className="menu-avatar" style={{ background: k.soft }}>
            {k.avatar}
          </span>
          <span className="menu-name">{k.name}</span>
        </div>
        <div className="menu-right">
          <LevelPicker level={chosen} onChange={onLevel} lang={lang} />
          <LangToggle mode={lang} onChange={onLang} />
          <button className="sticker-btn" data-testid="stickers" onClick={onStickers} aria-label={UI.stickers.en}>
            <span>🏅</span>
            <span className="sticker-count">{data.kids[kid].stickers.length}</span>
          </button>
        </div>
      </header>
      <button className={'workout-card' + (done ? ' done' : '')} data-testid="workout-start" data-done={done} onClick={onWorkout}>
        <span className="wk-icon">{done ? '✅' : '🧠'}</span>
        <span className="wk-text">
          <span className="wk-title">
            <Bi ph={WORKOUT_TITLE} mode={lang} />
          </span>
          <span className="wk-sub">
            <Bi
              ph={done ? p('Done for today! See you tomorrow.', '¡Listo por hoy! Nos vemos mañana.') : doneToday ? p('Play it again!', '¡Otra vez!') : p("Today's adventure", 'La aventura de hoy')}
              mode={lang}
            />
          </span>
        </span>
        <span className="wk-trophies" aria-label={`${days} workouts finished`}>
          🏆 <b>{days}</b>
        </span>
        {!done && <span className="wk-go">▶</span>}
      </button>
      <button className="mix-card" data-testid="mix-start" onClick={onMix}>
        <span className="mix-icon">🎲</span>
        <span className="wk-text">
          <span className="wk-title">
            <Bi ph={MIX_TITLE} mode={lang} />
          </span>
          <span className="wk-sub">
            <Bi ph={p('Every game a surprise', 'Cada juego es una sorpresa')} mode={lang} />
          </span>
        </span>
        <span className="wk-go">▶</span>
      </button>
      <div className="game-grid">
        {MENU_ORDER[kid].map((id) => {
          const g = GAME_BY_ID[id];
          const lvl = chosen || getStats(data, kid, id).level;
          return (
            <button key={id} className="game-tile" data-testid={`tile-${id}`} style={{ ['--tint' as string]: g.tint }} onClick={() => onGame(id)}>
              <span className="tile-icon">{g.icon}</span>
              <span className="tile-title">
                <Bi ph={g.title} mode={lang} />
              </span>
              {g.adaptive && (
                <span className="tile-level" aria-label={`Level ${lvl}`}>
                  {[1, 2, 3, 4].map((i) => (
                    <i key={i} className={i <= lvl ? 'on' : ''} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
