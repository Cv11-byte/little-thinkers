// Pop & Tap: "Pop 3 red balloons!" There are exactly 3 red ones.
// A tray at the top fills one slot per correct pop, so the count is visible.
// Themes rotate each round: balloons, soccer balls, footballs.

import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { COLORS, type ColorId, p } from '../../engine/i18n';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

const PALETTE: ColorId[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink'];
export type Theme = 'balloon' | 'soccer' | 'football';
export const THEMES: Theme[] = ['balloon', 'soccer', 'football'];

export const THING: Record<Theme, { en: [string, string]; es: [string, string]; verbEn: string; verbEs: string }> = {
  balloon: { en: ['balloon', 'balloons'], es: ['globo', 'globos'], verbEn: 'Pop', verbEs: 'Revienta' },
  soccer: { en: ['soccer ball', 'soccer balls'], es: ['balón', 'balones'], verbEn: 'Tap', verbEs: 'Toca' },
  football: { en: ['football', 'footballs'], es: ['balón', 'balones'], verbEn: 'Tap', verbEs: 'Toca' },
};

/** level → [targets, total objects, colors] */
const REVEAL_MS = 260;
const COUNT_MS = 480;

const SIZES: Record<number, [number, number, number]> = { 1: [2, 6, 2], 2: [3, 10, 4], 3: [4, 12, 5], 4: [5, 14, 6] };

export function popPlan(level: number, sessionSeed: number, round: number) {
  const rng = makeRng(sessionSeed * 7 + round * 131 + level);
  const [nTarget, nTotal, nColors] = SIZES[Math.min(4, Math.max(1, level))];
  // a different color every round of the session
  const order = shuffle(PALETTE, makeRng(sessionSeed));
  const target = order[round % order.length];
  const others = shuffle(
    PALETTE.filter((c) => c !== target),
    rng,
  ).slice(0, nColors - 1);
  const rest = Array.from({ length: nTotal - nTarget }, (_, i) => others[i % others.length]);
  const colors = shuffle([...Array<ColorId>(nTarget).fill(target), ...rest], rng);
  const theme = THEMES[(sessionSeed + round) % THEMES.length];
  return { target, nTarget, colors, theme, drifting: level >= 4 };
}

interface Thing {
  id: number;
  color: ColorId;
  x: number;
  y: number;
  popped: boolean;
  wiggle: number;
}

function PopBalloons({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => popPlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  const n = plan.colors.length;
  const trayH = 120;
  const fieldTop = trayH + 10;
  const cols = W >= H ? Math.min(n, n <= 6 ? 3 : n <= 10 ? 5 : n <= 12 ? 6 : 7) : Math.min(n, n <= 6 ? 2 : n <= 12 ? 3 : 4);
  const rows = Math.ceil(n / cols);
  const cellW = W / cols;
  const cellH = (H - fieldTop - 10) / rows;
  const r = Math.min(cellW * 0.36, cellH * (plan.theme === 'balloon' ? 0.3 : 0.38), 105);

  const [things, setThings] = useState<Thing[]>(() => {
    const rng = makeRng(api.seed + 3);
    return plan.colors.map((color, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = row === rows - 1 ? n - row * cols : cols;
      const shift = ((cols - rowCount) * cellW) / 2;
      return {
        id: i,
        color,
        x: shift + cellW * col + cellW / 2 + (rng() - 0.5) * cellW * 0.18,
        y: fieldTop + cellH * row + cellH * (plan.theme === 'balloon' ? 0.4 : 0.5) + (rng() - 0.5) * cellH * 0.1,
        popped: false,
        wiggle: 0,
      };
    });
  });
  const ref = useRef(things);
  ref.current = things;
  const [got, setGot] = useState(0);
  const gotRef = useRef(0);
  const [done, setDone] = useState(false);
  /** objects float in one by one; only shown ones can be tapped */
  const [shown, setShown] = useState(0);
  /** after the last pop, the tray counts itself: 1, 2, 3 */
  const [counted, setCounted] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const wrongs = useRef(0);
  const t = THING[plan.theme];
  const c = COLORS[plan.target];

  useEffect(() => {
    void api.instruct(
      L.pop(t.verbEn, t.verbEs, plan.nTarget, plan.target, t.en[1], t.es[1]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (let i = 1; i <= n; i++) {
      later(() => {
        setShown(i);
        sfx.tap();
      }, 350 + i * REVEAL_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api.hint) return;
    setHintOn(true);
    const tm = window.setTimeout(() => setHintOn(false), 4000);
    return () => window.clearTimeout(tm);
  }, [api.hint]);

  const tap = (b: Thing) => {
    if (b.popped || done || b.id >= shown) return;
    if (b.color !== plan.target) {
      sfx.nope();
      wrongs.current += 1;
      setThings((list) => list.map((x) => (x.id === b.id ? { ...x, wiggle: x.wiggle + 1 } : x)));
      // stay quiet on the first slip; after that a short reminder of the color
      void api.mistake(wrongs.current === 1 ? false : L.findColor(plan.target));
      return;
    }
    if (plan.theme === 'balloon') sfx.pop();
    else sfx.snap();
    bursts.add(makeBurst(b.x, b.y, c.hex));
    setThings((list) => list.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    gotRef.current += 1;
    setGot(gotRef.current);
    later(() => sfx.count(gotRef.current - 1), 120);
    if (gotRef.current === plan.nTarget) {
      setDone(true);
      // slow, satisfying finish: count the tray 1-2-3, the others float away, then next round
      for (let k = 1; k <= plan.nTarget; k++) {
        later(() => {
          setCounted(k);
          sfx.count(k - 1);
        }, 700 + k * COUNT_MS);
      }
      later(() => api.solved(), 700 + plan.nTarget * COUNT_MS + 1500);
    }
  };

  // tray of slots, one per object to find
  const slot = Math.min(84, (W - 80) / plan.nTarget - 14);
  const trayW = plan.nTarget * (slot + 14) + 30;

  return (
    <g data-testid="balloons" data-target={plan.target} data-theme={plan.theme} data-need={plan.nTarget} data-got={got}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={plan.theme === 'balloon' ? '#BFE3FF' : '#CDEFC2'} />
          <stop offset="1" stopColor={plan.theme === 'balloon' ? '#EAF6FF' : '#9ED38C'} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx={28} fill="url(#sky)" />
      {plan.theme === 'balloon' ? (
        <>
          <Cloud x={W * 0.15} y={H * 0.88} s={1} />
          <Cloud x={W * 0.82} y={H * 0.93} s={0.8} />
        </>
      ) : (
        <Field W={W} H={H} />
      )}
      {/* tray */}
      <g transform={`translate(${(W - trayW) / 2} 14)`}>
      <g className={done ? 'tray-done' : ''} style={{ transformOrigin: `${trayW / 2}px 50px` }}>
        <rect width={trayW} height={slot + 26} rx={(slot + 26) / 2} fill="#fff" opacity={0.92} stroke={done ? '#F7C431' : '#fff'} strokeWidth={done ? 8 : 0} />
        {Array.from({ length: plan.nTarget }, (_, i) => {
          const cx = 15 + i * (slot + 14) + (slot + 14) / 2;
          const cy = (slot + 26) / 2;
          const filled = i < got;
          const counting = i < counted;
          return (
            <g key={i} transform={`translate(${cx} ${cy})`} data-testid="tray-slot" data-filled={filled}>
            <g key={counting ? 'c' : 'n'} className={counting ? 'bounce' : ''}>
              <circle r={slot / 2} fill={filled ? c.hex : 'none'} stroke={filled ? c.dark : '#C9D3DC'} strokeWidth={4} strokeDasharray={filled ? 'none' : '6 6'} className={filled ? 'pop-in' : ''} />
              {filled && !counting && <path d={`M ${-slot * 0.2} 0 L ${-slot * 0.04} ${slot * 0.16} L ${slot * 0.22} ${-slot * 0.16}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" className="pop-in" />}
              {counting && (
                <text fontSize={slot * 0.55} fontWeight={900} fill="#fff" textAnchor="middle" dominantBaseline="central">
                  {i + 1}
                </text>
              )}
              {!filled && (
                <text fontSize={slot * 0.42} fontWeight={800} fill="#B8C4CF" textAnchor="middle" dominantBaseline="central">
                  {i + 1}
                </text>
              )}
            </g>
            </g>
          );
        })}
      </g>
      </g>
      {things.filter((b) => b.id < shown).map((b) => (
        <g
          key={b.id}
          className={'balloon' + (b.popped ? ' popped' : '') + (done && !b.popped ? ' fly' : '')}
          style={{ transformOrigin: `${b.x}px ${b.y}px`, animationDelay: done ? `${(700 + plan.nTarget * COUNT_MS) / 1000}s` : undefined }}
          data-testid={`balloon-${b.color}`}
          data-popped={b.popped}
          onPointerDown={(e) => {
            e.preventDefault();
            tap(b);
          }}
        >
          <g className="reveal">
            <g className={plan.drifting ? 'drift' : 'bob'} style={{ animationDelay: `${-(b.id % 5) * 0.7}s`, transformOrigin: `${b.x}px ${b.y}px` }}>
              <g key={b.wiggle} className={b.wiggle ? 'wiggle' : ''} style={{ transformOrigin: `${b.x}px ${b.y}px` }}>
                {hintOn && !b.popped && b.color === plan.target && <circle cx={b.x} cy={b.y} r={r * 1.25} className="glow-ring" data-testid="hint-glow" />}
                <Thing theme={plan.theme} x={b.x} y={b.y} r={r} color={b.color} />
                {/* generous invisible hit area for small fingers */}
                <rect x={b.x - r * 1.1} y={b.y - r * 1.15} width={r * 2.2} height={r * 2.4} fill="transparent" />
              </g>
            </g>
          </g>
        </g>
      ))}
      {bursts.layer}
    </g>
  );
}

function Thing({ theme, x, y, r, color }: { theme: Theme; x: number; y: number; r: number; color: ColorId }) {
  const c = COLORS[color];
  if (theme === 'balloon') {
    return (
      <g>
        <path d={`M ${x} ${y + r} q ${-r * 0.2} ${r * 0.35} 0 ${r * 0.7} t 0 ${r * 0.6}`} stroke="#8A8A8A" strokeWidth={3} fill="none" />
        <ellipse cx={x} cy={y} rx={r * 0.86} ry={r} fill={c.hex} />
        <ellipse cx={x + r * 0.2} cy={y + r * 0.25} rx={r * 0.6} ry={r * 0.72} fill={c.dark} opacity={0.18} />
        <ellipse cx={x - r * 0.3} cy={y - r * 0.38} rx={r * 0.18} ry={r * 0.3} fill="#fff" opacity={0.5} transform={`rotate(-25 ${x - r * 0.3} ${y - r * 0.38})`} />
        <path d={`M ${x - r * 0.12} ${y + r + 10} L ${x} ${y + r - 4} L ${x + r * 0.12} ${y + r + 10} Z`} fill={c.dark} />
      </g>
    );
  }
  if (theme === 'soccer') {
    // classic ball: a center pentagon and five half-patches, tinted the ball's color
    const pent = (cx: number, cy: number, rr: number, rot: number) =>
      Array.from({ length: 5 }, (_, k) => {
        const a = rot + (k * 2 * Math.PI) / 5 - Math.PI / 2;
        return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
      }).join(' ');
    return (
      <g>
        <ellipse cx={x} cy={y + r * 0.98} rx={r * 0.7} ry={r * 0.14} fill="#000" opacity={0.12} />
        <circle cx={x} cy={y} r={r} fill="#fff" stroke={c.dark} strokeWidth={4} />
        <polygon points={pent(x, y, r * 0.32, 0)} fill={c.hex} />
        {Array.from({ length: 5 }, (_, k) => {
          const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(a) * r * 0.88;
          const py = y + Math.sin(a) * r * 0.88;
          return (
            <g key={k}>
              <line x1={x + Math.cos(a) * r * 0.32} y1={y + Math.sin(a) * r * 0.32} x2={x + Math.cos(a) * r * 0.62} y2={y + Math.sin(a) * r * 0.62} stroke={c.dark} strokeWidth={3} />
              <polygon points={pent(px, py, r * 0.28, Math.PI + a + Math.PI / 2)} fill={c.hex} clipPath="none" />
            </g>
          );
        })}
        <circle cx={x} cy={y} r={r} fill="none" stroke={c.dark} strokeWidth={5} />
        <ellipse cx={x - r * 0.35} cy={y - r * 0.42} rx={r * 0.2} ry={r * 0.12} fill="#fff" opacity={0.7} transform={`rotate(-30 ${x - r * 0.35} ${y - r * 0.42})`} />
      </g>
    );
  }
  // football
  return (
    <g transform={`rotate(-28 ${x} ${y})`}>
      <ellipse cx={x} cy={y + r * 0.62} rx={r * 0.8} ry={r * 0.12} fill="#000" opacity={0.1} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill={c.hex} stroke={c.dark} strokeWidth={5} />
      <path d={`M ${x - r * 0.72} ${y - r * 0.3} Q ${x - r * 0.62} ${y} ${x - r * 0.72} ${y + r * 0.3}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d={`M ${x + r * 0.72} ${y - r * 0.3} Q ${x + r * 0.62} ${y} ${x + r * 0.72} ${y + r * 0.3}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" />
      <line x1={x - r * 0.32} y1={y - r * 0.2} x2={x + r * 0.32} y2={y - r * 0.2} stroke="#fff" strokeWidth={6} strokeLinecap="round" />
      {[-0.2, -0.07, 0.07, 0.2].map((k) => (
        <line key={k} x1={x + r * k} y1={y - r * 0.3} x2={x + r * k} y2={y - r * 0.1} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      ))}
      <ellipse cx={x - r * 0.35} cy={y - r * 0.28} rx={r * 0.22} ry={r * 0.08} fill="#fff" opacity={0.4} />
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g fill="#fff" opacity={0.9} transform={`translate(${x} ${y}) scale(${s})`} pointerEvents="none">
      <ellipse cx={0} cy={0} rx={90} ry={40} />
      <ellipse cx={-50} cy={10} rx={60} ry={32} />
      <ellipse cx={55} cy={8} rx={60} ry={30} />
    </g>
  );
}

function Field({ W, H }: { W: number; H: number }) {
  return (
    <g pointerEvents="none" opacity={0.5}>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={(i * W) / 6} y={0} width={W / 12} height={H} fill="#fff" opacity={0.12} />
      ))}
      <circle cx={W / 2} cy={H * 0.6} r={Math.min(W, H) * 0.22} fill="none" stroke="#fff" strokeWidth={6} opacity={0.6} />
      <line x1={W / 2} y1={130} x2={W / 2} y2={H} stroke="#fff" strokeWidth={6} opacity={0.6} />
    </g>
  );
}

export const popBalloons: GameDef = {
  id: 'pop-balloons',
  title: p('Pop & Tap', 'Revienta y Toca'),
  icon: '🎈',
  skill: p('Colors & counting', 'Colores y contar'),
  tint: '#E8524A',
  rounds: () => 3,
  adaptive: true,
  Component: PopBalloons,
};
