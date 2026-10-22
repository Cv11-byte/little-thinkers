// The finger-tracing engine shared by Trace Numbers and Trace Letters.
// The child must touch the star and drag it along the line, all the way to its star-shaped home.

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { useDrag } from '../../engine/useDrag';
import { makeBurst, useBursts } from '../../components/fx';
import type { RoundApi } from '../types';
import { shapePath } from '../shapes/shapes';
import { GLYPH_H, GLYPH_W, type Pt2, type TraceSettings, advance, nearHead } from './glyphs';

const STEP = 8; // sample spacing in glyph units

export interface TraceLayout {
  W: number;
  H: number;
  landscape: boolean;
  /** glyph box on the stage */
  gx: number;
  gy: number;
  s: number;
}

export function traceLayout(W: number, H: number): TraceLayout {
  const landscape = W >= H;
  const s = landscape ? Math.min((W * 0.5) / GLYPH_W, (H * 0.94) / GLYPH_H) : Math.min((W * 0.85) / GLYPH_W, (H * 0.6) / GLYPH_H);
  const gx = landscape ? W * 0.36 - (GLYPH_W * s) / 2 : W / 2 - (GLYPH_W * s) / 2;
  const gy = landscape ? H / 2 - (GLYPH_H * s) / 2 : H * 0.05;
  return { W, H, landscape, gx, gy, s };
}

interface Props {
  api: RoundApi;
  /** identifies the glyph (re-measures when it changes) */
  glyphKey: string;
  strokes: string[];
  cfg: TraceSettings;
  /** called once the last stroke reaches its end */
  onTraced: () => void;
  /** what to show beside the glyph (counting objects, a picture...) */
  side?: (layout: TraceLayout) => ReactNode;
  /** extra data-* attributes for tests */
  data?: Record<string, string | number>;
}

export function TraceCore({ api, glyphKey, strokes, cfg, onTraced, side, data }: Props) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const layout = traceLayout(W, H);
  const { gx, gy, s } = layout;

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [samples, setSamples] = useState<Pt2[][]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [stroke, setStroke] = useState(0);
  const [idx, setIdx] = useState(0);
  const [fracs, setFracs] = useState<number[]>(() => strokes.map(() => 0));
  const [finished, setFinished] = useState(false);
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
  }, [glyphKey]);

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
      later(() => {
        sfx.win();
        bursts.add(makeBurst(gx + (GLYPH_W * s) / 2, gy + (GLYPH_H * s) / 2, '#F7C431', true));
        onTraced();
      }, 400);
    }
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
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));

  return (
    <g {...bind('trace')} data-testid="trace" data-finished={finished} {...dataAttrs}>
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
        {/* stroke numbers, so the order is clear when a letter has several lines */}
        {strokes.length > 1 &&
          !finished &&
          samples.map((pts, i) =>
            pts.length && i > stroke ? (
              <g key={'n' + i} transform={`translate(${pts[0].x} ${pts[0].y})`} opacity={0.55}>
                <circle r={26} fill="#C9B994" />
                <text fontSize={32} fontWeight={900} fill="#fff" textAnchor="middle" dominantBaseline="central">
                  {i + 1}
                </text>
              </g>
            ) : null,
          )}
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
        {/* the star's "home": a star-shaped slot at the end of the line, so it's clear where to drag it */}
        {!finished && samples[stroke]?.length ? (
          <g transform={`translate(${samples[stroke][samples[stroke].length - 1].x} ${samples[stroke][samples[stroke].length - 1].y})`} data-testid="trace-goal" pointerEvents="none">
            <g className="goal-pulse">
              <circle r={62} fill="#FFF3C4" opacity={0.85} />
              <path d={shapePath('star', 50)} fill="#FFFBEA" stroke="#F5A623" strokeWidth={7} strokeDasharray="14 9" strokeLinejoin="round" />
            </g>
          </g>
        ) : null}
        {/* the star the child drags along the line */}
        {!finished && head && (
          <g className="trace-star" transform={`translate(${head.x} ${head.y})`} data-testid="trace-head" data-engaged={engaged}>
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
      {side?.(layout)}
      {bursts.layer}
    </g>
  );
}
