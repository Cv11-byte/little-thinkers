import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { num, p } from '../../engine/i18n';
import { getSpeechMode } from '../../engine/speech';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { useDrag } from '../../engine/useDrag';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';
import { GLYPH_H, GLYPH_W, NUMBER_STROKES, type Pt2, advance, nearHead, traceSettings } from './glyphs';

const STEP = 8; // sample spacing in glyph units
const COUNT_ITEMS = ['🌟', '🍎', '🐞', '🎈', '🐟', '🌸', '🍓', '🐥', '⚽', '🦋'];

function TraceNumbers({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const cfg = traceSettings(api.level);
  // continue from the next number this child hasn't traced yet
  const cursor = useRef(api.memory.get('next') ?? 0).current;
  const n = cfg.numbers[cursor % cfg.numbers.length];
  const strokes = NUMBER_STROKES[n];

  const landscape = W >= H;
  const s = landscape ? Math.min((W * 0.5) / GLYPH_W, (H * 0.94) / GLYPH_H) : Math.min((W * 0.85) / GLYPH_W, (H * 0.6) / GLYPH_H);
  const gx = landscape ? W * 0.36 - (GLYPH_W * s) / 2 : W / 2 - (GLYPH_W * s) / 2;
  const gy = landscape ? H / 2 - (GLYPH_H * s) / 2 : H * 0.05;

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [samples, setSamples] = useState<Pt2[][]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [stroke, setStroke] = useState(0);
  const [idx, setIdx] = useState(0);
  const [fracs, setFracs] = useState<number[]>(() => strokes.map(() => 0));
  const [finished, setFinished] = useState(false);
  const [shown, setShown] = useState(0); // counting objects shown
  const state = useRef({ stroke: 0, idx: 0, finished: false, lastSound: 0, engaged: false });
  const [engaged, setEngaged] = useState(false);

  useLayoutEffect(() => {
    const all: Pt2[][] = [];
    const lens: number[] = [];
    pathRefs.current.forEach((el) => {
      if (!el || typeof el.getTotalLength !== 'function') {
        all.push([]);
        lens.push(1);
        return;
      }
      const len = el.getTotalLength();
      const pts: Pt2[] = [];
      for (let d = 0; d <= len; d += STEP) {
        const q = el.getPointAtLength(d);
        pts.push({ x: q.x, y: q.y });
      }
      all.push(pts);
      lens.push(len);
    });
    setSamples(all);
    setLengths(lens);
  }, [n]);

  useEffect(() => {
    void api.instruct(L.traceNumber(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishStroke = (si: number, startFrac: number) => {
    // close the tiny gap left at the very end
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 150);
      setFracs((f) => f.map((v, i) => (i === si ? startFrac + (1 - startFrac) * k : v)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    sfx.snap();
    state.current.engaged = false;
    setEngaged(false);
    if (si + 1 < strokes.length) {
      state.current.stroke = si + 1;
      state.current.idx = 0;
      setStroke(si + 1);
      setIdx(0);
    } else {
      state.current.finished = true;
      setFinished(true);
      later(() => celebrate(), 400);
    }
  };

  const celebrate = () => {
    sfx.win();
    bursts.add(makeBurst(gx + (GLYPH_W * s) / 2, gy + (GLYPH_H * s) / 2, '#F7C431', true));
    void api.say(num(n)).then(() => countUp(1));
  };

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

  const toGlyph = (x: number, y: number) => ({ x: (x - gx) / s, y: (y - gy) / s });

  /** Finger down: it only starts tracing if it touches the star. */
  const onDown = (x: number, y: number) => {
    const st = state.current;
    if (st.finished || !samples.length) return;
    const pts = samples[st.stroke];
    if (!pts?.length) return;
    st.engaged = nearHead(pts, st.idx, toGlyph(x, y), cfg.tolerance);
    setEngaged(st.engaged);
    if (st.engaged) sfx.tap();
  };

  const onFinger = (x: number, y: number) => {
    const st = state.current;
    if (st.finished || !st.engaged || !samples.length) return;
    const pts = samples[st.stroke];
    if (!pts?.length) return;
    const ni = advance(pts, st.idx, toGlyph(x, y), cfg.tolerance, cfg.lookAhead);
    if (ni === st.idx) return;
    st.idx = ni;
    setIdx(ni);
    const frac = ni / (pts.length - 1);
    setFracs((f) => f.map((v, i) => (i === st.stroke ? frac : v)));
    if (ni - st.lastSound >= 3 || ni < st.lastSound) {
      st.lastSound = ni;
      sfx.trace(frac);
    }
    // only finishes when the finger really reaches the end of the line
    if (frac >= cfg.finishAt) {
      st.lastSound = 0;
      finishStroke(st.stroke, frac);
    }
  };

  const onUp = () => {
    state.current.engaged = false;
    setEngaged(false);
  };

  const bind = useDrag({
    onStart(_id, pt) {
      onDown(pt.x, pt.y);
    },
    onMove(_id, pt) {
      onFinger(pt.x, pt.y);
    },
    onEnd() {
      onUp();
    },
  });

  // hint: a hand that slides along the next part of the path
  const [hintKey, setHintKey] = useState(0);
  useEffect(() => {
    if (api.hint) setHintKey(api.hint);
  }, [api.hint]);

  const head = samples[stroke]?.[idx] ?? null;
  const nextHint = samples[stroke]?.[Math.min(idx + 18, (samples[stroke]?.length ?? 1) - 1)] ?? null;
  const item = COUNT_ITEMS[(n - 1) % COUNT_ITEMS.length];

  // counting objects area
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

  return (
    <g {...bind('trace')} data-testid="trace" data-number={n} data-finished={finished}>
      <rect width={W} height={H} rx={28} fill="#FFF7E8" />
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <g transform={`translate(${gx} ${gy}) scale(${s})`}>
        {strokes.map((d, i) => (
          <path key={'bg' + i} d={d} stroke="#E9DFCC" strokeWidth={84} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {strokes.map((d, i) => (
          <path key={'g' + i} d={d} stroke="#fff" strokeWidth={8} strokeDasharray="2 22" fill="none" strokeLinecap="round" opacity={0.9} />
        ))}
        {strokes.map((d, i) => {
          const len = lengths[i] ?? 1;
          return (
            <g key={'f' + i}>
              <path d={d} stroke="#FFD54A" strokeWidth={96} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" opacity={0.85} strokeDasharray={`${len * fracs[i]} ${len * 2}`} />
              <path d={d} stroke="#F5A623" strokeWidth={64} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len * fracs[i] + 0.001} ${len * 2}`} />
            </g>
          );
        })}
        {/* measuring paths (invisible) */}
        {strokes.map((d, i) => (
          <path
            key={'m' + i}
            d={d}
            fill="none"
            stroke="none"
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
          />
        ))}
        {/* which way to go: a few dots ahead of the star, and a flag at the end of the line */}
        {!finished &&
          samples[stroke] &&
          [5, 10, 15].map((k, i) => {
            const q = samples[stroke][idx + k];
            return q ? <circle key={k} cx={q.x} cy={q.y} r={14 - i * 3} fill="#4CB86A" opacity={0.75 - i * 0.2} className="lead-dot" style={{ animationDelay: `${i * 0.15}s` }} /> : null;
          })}
        {!finished && samples[stroke]?.length ? (
          <text x={samples[stroke][samples[stroke].length - 1].x} y={samples[stroke][samples[stroke].length - 1].y} fontSize={60} textAnchor="middle" dominantBaseline="central" opacity={0.85}>
            🏁
          </text>
        ) : null}
        {/* the star the child drags along the line */}
        {!finished && head && (
          <g className="trace-star" style={{ transform: `translate(${head.x}px, ${head.y}px)` }} data-testid="trace-head" data-engaged={engaged}>
            <circle r={engaged ? 58 : 50} fill="#4CB86A" className={engaged ? '' : 'pulse'} opacity={engaged ? 0.95 : 0.85} />
            <text fontSize={engaged ? 66 : 58} textAnchor="middle" dominantBaseline="central">
              ⭐
            </text>
          </g>
        )}
        {!finished && hintKey > 0 && head && nextHint && (
          <text
            key={hintKey}
            className="hint-hand"
            fontSize={110}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ '--hx1': `${head.x + 30}px`, '--hy1': `${head.y + 50}px`, '--hx2': `${nextHint.x + 30}px`, '--hy2': `${nextHint.y + 50}px` } as CSSProperties}
            data-testid="hint-hand"
          >
            👆
          </text>
        )}
      </g>
      {Array.from({ length: shown }, (_, i) => {
        const q = objPos(i);
        return <Emoji key={i} ch={item} x={q.x} y={q.y} size={objSize * 0.85} className="pop-in" />;
      })}
      {bursts.layer}
    </g>
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
