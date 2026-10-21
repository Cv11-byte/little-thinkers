// Trace Numbers: trace 1–10 with a finger, then count that many things.
import { useEffect, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { num, p } from '../../engine/i18n';
import { getSpeechMode } from '../../engine/speech';
import { sfx } from '../../engine/sfx';
import { useTimers } from '../../engine/stage';
import { Emoji } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';
import { NUMBER_STROKES, traceSettings } from './glyphs';
import { TraceCore } from './TraceCore';

const COUNT_ITEMS = ['🌟', '🍎', '🐞', '🎈', '🐟', '🌸', '🍓', '🐥', '⚽', '🦋'];

function TraceNumbers({ api }: { api: RoundApi }) {
  const later = useTimers();
  const cfg = traceSettings(api.level);
  // continue from the next number this child hasn't traced yet
  const cursor = useRef(api.memory.get('next') ?? 0).current;
  const n = cfg.numbers[cursor % cfg.numbers.length];
  const [shown, setShown] = useState(0); // counting objects shown

  useEffect(() => {
    void api.instruct(L.traceNumber(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countUp = (i: number) => {
    if (i > n) {
      api.memory.set('next', (cursor + 1) % cfg.numbers.length);
      later(() => api.solved(), 500);
      return;
    }
    setShown(i);
    sfx.count(i - 1);
    void api.say(num(i));
    later(() => countUp(i + 1), getSpeechMode() === 'both' ? 1150 : 750);
  };

  const item = COUNT_ITEMS[(n - 1) % COUNT_ITEMS.length];

  return (
    <TraceCore
      api={api}
      glyphKey={String(n)}
      strokes={NUMBER_STROKES[n]}
      cfg={cfg}
      data={{ number: n }}
      onTraced={() => void api.say(num(n)).then(() => countUp(1))}
      side={({ W, H, landscape }) => {
        const objSize = Math.min(110, landscape ? H / 6.2 : W / 6.5);
        const objPos = (i: number) => {
          if (landscape) {
            const cols = n > 5 ? 2 : 1;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const rowsN = Math.ceil(n / cols);
            const x0 = W * 0.78 - ((cols - 1) * objSize * 1.1) / 2;
            const y0 = H / 2 - ((rowsN - 1) * objSize * 1.05) / 2;
            return { x: x0 + col * objSize * 1.1, y: y0 + row * objSize * 1.05 };
          }
          const cols = Math.min(n, 5);
          const col = i % cols;
          const row = Math.floor(i / cols);
          return { x: W / 2 + (col - (cols - 1) / 2) * objSize * 1.1, y: H * 0.74 + row * objSize * 1.1 };
        };
        return Array.from({ length: shown }, (_, i) => {
          const q = objPos(i);
          return <Emoji key={i} ch={item} x={q.x} y={q.y} size={objSize * 0.85} className="pop-in" />;
        });
      }}
    />
  );
}

export const traceNumbers: GameDef = {
  id: 'trace-numbers',
  title: p('Trace Numbers', 'Traza Números'),
  icon: '✍️',
  skill: p('Numbers & finger control', 'Números y motricidad fina'),
  tint: '#F5A623',
  rounds: (level) => (level <= 1 ? 3 : 4),
  adaptive: true,
  Component: TraceNumbers,
};
