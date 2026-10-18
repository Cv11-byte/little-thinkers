// Shapes & Shadows. Rounds alternate between two kinds of matching:
//  - Shape board: drag colored shapes into a wooden board (12 different shapes).
//  - Shadows: drag fruit, vehicles, animals or toys onto their matching shadow.
// More pieces and look-alike shapes at higher levels.

import { useEffect, useMemo, useRef } from 'react';
import { type Phrase, p } from '../../engine/i18n';
import { type Piece, usePieces } from '../../engine/pieces';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { Emoji, HintHand, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';
import { SHAPES, Shape, type ShapeId } from './shapes';

const EASY_SHAPES: ShapeId[] = ['circle', 'square', 'triangle', 'star', 'heart', 'moon', 'cross'];
const ALL_SHAPES: ShapeId[] = [...EASY_SHAPES, 'diamond', 'hexagon', 'oval', 'rectangle', 'pentagon'];
/** pairs that look alike, used at the top level to make it a real challenge */
const LOOKALIKES: ShapeId[][] = [
  ['circle', 'oval'],
  ['square', 'rectangle'],
  ['pentagon', 'hexagon'],
  ['diamond', 'triangle'],
];

interface ShadowItem {
  ch: string;
  name: Phrase;
}
export const SHADOW_SETS: { id: string; backdrop: string; items: ShadowItem[] }[] = [
  {
    id: 'fruit',
    backdrop: '#FCE9E6',
    items: [
      { ch: '🍌', name: p('banana', 'plátano') },
      { ch: '🍇', name: p('grapes', 'uvas') },
      { ch: '🍓', name: p('strawberry', 'fresa') },
      { ch: '🍐', name: p('pear', 'pera') },
      { ch: '🥕', name: p('carrot', 'zanahoria') },
      { ch: '🍍', name: p('pineapple', 'piña') },
      { ch: '🍉', name: p('watermelon', 'sandía') },
    ],
  },
  {
    id: 'vehicles',
    backdrop: '#E4EDF7',
    items: [
      { ch: '🚗', name: p('car', 'carro') },
      { ch: '🚂', name: p('train', 'tren') },
      { ch: '✈️', name: p('airplane', 'avión') },
      { ch: '🚲', name: p('bike', 'bicicleta') },
      { ch: '⛵', name: p('boat', 'barco') },
      { ch: '🚁', name: p('helicopter', 'helicóptero') },
    ],
  },
  {
    id: 'animals',
    backdrop: '#E8F4DE',
    items: [
      { ch: '🐘', name: p('elephant', 'elefante') },
      { ch: '🦒', name: p('giraffe', 'jirafa') },
      { ch: '🐢', name: p('turtle', 'tortuga') },
      { ch: '🐌', name: p('snail', 'caracol') },
      { ch: '🦋', name: p('butterfly', 'mariposa') },
      { ch: '🐇', name: p('rabbit', 'conejo') },
      { ch: '🦆', name: p('duck', 'pato') },
    ],
  },
  {
    id: 'toys',
    backdrop: '#F1E9FA',
    items: [
      { ch: '🧸', name: p('teddy bear', 'osito') },
      { ch: '🎈', name: p('balloon', 'globo') },
      { ch: '🪁', name: p('kite', 'papalote') },
      { ch: '🎸', name: p('guitar', 'guitarra') },
      { ch: '🥁', name: p('drum', 'tambor') },
      { ch: '🛴', name: p('scooter', 'patín') },
      { ch: '☂️', name: p('umbrella', 'paraguas') },
    ],
  },
];

const COUNT: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 6 };

export function shapePlan(level: number, sessionSeed: number, round: number) {
  const rng = makeRng(sessionSeed * 3 + round * 53 + level);
  const n = COUNT[Math.min(4, Math.max(1, level))];
  const shadows = (round + sessionSeed) % 2 === 1;
  if (shadows) {
    const set = SHADOW_SETS[(sessionSeed + round) % SHADOW_SETS.length];
    const items = shuffle(set.items, rng).slice(0, n);
    return { kind: 'shadows' as const, set: set.id, backdrop: set.backdrop, items, shapes: [] as ShapeId[], wood: false };
  }
  let shapes: ShapeId[];
  if (level >= 4) {
    // two look-alike pairs plus two others
    const pairs = shuffle(LOOKALIKES, rng).slice(0, 2).flat();
    const rest = shuffle(
      ALL_SHAPES.filter((s) => !pairs.includes(s)),
      rng,
    ).slice(0, n - pairs.length);
    shapes = [...pairs, ...rest];
  } else {
    shapes = shuffle(level <= 2 ? EASY_SHAPES : ALL_SHAPES, rng).slice(0, n);
  }
  return { kind: 'board' as const, set: 'board', backdrop: '#F6EFE3', items: [] as ShadowItem[], shapes, wood: level >= 4 };
}

interface MatchPiece extends Piece {
  key: string;
  shape?: ShapeId;
  item?: ShadowItem;
}

function ShapePuzzle({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => shapePlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  const keys = plan.kind === 'board' ? plan.shapes : plan.items.map((x) => x.ch);
  const n = keys.length;
  const landscape = W >= H;
  const wrongs = useRef(0);

  // board on one side, pieces on the other
  const boardW = landscape ? W * 0.58 : W * 0.92;
  const boardH = landscape ? H * 0.9 : H * 0.5;
  const boardX = landscape ? W * 0.03 : (W - boardW) / 2;
  const boardY = landscape ? (H - boardH) / 2 : H * 0.03;
  const hc = n <= 2 ? n : n <= 4 ? 2 : 3;
  const hr = Math.ceil(n / hc);
  const r = Math.min(92, (boardW / hc) * 0.32, (boardH / hr) * 0.32);

  const holeOrder = useMemo(() => shuffle(keys, makeRng(api.seed + 1)), [api.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieceOrder = useMemo(() => shuffle(keys, makeRng(api.seed + 2)), [api.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const holePos = (i: number) => {
    const col = i % hc;
    const row = Math.floor(i / hc);
    const rowCount = row === hr - 1 ? n - row * hc : hc;
    const cw = boardW / rowCount;
    return { x: boardX + cw * col + cw / 2, y: boardY + (boardH / hr) * row + boardH / hr / 2 };
  };
  const holeOf = (k: string) => holePos(holeOrder.indexOf(k));

  const { pieces, bind } = usePieces<MatchPiece>(
    () =>
      pieceOrder.map((k, i) => {
        let x: number, y: number;
        if (landscape) {
          const cols = n > 3 ? 2 : 1;
          const rowsN = Math.ceil(n / cols);
          const trayX = W * 0.8;
          x = trayX + (cols === 2 ? (i % 2 === 0 ? -1 : 1) * r * 1.25 : 0);
          y = H / 2 + (Math.floor(i / cols) - (rowsN - 1) / 2) * Math.min(r * 2.45, (H - 40) / rowsN);
        } else {
          const cols = Math.min(n, 3);
          const rowsN = Math.ceil(n / cols);
          x = W / 2 + ((i % cols) - (cols - 1) / 2) * Math.min(r * 2.5, W / cols);
          y = H * 0.66 + (Math.floor(i / cols) + 0.5) * (H * 0.32) / rowsN;
        }
        const base = { id: k, key: k, x, y, homeX: x, homeY: y, placed: false, dragging: false, wrong: 0 };
        return plan.kind === 'board' ? { ...base, shape: k as ShapeId } : { ...base, item: plan.items.find((it) => it.ch === k) };
      }),
    ({ piece, tap }) => {
      if (tap) {
        if (api.level <= 1) return snap(piece);
        return 'home';
      }
      let best: string | null = null;
      let bestD = Infinity;
      for (const k of keys) {
        const h = holeOf(k);
        const d = Math.hypot(piece.x - h.x, piece.y - h.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (!best || bestD > r * 1.45) return 'home';
      if (best !== piece.key) {
        sfx.nope();
        wrongs.current += 1;
        void api.mistake(wrongs.current === 1 ? false : p("That doesn't fit. Try another spot!", 'No cabe. ¡Prueba en otro lugar!'));
        return 'wrong';
      }
      return snap(piece);
    },
  );

  function snap(piece: MatchPiece) {
    const h = holeOf(piece.key);
    sfx.snap();
    bursts.add(makeBurst(h.x, h.y, piece.shape ? SHAPES[piece.shape].color : '#F7C431'));
    // name it: a word, not a speech
    void api.say(piece.shape ? SHAPES[piece.shape].name : piece.item!.name);
    return { x: h.x, y: h.y };
  }

  const allPlaced = pieces.every((x) => x.placed);
  useEffect(() => {
    if (allPlaced) later(() => api.solved(), 1100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaced]);

  useEffect(() => {
    void api.instruct(
      plan.kind === 'board'
        ? p('Put each shape in its place!', '¡Pon cada figura en su lugar!')
        : p('Match each one to its shadow!', '¡Pon cada uno en su sombra!'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstOpen = pieces.find((x) => !x.placed);
  const hint = firstOpen ? holeOf(firstOpen.key) : null;

  return (
    <g data-testid="shape-puzzle" data-kind={plan.kind}>
      <defs>
        <filter id="silhouette" x="-20%" y="-20%" width="140%" height="140%">
          <feColorMatrix type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.24  0 0 0 0 0.3  0 0 0 0.42 0" />
        </filter>
        <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity="0.22" />
        </filter>
        <radialGradient id="wood" cx="0.4" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#E7C08C" />
          <stop offset="1" stopColor="#CFA06A" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} rx={28} fill={plan.backdrop} />
      {plan.kind === 'board' ? (
        <>
          <rect x={boardX} y={boardY + 8} width={boardW} height={boardH} rx={44} fill="#A97C4B" />
          <rect x={boardX} y={boardY} width={boardW} height={boardH} rx={44} fill="url(#wood)" stroke="#B88A55" strokeWidth={6} />
          {/* wood grain */}
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              d={`M ${boardX + 30} ${boardY + 40 + (i * (boardH - 80)) / 5} q ${boardW * 0.25} ${-14} ${boardW * 0.5} 0 t ${boardW * 0.42} 0`}
              stroke="#C89A64"
              strokeWidth={3}
              fill="none"
              opacity={0.45}
            />
          ))}
        </>
      ) : (
        <ShadowBackdrop set={plan.set} x={boardX} y={boardY} w={boardW} h={boardH} />
      )}
      {holeOrder.map((k, i) => {
        const h = holePos(i);
        return (
          <g key={k} transform={`translate(${h.x} ${h.y})`} data-testid={`hole-${plan.kind === 'board' ? k : 'item-' + i}`} data-key={k}>
            {plan.kind === 'board' ? (
              <>
                <Shape id={k as ShapeId} r={r * 1.07} fill="#8A6239" />
                <Shape id={k as ShapeId} r={r * 1.0} fill="#5E3F22" />
              </>
            ) : (
              <>
                <circle r={r * 1.15} fill="#fff" opacity={0.55} />
                <text fontSize={r * 1.55} textAnchor="middle" dominantBaseline="central" filter="url(#silhouette)" className="emoji">
                  {k}
                </text>
              </>
            )}
          </g>
        );
      })}
      {pieces.map((pc, i) => (
        <g
          key={pc.id}
          {...bind(pc.id)}
          className={'piece' + (pc.dragging ? ' dragging' : '') + (pc.placed ? ' placed' : '')}
          style={{ transform: `translate(${pc.x}px, ${pc.y}px)` }}
          data-testid={plan.kind === 'board' ? `shape-${pc.key}` : `item-${i}`}
          data-key={pc.key}
          data-placed={pc.placed}
        >
          <g className="reveal" style={{ animationDelay: `${400 + i * 300}ms` }}>
            <g key={pc.wrong} className={pc.wrong ? 'wiggle' : ''}>
              <circle r={r * 1.25} fill="transparent" />
              {pc.shape ? (
                <g filter={pc.placed ? undefined : 'url(#piece-shadow)'}>
                  <Shape id={pc.shape} r={r * 0.98} fill={plan.wood ? '#F0D3A8' : SHAPES[pc.shape].color} stroke={plan.wood ? '#C9A06C' : SHAPES[pc.shape].dark} sw={6} />
                  <g transform={`translate(${-r * 0.28} ${-r * 0.3})`} opacity={0.3}>
                    <Shape id={pc.shape} r={r * 0.28} fill="#fff" />
                  </g>
                </g>
              ) : (
                <Emoji ch={pc.key} x={0} y={0} size={r * 1.55} />
              )}
            </g>
          </g>
        </g>
      ))}
      {firstOpen && hint && <HintHand x1={firstOpen.homeX} y1={firstOpen.homeY + 30} x2={hint.x} y2={hint.y} show={api.hint} />}
      {bursts.layer}
    </g>
  );
}

function ShadowBackdrop({ set, x, y, w, h }: { set: string; x: number; y: number; w: number; h: number }) {
  if (set === 'vehicles') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={44} fill="#9AA6B5" />
        <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} rx={36} fill="#7E8A99" />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={x + 30 + (i * (w - 60)) / 7} y={y + h / 2 - 5} width={(w - 60) / 14} height={10} rx={5} fill="#F7E08A" opacity={0.8} />
        ))}
      </g>
    );
  }
  if (set === 'fruit') {
    // picnic blanket
    const sq = 46;
    return (
      <g>
        <clipPath id="blanket">
          <rect x={x} y={y} width={w} height={h} rx={44} />
        </clipPath>
        <rect x={x} y={y} width={w} height={h} rx={44} fill="#fff" />
        <g clipPath="url(#blanket)" opacity={0.35}>
          {Array.from({ length: Math.ceil(w / sq) }, (_, i) => (
            <rect key={'c' + i} x={x + i * sq} y={y} width={sq / 2} height={h} fill="#E8524A" />
          ))}
          {Array.from({ length: Math.ceil(h / sq) }, (_, i) => (
            <rect key={'r' + i} x={x} y={y + i * sq} width={w} height={sq / 2} fill="#E8524A" />
          ))}
        </g>
        <rect x={x} y={y} width={w} height={h} rx={44} fill="none" stroke="#E7B5AE" strokeWidth={6} />
      </g>
    );
  }
  if (set === 'animals') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={44} fill="#B9E09A" />
        {Array.from({ length: 22 }, (_, i) => {
          const gx = x + 30 + ((i * 97) % (w - 60));
          const gy = y + 30 + ((i * 61) % (h - 60));
          return <path key={i} d={`M ${gx} ${gy} l -6 -14 M ${gx} ${gy} l 0 -18 M ${gx} ${gy} l 6 -14`} stroke="#8CC46A" strokeWidth={4} strokeLinecap="round" />;
        })}
      </g>
    );
  }
  // toys: round play rug
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={44} fill="#D9C8F0" />
      <rect x={x + 16} y={y + 16} width={w - 32} height={h - 32} rx={34} fill="none" stroke="#fff" strokeWidth={6} strokeDasharray="14 12" />
    </g>
  );
}

export const shapePuzzle: GameDef = {
  id: 'shape-puzzle',
  title: p('Shapes & Shadows', 'Figuras y Sombras'),
  icon: '🔷',
  skill: p('Shapes & finger control', 'Figuras y motricidad'),
  tint: '#3D8BE8',
  rounds: () => 4,
  adaptive: true,
  Component: ShapePuzzle,
};
