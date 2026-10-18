import { useEffect, useMemo, useRef, useState } from 'react';
import { p } from '../../engine/i18n';
import { makeRng, pick } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { useDrag } from '../../engine/useDrag';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';
import { type Cell, MAZES, findPath, isDeadEnd, isOpen, moveToward, parseMaze, same } from './logic';

const SAY_GO = p('Help the astronaut get to the rocket!', '¡Ayuda al astronauta a llegar a su cohete!');
const SAY_DEAD = p('Oops, no way out! Go back.', '¡Ups, no hay salida! Regresa.');
const SAY_WIN = p('Blast off!', '¡Despegue!');

function RocketMaze({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const maze = useMemo(() => {
    const rng = makeRng(api.seed);
    const options = MAZES[api.level] ?? MAZES[2];
    return parseMaze(pick(options, rng));
  }, [api.seed, api.level]);

  const pad = 30;
  const c = Math.min(190, (W - pad * 2) / maze.cols, (H - pad * 2) / maze.rows);
  const ox = (W - c * maze.cols) / 2;
  const oy = (H - c * maze.rows) / 2;
  const cx = (cell: Cell) => ox + cell[1] * c + c / 2;
  const cy = (cell: Cell) => oy + cell[0] * c + c / 2;

  const [pos, setPos] = useState<Cell>(maze.start);
  const posRef = useRef(pos);
  posRef.current = pos;
  const [trail, setTrail] = useState<Cell[]>([maze.start]);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const [hintOn, setHintOn] = useState(false);
  const visitedDead = useRef(new Set<string>());
  const walkQueue = useRef<number | null>(null);
  const bursts = useBursts();

  useEffect(() => {
    api.instruct(SAY_GO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api.hint) return;
    setHintOn(true);
    const t = window.setTimeout(() => setHintOn(false), 4500);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const arrive = (cell: Cell) => {
    setPos(cell);
    posRef.current = cell;
    setTrail((t) => (t.some((x) => same(x, cell)) ? t : [...t, cell]));
    sfx.step();
    if (same(cell, maze.goal) && !wonRef.current) {
      wonRef.current = true;
      setWon(true);
      sfx.whoosh();
      bursts.add(makeBurst(cx(cell), cy(cell), '#F7C431', true));
      void api.say(SAY_WIN);
      later(() => api.solved(), 1700);
      return;
    }
    const k = cell.join(',');
    if (isDeadEnd(maze, cell) && !visitedDead.current.has(k)) {
      visitedDead.current.add(k);
      api.mistake(SAY_DEAD);
    }
  };

  const walk = (steps: Cell[], delay: number) => {
    if (walkQueue.current) window.clearTimeout(walkQueue.current);
    const next = (i: number) => {
      if (i >= steps.length || wonRef.current) return;
      arrive(steps[i]);
      walkQueue.current = window.setTimeout(() => next(i + 1), delay);
    };
    next(0);
  };

  const cellAt = (x: number, y: number): Cell => [Math.floor((y - oy) / c), Math.floor((x - ox) / c)];
  const easy = api.level <= 1;

  const follow = (x: number, y: number) => {
    if (wonRef.current) return;
    const target = cellAt(x, y);
    if (!isOpen(maze, target)) return;
    const steps = moveToward(maze, posRef.current, target, easy ? 99 : 3);
    if (steps) steps.forEach(arrive);
  };

  const bind = useDrag({
    onMove(_id, pt) {
      follow(pt.x, pt.y);
    },
    onEnd(_id, pt, { tap }) {
      if (!tap || wonRef.current) return;
      const target = cellAt(pt.x, pt.y);
      if (!isOpen(maze, target)) return;
      // tap: walk there if it is close by (or anywhere in easy mode)
      const steps = moveToward(maze, posRef.current, target, easy ? 99 : 1);
      if (steps) walk(steps, 160);
    },
  });

  useEffect(() => () => {
    if (walkQueue.current) window.clearTimeout(walkQueue.current);
  }, []);

  const solution = hintOn ? findPath(maze, pos, maze.goal) ?? [] : [];

  // road segments between neighboring open cells
  const segs: [Cell, Cell][] = [];
  for (let r = 0; r < maze.rows; r++)
    for (let col = 0; col < maze.cols; col++) {
      if (!maze.open[r][col]) continue;
      if (isOpen(maze, [r, col + 1])) segs.push([[r, col], [r, col + 1]]);
      if (isOpen(maze, [r + 1, col])) segs.push([[r, col], [r + 1, col]]);
    }
  const openCells: Cell[] = [];
  maze.open.forEach((row, r) => row.forEach((o, col) => o && openCells.push([r, col])));

  const stars = useMemo(() => {
    const rng = makeRng(api.seed + 7);
    return Array.from({ length: 40 }, () => ({ x: rng() * W, y: rng() * H, r: 1.5 + rng() * 3 }));
  }, [api.seed, W, H]);

  return (
    <g
      {...bind('maze')}
      data-testid="maze"
      data-solution={(findPath(maze, maze.start, maze.goal) ?? []).map((cell) => `${cx(cell)},${cy(cell)}`).join(';')}
    >
      <rect width={W} height={H} rx={28} fill="#1E2A4A" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.7} className={i % 4 === 0 ? 'twinkle' : ''} />
      ))}
      <Emoji ch="🪐" x={W - 70} y={70} size={80} style={{ opacity: 0.85 }} />
      {/* road */}
      <g strokeLinecap="round">
        {segs.map(([a, b], i) => (
          <line key={'o' + i} x1={cx(a)} y1={cy(a)} x2={cx(b)} y2={cy(b)} stroke="#7FB0E8" strokeWidth={c * 0.84} />
        ))}
        {openCells.map((cell, i) => (
          <circle key={'oc' + i} cx={cx(cell)} cy={cy(cell)} r={c * 0.42} fill="#7FB0E8" />
        ))}
        {segs.map(([a, b], i) => (
          <line key={'i' + i} x1={cx(a)} y1={cy(a)} x2={cx(b)} y2={cy(b)} stroke="#DCEBFF" strokeWidth={c * 0.7} />
        ))}
        {openCells.map((cell, i) => (
          <circle key={'ic' + i} cx={cx(cell)} cy={cy(cell)} r={c * 0.35} fill="#DCEBFF" />
        ))}
      </g>
      {/* trail of visited spots */}
      {trail.map((cell, i) => (
        <circle key={'t' + i} cx={cx(cell)} cy={cy(cell)} r={c * 0.12} fill="#F7C431" className="trail-dot" />
      ))}
      {/* hint path */}
      {solution.slice(1).map((cell, i) => (
        <circle key={'h' + i} cx={cx(cell)} cy={cy(cell)} r={c * 0.16} fill="#F58A3A" className="hint-dot" style={{ animationDelay: `${i * 120}ms` }} data-testid="hint-dot" />
      ))}
      {/* rocket */}
      <g className={won ? 'rocket launch' : 'rocket'} style={{ transformOrigin: `${cx(maze.goal)}px ${cy(maze.goal)}px` }}>
        <Emoji ch="🚀" x={cx(maze.goal)} y={cy(maze.goal)} size={c * 0.78} style={{ transform: 'rotate(-45deg)', transformOrigin: `${cx(maze.goal)}px ${cy(maze.goal)}px`, transformBox: 'view-box' }} />
      </g>
      {/* astronaut */}
      {!won && (
        <g className="mover" style={{ transform: `translate(${cx(pos)}px, ${cy(pos)}px)` }} data-testid="astronaut" data-cell={pos.join(',')}>
          <circle r={c * 0.46} fill="#fff" opacity={0.35} className="halo" />
          <Emoji ch="🧑‍🚀" x={0} y={0} size={c * 0.7} />
        </g>
      )}
      {bursts.layer}
    </g>
  );
}

export const rocketMaze: GameDef = {
  id: 'rocket-maze',
  title: p('Rocket Maze', 'Laberinto Espacial'),
  icon: '🚀',
  skill: p('Problem-solving', 'Resolver problemas'),
  tint: '#3D5A99',
  rounds: () => 3,
  adaptive: true,
  Component: RocketMaze,
};
