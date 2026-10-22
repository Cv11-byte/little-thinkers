import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bi } from '../components/lang';
import { type LangMode, UI } from '../engine/i18n';
import { setSfxEnabled, sfx, unlockAudio } from '../engine/sfx';
import { configureSpeech, loadVoiceManifest, speak, stopSpeech, unlockSpeech } from '../engine/speech';
import { type AppData, type KidId, LocalStorageRepository, type ProgressRepository, defaultData, emptyKid, workoutDoneToday } from '../engine/storage';
import { GAME_BY_ID } from '../games/registry';
import { GameScreen } from '../screens/GameScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { ParentGate } from '../screens/ParentGate';
import { ParentScreen } from '../screens/ParentScreen';
import { StickerScreen } from '../screens/StickerScreen';
import { KIDS, setKidNames } from './kids';
import { L } from '../engine/lines';
import { WorkoutScreen } from '../workout/WorkoutScreen';

const LANG_NAMES: Record<LangMode, { en: string; es: string }> = {
  en: { en: 'English', es: 'English' },
  es: { en: 'Español', es: 'Español' },
  both: { en: 'English', es: 'Español' },
};

type Screen =
  | { name: 'home' }
  | { name: 'menu'; kid: KidId }
  | { name: 'game'; kid: KidId; gameId: string }
  | { name: 'stickers'; kid: KidId }
  | { name: 'parent' }
  | { name: 'break' }
  | { name: 'workout'; kid: KidId }
  | { name: 'mix'; kid: KidId };

export function App({ repo }: { repo?: ProgressRepository }) {
  const store = useMemo(() => repo ?? new LocalStorageRepository(), [repo]);
  const [data, setData] = useState<AppData>(() => {
    try {
      return store.load();
    } catch {
      return defaultData();
    }
  });
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [gate, setGate] = useState<null | 'parent' | 'break' | 'bye'>(null);
  const sessionStart = useRef(Date.now());
  const unlocked = useRef(false);

  const update = useCallback(
    (f: (d: AppData) => AppData) => {
      setData((d) => {
        const next = f(d);
        store.save(next);
        return next;
      });
    },
    [store],
  );

  const lang = data.settings.lang;
  setKidNames(data.settings.names);
  useEffect(() => {
    configureSpeech({ mode: lang, enabled: data.settings.voice });
    setSfxEnabled(data.settings.sounds);
  }, [lang, data.settings.voice, data.settings.sounds]);

  // recorded voices (if any have been generated)
  useEffect(() => {
    void loadVoiceManifest();
  }, []);

  // iOS only allows sound after a tap: unlock on the very first touch anywhere.
  useEffect(() => {
    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      unlockAudio();
      unlockSpeech();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    return () => window.removeEventListener('pointerdown', unlock, { capture: true });
  }, []);

  // stop pinch-zoom and the iOS long-press magnifier inside the app
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('contextmenu', stop);
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('contextmenu', stop);
    };
  }, []);

  const timeUp = () => data.settings.playLimit > 0 && Date.now() - sessionStart.current > data.settings.playLimit * 60_000;

  const go = (s: Screen) => {
    stopSpeech();
    setScreen(s);
  };

  const pickKid = (kid: KidId) => {
    sfx.tap();
    go({ name: 'menu', kid });
    void speak(L.hi(KIDS[kid].name));
  };

  const pickGame = (kid: KidId, gameId: string) => {
    sfx.tap();
    if (timeUp()) {
      go({ name: 'break' });
      return;
    }
    go({ name: 'game', kid, gameId });
  };

  const setLang = (l: LangMode) => {
    sfx.tap();
    update((d) => ({ ...d, settings: { ...d.settings, lang: l } }));
    configureSpeech({ mode: l });
    // on game screens the game repeats its own instruction instead
    if (screen.name === 'home' || screen.name === 'menu') void speak(LANG_NAMES[l]);
  };

  const startWorkout = (kid: KidId) => {
    sfx.tap();
    if (data.settings.workoutOncePerDay && workoutDoneToday(data, kid)) {
      void speak([
        L.alreadyWorkout(KIDS[kid].name),
        { en: 'See you tomorrow!', es: '¡Nos vemos mañana!' },
      ]);
      return;
    }
    go({ name: 'workout', kid });
  };

  const reset = (who: KidId | 'all') => {
    if (who === 'all') {
      const fresh = store.reset();
      setData(fresh);
    } else {
      update((d) => ({ ...d, kids: { ...d.kids, [who]: emptyKid() } }));
    }
  };

  let body: JSX.Element;
  switch (screen.name) {
    case 'home':
      body = <HomeScreen lang={lang} onKid={pickKid} onLang={setLang} onParent={() => setGate('parent')} />;
      break;
    case 'menu':
      body = (
        <MenuScreen
          kid={screen.kid}
          data={data}
          lang={lang}
          onGame={(id) => pickGame(screen.kid, id)}
          onBack={() => go({ name: 'home' })}
          onStickers={() => go({ name: 'stickers', kid: screen.kid })}
          onWorkout={() => startWorkout(screen.kid)}
          onMix={() => {
            sfx.tap();
            go({ name: 'mix', kid: screen.kid });
          }}
          onLevel={(l) => update((d) => ({ ...d, settings: { ...d.settings, playLevel: { ...d.settings.playLevel, [screen.kid]: l } } }))}
          onLang={setLang}
        />
      );
      break;
    case 'stickers':
      body = <StickerScreen kid={screen.kid} data={data} lang={lang} onBack={() => go({ name: 'menu', kid: screen.kid })} />;
      break;
    case 'game':
      body = GAME_BY_ID[screen.gameId] ? (
        <GameScreen
          key={screen.gameId}
          kid={screen.kid}
          gameId={screen.gameId}
          data={data}
          update={update}
          lang={lang}
          onHome={() => go({ name: 'menu', kid: screen.kid })}
          timeUp={timeUp}
          onBreak={() => go({ name: 'break' })}
          onLang={setLang}
        />
      ) : (
        <HomeScreen lang={lang} onKid={pickKid} onLang={setLang} onParent={() => setGate('parent')} />
      );
      break;
    case 'parent':
      body = <ParentScreen data={data} update={update} onReset={reset} onClose={() => go({ name: 'home' })} />;
      break;
    case 'workout':
      body = (
        <WorkoutScreen
          key={screen.kid}
          kid={screen.kid}
          data={data}
          update={update}
          lang={lang}
          onLang={setLang}
          onQuit={() => go({ name: 'menu', kid: screen.kid })}
          onParent={() => setGate('bye')}
        />
      );
      break;
    case 'mix':
      body = (
        <WorkoutScreen
          key={'mix-' + screen.kid}
          mode="mix"
          kid={screen.kid}
          data={data}
          update={update}
          lang={lang}
          onLang={setLang}
          onQuit={() => go({ name: 'menu', kid: screen.kid })}
          onParent={() => go({ name: 'menu', kid: screen.kid })}
        />
      );
      break;
    case 'break':
      body = <BreakScreen lang={lang} onGrownUp={() => setGate('break')} />;
      break;
  }

  return (
    <div className="app" data-screen={screen.name}>
      {body}
      {gate && (
        <ParentGate
          onCancel={() => setGate(null)}
          onPass={() => {
            const which = gate;
            setGate(null);
            if (which === 'break') sessionStart.current = Date.now();
            go(which === 'parent' ? { name: 'parent' } : { name: 'home' });
          }}
        />
      )}
    </div>
  );
}

function BreakScreen({ lang, onGrownUp }: { lang: LangMode; onGrownUp: () => void }) {
  useEffect(() => {
    void speak([UI.breakTime, { en: 'Great playing today!', es: '¡Jugaste muy bien hoy!' }]);
  }, []);
  return (
    <div className="break-screen" data-testid="break-screen">
      <div className="break-art" aria-hidden>
        <span className="moon">🌙</span>
        <span className="z">💤</span>
        <span className="sleepy">🐻</span>
        <span className="sleepy b">🦁</span>
      </div>
      <h1><Bi ph={UI.breakTime} mode={lang} /></h1>
      <button className="parent-lock big" onClick={onGrownUp} aria-label="Grown-ups" data-testid="break-parent">
        🔒
      </button>
    </div>
  );
}
