// Shared visual effects drawn inside the SVG stage.

import { useEffect, useState, type CSSProperties } from 'react';
import { artFor } from '../engine/art';
import { DRAWN } from './drawn';

/**
 * Emoji drawn as SVG text, centered on (x, y).
 * If a picture was added for it (src/art/...), the picture is shown instead;
 * '#name' glyphs use a built-in drawing.
 */
export function Emoji({ ch, x, y, size, style, className, filter }: { ch: string; x: number; y: number; size: number; style?: CSSProperties; className?: string; filter?: string }) {
  const url = artFor(ch);
  if (url) {
    const s = size * 1.08;
    return <image href={url} x={x - s / 2} y={y - s / 2} width={s} height={s} className={'art ' + (className ?? '')} style={style} filter={filter} preserveAspectRatio="xMidYMid meet" />;
  }
  const draw = DRAWN[ch];
  if (draw) {
    return (
      <g className={className} style={style} filter={filter}>
        <g transform={`translate(${x} ${y}) scale(${size / 100})`}>{draw()}</g>
      </g>
    );
  }
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      className={'emoji ' + (className ?? '')}
      style={style}
      filter={filter}
    >
      {ch}
    </text>
  );
}

let burstId = 0;
export interface BurstItem {
  id: number;
  x: number;
  y: number;
  color: string;
  big?: boolean;
}
export const makeBurst = (x: number, y: number, color: string, big = false): BurstItem => ({ id: ++burstId, x, y, color, big });

const PALETTE = ['#F7C431', '#E8524A', '#3D8BE8', '#4CB86A', '#9B6BD6', '#F58A3A'];

/** A ring of particles + stars flying out from a point. */
export function Burst({ b }: { b: BurstItem }) {
  const n = b.big ? 18 : 10;
  const r = b.big ? 260 : 140;
  return (
    <g pointerEvents="none" transform={`translate(${b.x} ${b.y})`}>
      <circle r={b.big ? 90 : 50} className="burst-ring" stroke={b.color} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (b.id % 7) * 0.3;
        const d = r * (0.7 + ((i * 37) % 10) / 30);
        const style = { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px`, animationDelay: `${(i % 3) * 30}ms` } as CSSProperties;
        return i % 3 === 0 ? (
          <text key={i} className="burst-p" style={style} fontSize={b.big ? 46 : 32} textAnchor="middle" dominantBaseline="central">
            ⭐
          </text>
        ) : (
          <circle key={i} className="burst-p" style={style} r={b.big ? 14 : 10} fill={i % 2 ? b.color : PALETTE[i % PALETTE.length]} />
        );
      })}
    </g>
  );
}

/** Keeps a list of bursts and removes each after it finishes. */
export function useBursts() {
  const [items, setItems] = useState<BurstItem[]>([]);
  const add = (b: BurstItem) => {
    setItems((s) => [...s, b]);
    window.setTimeout(() => setItems((s) => s.filter((x) => x.id !== b.id)), 1100);
  };
  const layer = (
    <g className="burst-layer">
      {items.map((b) => (
        <Burst key={b.id} b={b} />
      ))}
    </g>
  );
  return { add, layer };
}

/** A pointing hand that glides from (x1,y1) to (x2,y2), used for hints. */
export function HintHand({ x1, y1, x2, y2, show }: { x1: number; y1: number; x2: number; y2: number; show: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(t);
  }, [show]);
  if (!visible) return null;
  const style = { '--hx1': `${x1}px`, '--hy1': `${y1}px`, '--hx2': `${x2}px`, '--hy2': `${y2}px` } as CSSProperties;
  return (
    <g pointerEvents="none" data-testid="hint-hand">
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="hint-line" />
      <text key={show} className="hint-hand" style={style} fontSize={90} textAnchor="middle" dominantBaseline="central">
        👆
      </text>
    </g>
  );
}

/** A soft pulsing glow ring used to highlight the right answer. */
export function Glow({ x, y, r, show }: { x: number; y: number; r: number; show: boolean }) {
  if (!show) return null;
  return <circle cx={x} cy={y} r={r} className="glow-ring" pointerEvents="none" data-testid="hint-glow" />;
}
