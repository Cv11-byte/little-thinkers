import { useEffect, useRef, useState } from 'react';
import { COLORS, type ColorId, num, p } from '../../engine/i18n';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { useDrag } from '../../engine/useDrag';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

type Kind = 'square' | 'wide' | 'roof' | 'window' | 'door';
interface BlockType {
  kind: Kind;
  w: number; // columns
  color: ColorId;
}
const TRAY: BlockType[] = [
  { kind: 'square', w: 1, color: 'red' },
  { kind: 'square', w: 1, color: 'blue' },
  { kind: 'wide', w: 2, color: 'yellow' },
  { kind: 'wide', w: 2, color: 'green' },
  { kind: 'window', w: 1, color: 'orange' },
  { kind: 'roof', w: 2, color: 'purple' },
];

interface Placed {
  id: number;
  t: BlockType;
  col: number;
  row: number;
}

/** Row a block of width w lands on when dropped at column col (gravity). */
export function landingRow(placed: { t: { w: number }; col: number; row: number }[], col: number, w: number): number {
  let row = 0;
  for (const b of placed) {
    const overlap = b.col < col + w && col < b.col + b.t.w;
    if (overlap) row = Math.max(row, b.row + 1);
  }
  return row;
}

function BlockGraphic({ t, b, x, y }: { t: BlockType; b: number; x: number; y: number }) {
  const c = COLORS[t.color];
  const w = t.w * b;
  if (t.kind === 'roof') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d={`M 4 ${b - 2} L ${w / 2} 6 L ${w - 4} ${b - 2} Z`} fill={c.hex} stroke={c.dark} strokeWidth={5} strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={3} y={3} width={w - 6} height={b - 6} rx={12} fill={c.hex} stroke={c.dark} strokeWidth={5} />
      <rect x={10} y={9} width={w - 20} height={b * 0.18} rx={6} fill="#fff" opacity={0.3} />
      {t.kind === 'window' && (
        <g>
          <rect x={b * 0.22} y={b * 0.22} width={b * 0.56} height={b * 0.56} rx={6} fill="#CFE8FF" stroke={c.dark} strokeWidth={4} />
          <line x1={b / 2} y1={b * 0.22} x2={b / 2} y2={b * 0.78} stroke={c.dark} strokeWidth={4} />
          <line x1={b * 0.22} y1={b / 2} x2={b * 0.78} y2={b / 2} stroke={c.dark} strokeWidth={4} />
        </g>
      )}
    </g>
  );
}

function BlockBuilder({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const landscape = W >= H;
  const cols = landscape ? 8 : 7;
  const trayW = landscape ? 230 : W;
  const trayH = landscape ? H : 190;
  const areaX = landscape ? trayW + 20 : 20;
  const areaW = landscape ? W - trayW - 40 : W - 40;
  const areaTop = landscape ? 90 : trayH + 80;
  const groundY = H - 40;
  const b = Math.min(areaW / cols, (groundY - areaTop) / 6);
  const maxRows = Math.floor((groundY - areaTop) / b);
  const gridX = areaX + (areaW - cols * b) / 2;

  const [placed, setPlaced] = useState<Placed[]>([]);
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const [ghost, setGhost] = useState<{ t: BlockType; x: number; y: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const nextId = useRef(1);
  const tapCol = useRef(Math.floor(cols / 2) - 1);

  // tray layout: squares sit side by side, wide pieces get their own row
  const trayPos = (i: number) => {
    if (landscape) {
      const rows: number[][] = [[0, 1], [2], [3], [4], [5]];
      const s = Math.min(90, (H - 60) / rows.length - 26);
      const rowGap = (H - 40) / rows.length;
      const r = rows.findIndex((x) => x.includes(i));
      const k = rows[r].indexOf(i);
      const t = TRAY[i];
      const rowW = rows[r].reduce((sum, j) => sum + TRAY[j].w * s, 0) + (rows[r].length - 1) * 16;
      const x0 = (trayW - rowW) / 2 + 4;
      const x = x0 + rows[r].slice(0, k).reduce((sum, j) => sum + TRAY[j].w * s + 16, 0);
      return { x: t.kind === 'window' ? (trayW - s) / 2 + 4 : x, y: 20 + r * rowGap + (rowGap - s) / 2, s };
    }
    const units = TRAY.reduce((sum, t) => sum + t.w, 0);
    const s = Math.min(90, (W - 40 - (TRAY.length - 1) * 14) / units);
    const x = 20 + TRAY.slice(0, i).reduce((sum, t) => sum + t.w * s + 14, 0);
    return { x, y: (trayH - s) / 2, s };
  };

  useEffect(() => {
    void api.instruct(
      api.level >= 3
        ? p('Build a house! Can you put a roof on top?', '¡Construye una casa! ¿Le pones un techo?')
        : p("Let's build! Drag the blocks.", '¡A construir! Arrastra los bloques.'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drop = (t: BlockType, colRaw: number) => {
    const col = Math.max(0, Math.min(cols - t.w, colRaw));
    const row = landingRow(placedRef.current, col, t.w);
    if (row >= maxRows) {
      sfx.nope();
      void api.say(p('Too tall! Try another spot.', '¡Muy alto! Prueba en otro lugar.'));
      return;
    }
    const blk: Placed = { id: nextId.current++, t, col, row };
    const next = [...placedRef.current, blk];
    placedRef.current = next;
    setPlaced(next);
    sfx.thud();
    later(() => sfx.count(Math.min(next.length - 1, 7)), 120);
    void api.say(next.length <= 10 ? num(next.length) : COLORS[t.color].name);
    bursts.add(makeBurst(gridX + (col + t.w / 2) * b, groundY - row * b - b / 2, COLORS[t.color].hex));
  };

  const bind = useDrag({
    onStart(id, pt) {
      if (finished) return false;
      const t = TRAY[Number(id)];
      setGhost({ t, x: pt.x, y: pt.y });
    },
    onMove(_id, pt) {
      setGhost((g) => (g ? { ...g, x: pt.x, y: pt.y } : g));
    },
    onEnd(id, pt, { tap }) {
      const t = TRAY[Number(id)];
      setGhost(null);
      if (tap) {
        // tap a block in the tray: it drops onto the building spot
        tapCol.current = (tapCol.current + 1) % (cols - t.w + 1);
        drop(t, Math.floor(cols / 2) - 1 + ((tapCol.current % 3) - 1));
        return;
      }
      const inside = pt.x > gridX - b && pt.x < gridX + cols * b + b && pt.y > areaTop - b && pt.y < groundY + 40;
      if (!inside) return;
      const col = Math.round((pt.x - gridX) / b - t.w / 2);
      drop(t, col);
    },
  });

  const undo = () => {
    const next = placedRef.current.slice(0, -1);
    placedRef.current = next;
    setPlaced(next);
    sfx.tap();
  };

  const done = () => {
    if (finished) return;
    setFinished(true);
    sfx.fanfare();
    bursts.add(makeBurst(gridX + (cols * b) / 2, groundY - b * 2, '#F7C431', true));
    void api.say(p('What a great building!', '¡Qué gran construcción!'));
    later(() => api.solved(), 2600);
  };

  // where the bear sits when finished: on the tallest column
  const top = placed.reduce<{ col: number; row: number }>((m, x) => (x.row + 1 > m.row ? { col: x.col + x.t.w / 2, row: x.row + 1 } : m), { col: cols / 2, row: 0 });

  return (
    <g data-testid="blocks" data-count={placed.length}>
      <rect width={W} height={H} rx={28} fill="#EAF4FB" />
      <Emoji ch="☀️" x={W - 70} y={70} size={70} />
      {/* tray */}
      <rect x={landscape ? 8 : 8} y={landscape ? 8 : 8} width={landscape ? trayW - 8 : W - 16} height={landscape ? H - 16 : trayH - 16} rx={28} fill="#FFF8EC" stroke="#E7DCC8" strokeWidth={4} />
      {TRAY.map((t, i) => {
        const tp = trayPos(i);
        return (
          <g key={i} {...bind(String(i))} data-testid={`tray-${i}`} className="tray-block">
            <rect x={tp.x - 10} y={tp.y - 10} width={t.w * tp.s + 20} height={tp.s + 20} fill="transparent" />
            <BlockGraphic t={t} b={tp.s} x={tp.x} y={tp.y} />
          </g>
        );
      })}
      {/* ground */}
      <rect x={gridX - 30} y={groundY} width={cols * b + 60} height={30} rx={14} fill="#8BC57A" />
      {placed.map((x) => (
        <g key={x.id} className="drop-in" style={{ transformOrigin: `${gridX + x.col * b}px ${groundY - x.row * b}px` }}>
          <BlockGraphic t={x.t} b={b} x={gridX + x.col * b} y={groundY - (x.row + 1) * b} />
        </g>
      ))}
      {finished && <Emoji ch="🐻" x={gridX + top.col * b} y={groundY - top.row * b - b * 0.45} size={b * 0.9} className="pop-in" />}
      {ghost && (
        <g pointerEvents="none" opacity={0.85}>
          <BlockGraphic t={ghost.t} b={b} x={ghost.x - (ghost.t.w * b) / 2} y={ghost.y - b / 2} />
        </g>
      )}
      {/* undo + done buttons */}
      {placed.length > 0 && !finished && (
        <g
          data-testid="undo"
          onPointerDown={(e) => {
            e.preventDefault();
            undo();
          }}
        >
          <circle cx={landscape ? trayW + 70 : 70} cy={landscape ? 60 : trayH + 50} r={44} fill="#fff" stroke="#E7DCC8" strokeWidth={4} />
          <Emoji ch="↩️" x={landscape ? trayW + 70 : 70} y={landscape ? 60 : trayH + 50} size={44} />
        </g>
      )}
      {placed.length >= 3 && !finished && (
        <g
          data-testid="done"
          className="pulse-soft"
          style={{ transformOrigin: `${W - 80}px ${landscape ? 170 : trayH + 50}px` }}
          onPointerDown={(e) => {
            e.preventDefault();
            done();
          }}
        >
          <circle cx={W - 80} cy={landscape ? 170 : trayH + 50} r={56} fill="#4CB86A" />
          <text x={W - 80} y={landscape ? 172 : trayH + 52} fontSize={64} fill="#fff" fontWeight={800} textAnchor="middle" dominantBaseline="central">
            ✓
          </text>
        </g>
      )}
      {bursts.layer}
    </g>
  );
}

export const blockBuilder: GameDef = {
  id: 'block-builder',
  title: p('Free Build', 'Construye Libre'),
  icon: '🧱',
  skill: p('Creativity & building', 'Creatividad y construir'),
  tint: '#F58A3A',
  rounds: () => 1,
  adaptive: false,
  Component: BlockBuilder,
};
