import { useState } from 'react';
import { MAX_LEVEL, MIN_LEVEL } from '../engine/adaptive';
import type { LangMode } from '../engine/i18n';
import { type AppData, type KidId, WORKOUT_LENGTHS, cleanName, getStats, newStats, todayKey, workoutDoneToday } from '../engine/storage';
import { WORKOUT_ROUNDS, buildWorkout } from '../workout/plan';
import { GAME_SKILLS, SKILL_AREAS } from '../games/registry';
import { GAME_BY_ID } from '../games/registry';
import { VoicePanel } from './VoicePanel';
import { GAMES } from '../games/registry';
import { KIDS, adultLabel } from '../app/kids';

interface Props {
  data: AppData;
  update: (f: (d: AppData) => AppData) => void;
  onReset: (kid: KidId | 'all') => void;
  onClose: () => void;
}

const LANGS: [LangMode, string][] = [
  ['en', 'English'],
  ['both', 'Both · Ambos'],
  ['es', 'Español'],
];

/** Brain Workout difficulty choices: 0 = automatic */
const WORKOUT_DIFFICULTY: [number, string][] = [
  [0, 'Auto'],
  [1, 'Easy'],
  [2, 'Medium'],
  [3, 'Hard'],
  [4, 'Expert'],
];

export function ParentScreen({ data, update, onReset, onClose }: Props) {
  const [kid, setKid] = useState<KidId>('kid1');
  const [confirm, setConfirm] = useState<KidId | 'all' | null>(null);
  const s = data.settings;
  const set = (patch: Partial<AppData['settings']>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const setLevel = (gameId: string, lvl: number) =>
    update((d) => {
      const cur = d.kids[kid].games[gameId] ?? newStats(kid);
      return { ...d, kids: { ...d.kids, [kid]: { ...d.kids[kid], games: { ...d.kids[kid].games, [gameId]: { ...cur, level: lvl, recent: [] } } } } };
    });

  return (
    <div className="parent-screen" data-testid="parent-screen">
      <header className="parent-head">
        <h1>Grown-up corner</h1>
        <button className="done-btn" data-testid="parent-close" onClick={onClose}>
          Done
        </button>
      </header>

      <section className="p-card" data-testid="p-names">
        <h2>Names</h2>
        <p className="note">Used on the home screen and in praise like "¡Muy bien, ___!". Saved only on this iPad.</p>
        <div className="name-row">
          {(Object.keys(KIDS) as KidId[]).map((id) => (
            <label key={id} className="name-field">
              <span className="name-avatar">{KIDS[id].avatar}</span>
              <input
                id={`name-${id}`}
                data-testid={`p-name-${id}`}
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={20}
                placeholder={id === 'kid1' ? 'Older child' : 'Younger child'}
                value={data.settings.names[id]}
                onChange={(e) => {
                  const v = e.target.value.replace(/[<>{}[\]\\/"`]/g, '').slice(0, 20);
                  update((d) => ({ ...d, settings: { ...d.settings, names: { ...d.settings.names, [id]: v } } }));
                }}
                onBlur={() => update((d) => ({ ...d, settings: { ...d.settings, names: { ...d.settings.names, [id]: cleanName(d.settings.names[id]) } } }))}
              />
            </label>
          ))}
        </div>
      </section>

      <VoicePanel />

      <section className="p-card">
        <h2>Language</h2>
        <div className="seg">
          {LANGS.map(([m, name]) => (
            <button key={m} className={s.lang === m ? 'on' : ''} data-testid={`p-lang-${m}`} onClick={() => set({ lang: m })}>
              {name}
            </button>
          ))}
        </div>
        <p className="note">"Both" says every instruction in Spanish first, then English.</p>
        <div className="toggles">
          <label>
            <input type="checkbox" checked={s.voice} onChange={(e) => set({ voice: e.target.checked })} data-testid="p-voice" /> Spoken instructions
          </label>
          <label>
            <input type="checkbox" checked={s.sounds} onChange={(e) => set({ sounds: e.target.checked })} data-testid="p-sounds" /> Sound effects
          </label>
        </div>
        <h3>Play-time limit</h3>
        <div className="seg">
          {[0, 10, 15, 20, 30].map((m) => (
            <button key={m} className={s.playLimit === m ? 'on' : ''} data-testid={`p-limit-${m}`} onClick={() => set({ playLimit: m })}>
              {m === 0 ? 'Off' : `${m} min`}
            </button>
          ))}
        </div>
        <p className="note">When time is up, the game finishes the current puzzle and shows a "time for a break" screen that only a grown-up can close.</p>
      </section>

      <section className="p-card" data-testid="p-workout">
        <h2>Brain Workout</h2>
        <p className="note">
          A guided session through every game in a set order, with stand-up move breaks, the Rocket Rescue finale, then a goodbye screen that only a
          grown-up can close. Length sets the rounds per game; Hard and Expert add a round.
        </p>
        <div className="toggles">
          <label>
            <input
              type="checkbox"
              checked={data.settings.moveBreaks}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, moveBreaks: e.target.checked } }))}
              data-testid="p-move-breaks"
            />{' '}
            Stand-up move breaks between games (jump like a frog, reach up like a giraffe…)
          </label>
          <label>
            <input
              type="checkbox"
              checked={data.settings.workoutOncePerDay}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, workoutOncePerDay: e.target.checked } }))}
              data-testid="p-once-a-day"
            />{' '}
            Only once a day (off: the workout can be replayed anytime)
          </label>
        </div>
        {(Object.keys(KIDS) as KidId[]).map((id) => {
          const plan = buildWorkout(id, data.settings.workout[id], data.settings.moveBreaks, new Date(), data.settings.workoutLevel[id]);
          const doneToday = workoutDoneToday(data, id);
          return (
            <div key={id} className="wk-parent-row">
              <div className="wk-parent-head">
                <b>
                  {KIDS[id].avatar} {adultLabel(id)}
                </b>
                <div className="seg">
                  {WORKOUT_LENGTHS.map((m) => (
                    <button
                      key={m}
                      className={data.settings.workout[id] === m ? 'on' : ''}
                      data-testid={`p-wk-${id}-${m}`}
                      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, workout: { ...d.settings.workout, [id]: m } } }))}
                    >
                      {({ 10: 'Short', 20: 'Medium', 30: 'Long' } as Record<number, string>)[m]} · {WORKOUT_ROUNDS[m]} {WORKOUT_ROUNDS[m] === 1 ? 'round' : 'rounds'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="wk-parent-head">
                <span className="note">Difficulty</span>
                <div className="seg">
                  {WORKOUT_DIFFICULTY.map(([lvl, label]) => (
                    <button
                      key={lvl}
                      className={data.settings.workoutLevel[id] === lvl ? 'on' : ''}
                      data-testid={`p-wk-level-${id}-${lvl}`}
                      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, workoutLevel: { ...d.settings.workoutLevel, [id]: lvl } } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="note">
                {data.settings.workoutLevel[id]
                  ? `Every workout game plays at level ${data.settings.workoutLevel[id]} and stays there. `
                  : 'Auto: each game uses its own level, which moves up after 3 solo wins in a row. '}
                Today: {doneToday ? 'finished ✅' : 'not yet'} · Total days: {data.kids[id].workouts.length} ·{' '}
                {plan
                  .filter((x) => x.kind === 'game')
                  .map((x) => (x.kind === 'game' ? GAME_BY_ID[x.gameId].title.en : ''))
                  .join(', ')}
              </p>
              {doneToday && data.settings.workoutOncePerDay && (
                <button
                  className="small-btn"
                  data-testid={`p-wk-again-${id}`}
                  onClick={() =>
                    update((d) => ({ ...d, kids: { ...d.kids, [id]: { ...d.kids[id], workouts: d.kids[id].workouts.filter((x) => x !== todayKey()) } } }))
                  }
                >
                  Allow another workout today
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="p-card" data-testid="p-skills">
        <h2>Skills map</h2>
        <p className="note">Puzzles solved in each skill area (a game counts toward every skill it builds). Thin bars show what to play more.</p>
        {(Object.keys(KIDS) as KidId[]).map((id) => {
          const totals = SKILL_AREAS.map((a) => ({
            a,
            n: Object.entries(GAME_SKILLS)
              .filter(([, skills]) => skills.includes(a.id))
              .reduce((sum, [g]) => sum + (data.kids[id].games[g]?.rounds ?? 0), 0),
          }));
          const max = Math.max(1, ...totals.map((t) => t.n));
          return (
            <div key={id} className="skill-map">
              <b>
                {KIDS[id].avatar} {adultLabel(id)}
              </b>
              {totals.map(({ a, n }) => (
                <div key={a.id} className="skill-row" data-testid={`skill-${id}-${a.id}`}>
                  <span className="skill-name">{a.en}</span>
                  <span className="skill-bar">
                    <i style={{ width: `${(n / max) * 100}%`, background: a.color }} />
                  </span>
                  <span className="skill-n">{n}</span>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      <section className="p-card">
        <h2>Progress</h2>
        <div className="seg kid-seg">
          {(Object.keys(KIDS) as KidId[]).map((id) => (
            <button key={id} className={kid === id ? 'on' : ''} data-testid={`p-kid-${id}`} onClick={() => setKid(id)}>
              {KIDS[id].avatar} {adultLabel(id)}
            </button>
          ))}
        </div>
        <table className="progress">
          <thead>
            <tr>
              <th>Game</th>
              <th>Skill</th>
              <th>Puzzles</th>
              <th>On their own</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {GAMES.map((g) => {
              const st = getStats(data, kid, g.id);
              const pct = st.rounds ? Math.round((st.independent / st.rounds) * 100) : null;
              return (
                <tr key={g.id} data-testid={`p-row-${g.id}`}>
                  <td>
                    {g.icon} {g.title.en}
                  </td>
                  <td className="muted">{g.skill.en}</td>
                  <td>{st.rounds}</td>
                  <td>{pct === null ? '–' : `${pct}%`}</td>
                  <td>
                    {g.adaptive ? (
                      <span className="stepper">
                        <button aria-label={`Lower ${g.title.en} level`} disabled={st.level <= MIN_LEVEL} onClick={() => setLevel(g.id, st.level - 1)}>
                          −
                        </button>
                        <b data-testid={`p-level-${g.id}`}>{st.level}</b>
                        <button aria-label={`Raise ${g.title.en} level`} disabled={st.level >= MAX_LEVEL} onClick={() => setLevel(g.id, st.level + 1)}>
                          +
                        </button>
                      </span>
                    ) : (
                      <span className="muted">free play</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="note">
          Level 1 is the gentlest (tap-friendly, made for the little one). Levels move up after 3 puzzles in a row solved without help, and down after 3 in a
          row that needed lots of help. "On their own" = solved with no hint and at most one wrong try. These numbers show practice, not a test score.
        </p>
        <p className="note">Stickers collected: {data.kids[kid].stickers.length}</p>
      </section>

      <section className="p-card">
        <h2>Reset</h2>
        <div className="reset-row">
          <button className="danger" data-testid="p-reset-kid" onClick={() => setConfirm(kid)}>
            Reset {adultLabel(kid)}'s progress
          </button>
          <button className="danger" data-testid="p-reset-all" onClick={() => setConfirm('all')}>
            Reset everyone
          </button>
        </div>
      </section>

      <section className="p-card">
        <h2>Privacy</h2>
        <p className="note">
          Everything stays on this iPad. There are no accounts, ads, purchases, tracking, or internet requests while playing. Progress is saved in this browser's
          local storage; clearing Safari website data will erase it.
        </p>
        <h2>Tips for iPad</h2>
        <ul className="note">
          <li>Open the app in Safari, tap Share, then "Add to Home Screen" for a full-screen app icon.</li>
          <li>Turn on Guided Access (Settings → Accessibility → Guided Access), then triple-click the side/home button while playing to lock the iPad to this app.</li>
          <li>If there's no voice, check the iPad isn't on silent and the volume is up.</li>
        </ul>
      </section>

      {confirm && (
        <div className="confirm" data-testid="confirm">
          <div className="confirm-card">
            <p>{confirm === 'all' ? 'Erase progress and stickers for everyone?' : `Erase ${adultLabel(confirm)}'s progress and stickers?`}</p>
            <div className="reset-row">
              <button onClick={() => setConfirm(null)} data-testid="confirm-no">
                Cancel
              </button>
              <button
                className="danger"
                data-testid="confirm-yes"
                onClick={() => {
                  onReset(confirm);
                  setConfirm(null);
                }}
              >
                Erase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
