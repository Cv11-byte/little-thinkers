// Difficulty button for the top-right corner. Opens with a short hold (so a toddler
// tap doesn't change it), then shows big choices: Auto, Easy, Medium, Hard, Expert.

import { useState } from 'react';
import { type LangMode, type Phrase, p } from '../engine/i18n';
import { ROUNDS_BY_LEVEL } from '../engine/storage';
import { sfx } from '../engine/sfx';
import { Bi } from './lang';
import { HoldButton } from './HoldButton';

export const LEVEL_NAMES: Record<number, Phrase> = {
  0: p('Auto', 'Auto'),
  1: p('Easy', 'Fácil'),
  2: p('Medium', 'Medio'),
  3: p('Hard', 'Difícil'),
  4: p('Expert', 'Experto'),
};

const LEVEL_NOTES: Record<number, Phrase> = {
  0: p('Each game moves up on its own', 'Cada juego sube solo'),
  1: p('Numbers to 5 · 2 choices', 'Números hasta 5 · 2 opciones'),
  2: p('Numbers to 10 · 3 choices', 'Números hasta 10 · 3 opciones'),
  3: p('More pieces · 4 choices', 'Más piezas · 4 opciones'),
  4: p('Look-alikes · longest puzzles', 'Parecidos · los más largos'),
};

export function LevelStars({ level }: { level: number }) {
  if (!level) return <span className="lvl-auto">A</span>;
  return (
    <span className="lvl-dots" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  );
}

export function LevelPicker({ level, onChange, lang, testId = 'level-picker' }: { level: number; onChange: (l: number) => void; lang: LangMode; testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <HoldButton className="level-btn" testId={testId} label="Difficulty (hold)" ms={700} onHold={() => setOpen(true)}>
        <LevelStars level={level} />
        <span className="level-btn-name">
          <Bi ph={LEVEL_NAMES[level]} mode={lang === 'both' ? 'es' : lang} />
        </span>
      </HoldButton>
      {open && (
        <div className="gate" data-testid={`${testId}-panel`} onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="level-panel">
            <h2>
              <Bi ph={p('How hard?', '¿Qué tan difícil?')} mode={lang} />
            </h2>
            {[0, 1, 2, 3, 4].map((l) => (
              <button
                key={l}
                className={'level-opt' + (l === level ? ' on' : '')}
                data-testid={`${testId}-${l}`}
                onClick={() => {
                  sfx.tap();
                  onChange(l);
                  setOpen(false);
                }}
              >
                <LevelStars level={l} />
                <span className="level-opt-text">
                  <b>
                    <Bi ph={LEVEL_NAMES[l]} mode={lang} />
                  </b>
                  <small>
                    <Bi ph={LEVEL_NOTES[l]} mode={lang === 'both' ? 'es' : lang} />
                  </small>
                </span>
                {l > 0 && <span className="level-opt-stars">{'⭐'.repeat(ROUNDS_BY_LEVEL[l])}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
