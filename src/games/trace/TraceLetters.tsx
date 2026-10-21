// Trace Letters: trace a capital letter, say its name together ("¡Dilo conmigo!"),
// then meet a picture word that starts with it: "¡A de avión!".
// Vowels first (levels 1–2), then the whole alphabet in order (Ñ included in Spanish).

import { useEffect, useRef, useState } from 'react';
import { p } from '../../engine/i18n';
import { getSpeechMode } from '../../engine/speech';
import { useTimers } from '../../engine/stage';
import { Emoji } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';
import { traceSettings } from './glyphs';
import { LETTER_STROKES, LETTER_WORDS, letterLines, letterSet } from './letters';
import { TraceCore } from './TraceCore';

function TraceLetters({ api }: { api: RoundApi }) {
  const later = useTimers();
  const cfg = traceSettings(api.level);
  const mode = getSpeechMode();
  const letters = letterSet(api.level, mode !== 'en');
  // vowels and the alphabet each remember where the child left off
  const memKey = letters.length === 5 ? 'nextVowel' : 'nextLetter';
  const cursor = useRef(api.memory.get(memKey) ?? 0).current;
  const letter = letters[cursor % letters.length];
  const word = LETTER_WORDS[letter];
  const [stage, setStage] = useState<'trace' | 'say' | 'word'>('trace');

  useEffect(() => {
    void api.instruct(letterLines.trace(letter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTraced = async () => {
    await api.say(letterLines.name(letter));
    setStage('say');
    await api.say(letterLines.sayIt(letter));
    // a moment for the child to say it out loud
    later(async () => {
      setStage('word');
      await api.say(letterLines.isFor(letter));
      api.memory.set(memKey, (cursor + 1) % letters.length);
      later(() => api.solved(), 600);
    }, 1800);
  };

  // which picture(s) to show: Z is "zebra" in English but "zapato" in Spanish
  const pics = word.esPic ? (mode === 'en' ? [word.pic] : mode === 'es' ? [word.esPic] : [word.esPic, word.pic]) : [word.pic];
  // one line per language (Spanish on top in "both", like the rest of the app)
  const labels = mode === 'en' ? [word.en] : mode === 'es' ? [word.es] : word.es === word.en ? [word.es] : [word.es, word.en];

  return (
    <TraceCore
      api={api}
      glyphKey={letter}
      strokes={LETTER_STROKES[letter]}
      cfg={cfg}
      data={{ letter }}
      onTraced={() => void onTraced()}
      side={({ W, H, landscape }) => {
        const cx = landscape ? W * 0.8 : W / 2;
        const cy = landscape ? H * 0.45 : H * 0.8;
        const size = Math.min(landscape ? W * 0.2 : H * 0.18, 230);
        return (
          <g data-testid="letter-side" data-stage={stage}>
            {stage === 'say' && (
              <g className="pop-in">
                <circle cx={cx} cy={cy} r={size * 0.62} fill="#fff" stroke="#F5A623" strokeWidth={8} />
                <Emoji ch="🗣️" x={cx} y={cy} size={size * 0.7} className="pulse" />
              </g>
            )}
            {stage === 'word' && (
              <g className="pop-in" data-testid="letter-word">
                {pics.map((pic, i) => (
                  <Emoji key={pic} ch={pic} x={cx + (i - (pics.length - 1) / 2) * size * 0.85} y={cy} size={pics.length > 1 ? size * 0.75 : size} />
                ))}
                {labels.map((t, i) => {
                  const fs = Math.min(44, size * 0.22, ((landscape ? W * 0.36 : W * 0.9) / Math.max(4, t.length + 2)) * 1.6);
                  return (
                    <text key={t} x={cx} y={cy + size * 0.68 + i * fs * 1.15} fontSize={i ? fs * 0.8 : fs} fontWeight={i ? 700 : 900} fill={i ? '#8A7A5E' : '#5A4A2E'} textAnchor="middle" dominantBaseline="hanging">
                      <tspan fill="#E8524A">{t.charAt(0).toUpperCase()}</tspan>
                      {t.slice(1)}
                    </text>
                  );
                })}
              </g>
            )}
          </g>
        );
      }}
    />
  );
}

export const traceLetters: GameDef = {
  id: 'trace-letters',
  title: p('Trace Letters', 'Traza Letras'),
  icon: '🔤',
  skill: p('Letters & first sounds', 'Letras y primeros sonidos'),
  tint: '#E8524A',
  rounds: (level) => (level <= 1 ? 2 : 3),
  adaptive: true,
  Component: TraceLetters,
};
