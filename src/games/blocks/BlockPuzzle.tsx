// Construir: a Tetris-style fitting puzzle. An outline (a house, a rocket, a truck...)
// and a few block pieces. Drag each piece into the outline so every square is filled.
// Placed pieces can be picked up again to fix a mistake (planning and trying again).
// At the top level pieces come turned the wrong way: tap a piece to turn it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { COLORS, type ColorId, type Phrase, p } from '../../engine/i18n';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { useDrag } from '../../engine/useDrag';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

type Cell = [number, number]; // [col, row]

interface Puzzle {
  name: Phrase;
  icon: string;
  /** one letter per piece, '.' = empty */
  grid: string;
}

const P = (en: string, es: string, icon: string, grid: string): Puzzle => ({ name: p(en, es), icon, grid });

export const PUZZLES: Record<number, Puzzle[]> = {
  1: [
    P('a window', 'una ventana', '🪟', 'AB\nAB'),
    P('a tower', 'una torre', '🗼', 'A\nA\nB\nB'),
    P('a wall', 'una pared', '🧱', 'AA\nBB'),
    P('some steps', 'una escalerita', '🪜', 'A.\nBB'),
  ],
  2: [
    P('a house', 'una casa', '🏠', '.A.\nBBB\nCCC'),
    P('some stairs', 'una escalera', '🪜', 'A..\nBB.\nCCC'),
    P('a table', 'una mesa', '🪑', 'AAA\nB.C\nB.C'),
    P('a bridge', 'un puente', '🌉', 'AAA\nB.C'),
  ],
  3: [
    P('a rocket', 'un cohete', '🚀', '.A.\n.A.\nBAC\nBDC\nBDC'),
    P('a house', 'una casa', '🏠', '.A.\nAAA\nBCC\nBDD'),
    P('a truck', 'un camión', '🚚', 'AA..\nAABB\nCCDD'),
    P('a tree', 'un árbol', '🌳', 'AAA\nBAC\n.D.\n.D.'),
  ],
  4: [
    P('a box', 'una caja', '📦', 'AABB\nACDB\nCCDD'),
    P('a castle', 'un castillo', '🏰', 'A.B\nACB\nCCC\nDDD'),
    P('a rocket', 'un cohete', '🚀', '.A.\nAAB\nCCB\nCDD'),
    P('a boat', 'un barco', '⛵', 'A..B\nACCB\nDDDD'),
  ],
};

const PIECE_COLORS: ColorId[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export function normalize(cells: Cell[]): Cell[] {
  const mc = Math.min(...cells.map((c) => c[0]));
  const mr = Math.min(...cells.map((c) => c[1]));
  return cells.map(([c, r]) => [c - mc, r - mr] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** turn a piece a quarter turn clockwise */
export function rotate(cells: Cell[]): Cell[] {
  const maxR = Math.max(...cells.map((c) => c[1]));
  return normalize(cells.map(([c, r]) => [maxR - r, c] as Cell));
}

export function parsePuzzle(pz: Puzzle) {
  const rows = pz.grid.split('\n');
  const outline: Cell[] = [];
  const byLetter = new Map<string, Cell[]>();
  rows.forEach((line, r) =>
    [...line].forEach((ch, c) => {
      if (ch === '.') return;
      outline.push([c, r]);
      byLetter.set(ch, [...(byLetter.get(ch) ?? []), [c, r]]);
    }),
  );
  const pieces = [...byLetter.entries()].map(([letter, cells], i) => {
    const n = normalize(cells);
    const at: Cell = [Math.min(...cells.map((c) => c[0])), Math.min(...cells.map((c) => c[1]))];
    return { letter, cells: n, solution: at, color: PIECE_COLORS[i % PIECE_COLORS.length] };
  });
  return { cols: Math.max(...rows.map((l) => l.length)), rows: rows.length, outline, pieces };
}

export function puzzlePlan(level: number, sessionSeed: number, round: number) {
  const lvl = Math.min(4, Math.max(1, level));
  const list = shuffle(PUZZLES[lvl], makeRng(sessionSeed + lvl));
  const pz = list[round % list.length];
  const parsed = parsePuzzle(pz);
  const rng = makeRng(sessionSeed * 5 + round * 31);
  // top level: pieces arrive turned; the child taps to turn them back
  const turns = parsed.pieces.map(() => (lvl >= 4 ? 1 + Math.floor(rng() * 3) : 0));
  return { puzzle: pz, ...parsed, turns, rotateOn: lvl >= 4 };
}

const key = (c: number, r: number) => `${c},${r}`;

interface PieceState {
  id: number;
  cells: Cell[];
  color: ColorId;
  /** board position (top-left cell) when placed */
  at: Cell | null;
  x: number;
  y: number;
  dragging: boolean;
  wrong: number;
}

function BlockPuzzle({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => puzzlePlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  const landscape = W >= H;

  // layout: board on the left (top in portrait), tray of pieces on the other side
  const boardW = landscape ? W * 0.5 : W * 0.9;
  const boardH = landscape ? H * 0.9 : H * 0.5;
  const cell = Math.min(115, boardW / plan.cols, boardH / plan.rows);
  const gridX = (landscape ? W * 0.04 : W * 0.05) + (boardW - cell * plan.cols) / 2;
  const gridY = (landscape ? H * 0.05 : H * 0.03) + (boardH - cell * plan.rows) / 2;
  const TRAY = 0.62; // pieces look smaller while waiting in the tray
  const n = plan.pieces.length;
  const trayCols = landscape ? 2 : Math.min(n, 4);
  const trayRows = Math.ceil(n / trayCols);
  const trayX0 = landscape ? W * 0.58 : W * 0.04;
  const trayY0 = landscape ? H * 0.06 : H * 0.57;
  const trayW = landscape ? W * 0.4 : W * 0.92;
  const trayH = landscape ? H * 0.88 : H * 0.4;
  const slotW = trayW / trayCols;
  const slotH = trayH / trayRows;

  const size = (cells: Cell[]) => ({ w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 });
  const home = (i: number, cells: Cell[]) => {
    const { w, h } = size(cells);
    const col = i % trayCols;
    const row = Math.floor(i / trayCols);
    return { x: trayX0 + slotW * col + (slotW - w * cell * TRAY) / 2, y: trayY0 + slotH * row + (slotH - h * cell * TRAY) / 2 };
  };

  const order = useMemo(() => shuffle(plan.pieces.map((_, i) => i), makeRng(api.seed + 9)), [api.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pieces, setPieces] = useState<PieceState[]>(() =>
    order.map((pi, slot) => {
      let cells = plan.pieces[pi].cells;
      for (let t = 0; t < plan.turns[pi]; t++) cells = rotate(cells);
      const h0 = home(slot, cells);
      return { id: pi, cells, color: plan.pieces[pi].color, at: null, x: h0.x, y: h0.y, dragging: false, wrong: 0 };
    }),
  );
  const ref = useRef(pieces);
  ref.current = pieces;
  const grab = useRef({ x: 0, y: 0 });
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState(false);
  const wrongs = useRef(0);
  const outlineSet = useMemo(() => new Set(plan.outline.map(([c, r]) => key(c, r))), [plan]);

  const update = (id: number, f: (p: PieceState) => PieceState) => setPieces((l) => l.map((x) => (x.id === id ? f(x) : x)));
  const slotOf = (id: number) => order.indexOf(id);

  useEffect(() => {
    void api.instruct([L_build(plan.puzzle.name), ...(plan.rotateOn ? [p('Tap a piece to turn it.', 'Toca una pieza para girarla.')] : [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  /** does the piece fit with its top-left at (c, r)? */
  const fits = (pc: PieceState, c: number, r: number, list: PieceState[]) => {
    const taken = new Set<string>();
    for (const o of list) if (o.id !== pc.id && o.at) for (const [dc, dr] of o.cells) taken.add(key(o.at[0] + dc, o.at[1] + dr));
    return pc.cells.every(([dc, dr]) => outlineSet.has(key(c + dc, r + dr)) && !taken.has(key(c + dc, r + dr)));
  };

  const bind = useDrag({
    onStart(id, pt) {
      if (done) return false;
      const pc = ref.current.find((x) => String(x.id) === id)!;
      const { w, h } = size(pc.cells);
      // pick it up centered a little above the finger, at full size
      grab.current = { x: (w * cell) / 2, y: (h * cell) / 2 + 30 };
      sfx.tap();
      update(pc.id, (x) => ({ ...x, dragging: true, at: null, x: pt.x - grab.current.x, y: pt.y - grab.current.y }));
    },
    onMove(id, pt) {
      update(Number(id), (x) => ({ ...x, x: pt.x - grab.current.x, y: pt.y - grab.current.y }));
    },
    onEnd(id, pt, { tap }) {
      const pc = ref.current.find((x) => String(x.id) === id)!;
      const back = () => {
        const h0 = home(slotOf(pc.id), pc.cells);
        update(pc.id, (x) => ({ ...x, dragging: false, at: null, x: h0.x, y: h0.y }));
      };
      if (tap) {
        // a tap turns the piece (top level), otherwise it just goes back
        if (plan.rotateOn) {
          sfx.snap();
          const cells = rotate(pc.cells);
          const h0 = home(slotOf(pc.id), cells);
          update(pc.id, (x) => ({ ...x, cells, dragging: false, at: null, x: h0.x, y: h0.y }));
        } else back();
        return;
      }
      const ox = pt.x - grab.current.x;
      const oy = pt.y - grab.current.y;
      const fc = (ox - gridX) / cell;
      const fr = (oy - gridY) / cell;
      const onBoard = fc > -1.2 && fr > -1.2 && fc < plan.cols + 0.2 && fr < plan.rows + 0.2;
      if (!onBoard) return back();
      // the closest spot that fits, within one square of where it was dropped
      const cands: Cell[] = [];
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) cands.push([Math.round(fc) + dc, Math.round(fr) + dr]);
      cands.sort((a, b) => Math.hypot(a[0] - fc, a[1] - fr) - Math.hypot(b[0] - fc, b[1] - fr));
      const spot = cands.find(([c, r]) => Math.hypot(c - fc, r - fr) < 1.05 && fits(pc, c, r, ref.current));
      if (!spot) {
        sfx.nope();
        wrongs.current += 1;
        if (wrongs.current >= 2) void api.mistake(p("It doesn't fit there. Try another spot!", 'Ahí no cabe. ¡Prueba en otro lugar!'));
        else void api.mistake(false);
        update(pc.id, (x) => ({ ...x, wrong: x.wrong + 1 }));
        return back();
      }
      sfx.snap();
      const next = ref.current.map((x) => (x.id === pc.id ? { ...x, dragging: false, at: spot, x: gridX + spot[0] * cell, y: gridY + spot[1] * cell } : x));
      setPieces(next);
      const filled = new Set<string>();
      for (const o of next) if (o.at) for (const [dc, dr] of o.cells) filled.add(key(o.at[0] + dc, o.at[1] + dr));
      if (filled.size === outlineSet.size) {
        setDone(true);
        later(() => {
          sfx.win();
          bursts.add(makeBurst(gridX + (plan.cols * cell) / 2, gridY + (plan.rows * cell) / 2, '#F7C431', true));
          void api.say(p(`${cap(plan.puzzle.name.en)}!`, `¡${cap(plan.puzzle.name.es)}!`));
        }, 300);
        later(() => api.solved(), 2200);
      }
    },
  });

  // hint: glow where one waiting piece belongs
  const waiting = pieces.find((x) => !x.at && !x.dragging);
  const hintCells = waiting ? plan.pieces[waiting.id].cells.map(([c, r]) => [c + plan.pieces[waiting.id].solution[0], r + plan.pieces[waiting.id].solution[1]] as Cell) : [];

  const drawn = [...pieces].sort((a, b) => Number(a.dragging) - Number(b.dragging));
  return (
    <g data-testid="block-puzzle" data-done={done} data-pieces={n} data-rotate={plan.rotateOn} data-cell={cell}>
      <rect width={W} height={H} rx={28} fill="#F3EEE6" />
      {/* the outline to fill */}
      <rect x={gridX - 18} y={gridY - 18} width={plan.cols * cell + 36} height={plan.rows * cell + 36} rx={26} fill="#E6DCCB" />
      {plan.outline.map(([c, r]) => (
        <rect
          key={key(c, r)}
          x={gridX + c * cell + 4}
          y={gridY + r * cell + 4}
          width={cell - 8}
          height={cell - 8}
          rx={14}
          fill={hint && hintCells.some(([hc, hr]) => hc === c && hr === r) ? '#FFE27A' : '#FFFDF8'}
          stroke="#C9B994"
          strokeWidth={4}
          strokeDasharray="10 8"
          data-testid="outline-cell"
          data-c={c}
          data-r={r}
        />
      ))}
      {done && <Emoji ch={plan.puzzle.icon} x={gridX + (plan.cols * cell) / 2} y={gridY + (plan.rows * cell) / 2} size={Math.min(plan.cols, plan.rows) * cell * 0.8} className="pop-in" />}
      {drawn.map((pc) => {
        const scale = pc.at || pc.dragging ? 1 : TRAY;
        const c = COLORS[pc.color];
        return (
          <g
            key={pc.id}
            {...bind(String(pc.id))}
            transform={`translate(${pc.x.toFixed(1)} ${pc.y.toFixed(1)}) scale(${scale})`}
            data-testid={`piece-${pc.id}`}
            data-placed={!!pc.at}
            data-at={pc.at ? pc.at.join(',') : ''}
            data-cells={pc.cells.map((x) => x.join(':')).join(' ')}
            data-goal-cells={plan.pieces[pc.id].cells.map((x) => x.join(':')).join(' ')}
            data-goal={plan.pieces[pc.id].solution.join(',')}
            opacity={done ? 0.35 : 1}
            className="piece"
          >
            <g key={pc.wrong} className={pc.wrong ? 'wiggle' : ''}>
              {/* generous grab area */}
              {pc.cells.map(([dc, dr]) => (
                <rect key={'h' + dc + dr} x={dc * cell - 10} y={dr * cell - 10} width={cell + 20} height={cell + 20} fill="transparent" />
              ))}
              {pc.dragging && pc.cells.map(([dc, dr]) => <rect key={'s' + dc + dr} x={dc * cell + 4} y={dr * cell + 12} width={cell - 8} height={cell - 8} rx={14} fill="#000" opacity={0.15} />)}
              {pc.cells.map(([dc, dr]) => (
                <g key={dc + ':' + dr}>
                  <rect x={dc * cell + 3} y={dr * cell + 3} width={cell - 6} height={cell - 6} rx={14} fill={c.hex} stroke={c.dark} strokeWidth={5} data-testid="pcell" />
                  <rect x={dc * cell + 12} y={dr * cell + 10} width={cell - 24} height={cell * 0.16} rx={6} fill="#fff" opacity={0.3} />
                </g>
              ))}
              {plan.rotateOn && !pc.at && !pc.dragging && (
                <text x={(size(pc.cells).w * cell) / 2} y={-cell * 0.35} fontSize={cell * 0.5} textAnchor="middle" dominantBaseline="central" opacity={0.7}>
                  🔄
                </text>
              )}
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const L_build = (name: Phrase) => p(`Let's build ${name.en}! Fill every square.`, `¡Vamos a construir ${name.es}! Llena todos los cuadros.`);

export const blockPuzzle: GameDef = {
  id: 'block-puzzle',
  title: p('Block Puzzle', 'Construir'),
  icon: '🧩',
  skill: p('Planning & spatial thinking', 'Planear y pensar en el espacio'),
  tint: '#E06D5A',
  rounds: () => 3,
  adaptive: true,
  Component: BlockPuzzle,
};
