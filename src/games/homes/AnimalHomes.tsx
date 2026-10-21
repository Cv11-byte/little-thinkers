// Animal Homes: drag each animal to where it lives.
// Only clear, toddler-obvious pairs: fish → ocean, cow → farm, monkey → tree, butterfly → sky.
// Homes are drawn as little scenes instead of icons.

import { useEffect, useMemo, useRef } from 'react';
import { L } from '../../engine/lines';
import { type Phrase, p } from '../../engine/i18n';
import { type Piece, pieceTransform, usePieces } from '../../engine/pieces';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { ANIMALS, type Animal } from '../../engine/words';
import { Emoji, HintHand, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

type HomeId = 'ocean' | 'farm' | 'tree' | 'sky';

interface Home {
  id: HomeId;
  name: Phrase;
  where: Phrase;
  animals: string[];
}

export const HOMES: Home[] = [
  { id: 'ocean', name: p('ocean', 'mar'), where: p('in the ocean', 'en el mar'), animals: ['fish', 'whale', 'octopus', 'crab', 'dolphin'] },
  { id: 'farm', name: p('farm', 'granja'), where: p('on the farm', 'en la granja'), animals: ['cow', 'pig', 'chicken', 'sheep', 'horse'] },
  { id: 'tree', name: p('tree', 'árbol'), where: p('in the tree', 'en el árbol'), animals: ['monkey', 'squirrel', 'sloth'] },
  { id: 'sky', name: p('sky', 'cielo'), where: p('in the sky', 'en el cielo'), animals: ['butterfly', 'bird', 'bee'] },
];

interface AnimalPiece extends Piece {
  animal: Animal;
  home: HomeId;
}

export function homesPlan(level: number, sessionSeed: number, round: number) {
  const rng = makeRng(sessionSeed * 5 + round * 71 + level);
  const nHomes = level <= 2 ? 2 : level === 3 ? 3 : 4;
  const nAnimals = level <= 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
  const homes = shuffle(HOMES, rng).slice(0, nHomes);
  const animals: { animal: Animal; home: HomeId }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < nAnimals; i++) {
    const h = homes[i % homes.length];
    const choice = shuffle(
      h.animals.filter((id) => !used.has(id)),
      rng,
    )[0];
    used.add(choice);
    animals.push({ animal: ANIMALS[choice], home: h.id });
  }
  return { homes, animals: shuffle(animals, rng) };
}

function AnimalHomes({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => homesPlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  const placedCount = useRef<Record<string, number>>({});
  const wrongs = useRef(0);

  const nH = plan.homes.length;
  const gap = 22;
  // portrait with 3-4 homes: a 2x2 grid; otherwise one row along the bottom
  const grid = W < H && nH > 2;
  const gCols = grid ? 2 : nH;
  const gRows = grid ? Math.ceil(nH / 2) : 1;
  const homeW = Math.min(320, (W - gap * (gCols + 1)) / gCols);
  const homeH = grid ? Math.min((H * 0.62 - gap * (gRows + 1)) / gRows, homeW * 1.05) : Math.min(H * 0.52, homeW * 1.2);
  const areaTop = H - (gRows * homeH + (gRows - 1) * gap) - 22;
  const homeX = (i: number) => {
    const col = i % gCols;
    const row = Math.floor(i / gCols);
    const rowCount = row === gRows - 1 ? nH - row * gCols : gCols;
    return (W - (rowCount * homeW + (rowCount - 1) * gap)) / 2 + col * (homeW + gap);
  };
  const homeYOf = (i: number) => areaTop + Math.floor(i / gCols) * (homeH + gap);
  const homeBox = (id: string) => {
    const i = plan.homes.findIndex((h) => h.id === id);
    return { x: homeX(i), y: homeYOf(i), w: homeW, h: homeH };
  };
  const animalSize = Math.min(150, (W / Math.max(plan.animals.length, 2)) * 0.55, areaTop * 0.6);

  const { pieces, bind } = usePieces<AnimalPiece>(
    () =>
      plan.animals.map((a, i) => {
        const n = plan.animals.length;
        const x = W / 2 + (i - (n - 1) / 2) * Math.min(W / n, 250);
        const y = areaTop * 0.48;
        return { id: a.animal.id, animal: a.animal, home: a.home, x, y, homeX: x, homeY: y, placed: false, dragging: false, wrong: 0 };
      }),
    ({ piece, tap }) => {
      if (tap) {
        if (api.level <= 1) return placeIn(piece, piece.home);
        void api.say(piece.animal.name);
        return 'home';
      }
      const hit = plan.homes.find((h) => {
        const b = homeBox(h.id);
        return piece.x > b.x - 30 && piece.x < b.x + b.w + 30 && piece.y > b.y - 60 && piece.y < b.y + b.h + 30;
      });
      if (!hit) return 'home';
      if (hit.id !== piece.home) {
        sfx.nope();
        wrongs.current += 1;
        void api.mistake(wrongs.current === 1 ? false : L.whereLive(piece.animal));
        return 'wrong';
      }
      return placeIn(piece, hit.id);
    },
  );

  function placeIn(piece: AnimalPiece, homeId: string) {
    const b = homeBox(homeId);
    const k = placedCount.current[homeId] ?? 0;
    placedCount.current[homeId] = k + 1;
    const x = b.x + b.w / 2 + (k % 2 === 0 ? -1 : 1) * (k > 0 ? b.w * 0.2 : 0);
    const y = b.y + b.h * 0.62 + (k > 1 ? -b.h * 0.24 : 0);
    sfx.snap();
    bursts.add(makeBurst(x, y, '#F7C431'));
    const home = HOMES.find((h) => h.id === homeId)!;
    void api.say(L.livesIn(piece.animal, home.where));
    return { x, y };
  }

  const allPlaced = pieces.every((x) => x.placed);
  useEffect(() => {
    if (allPlaced) later(() => api.solved(), 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaced]);

  useEffect(() => {
    void api.instruct(p('Help the animals get home!', '¡Ayuda a los animales a llegar a su casa!'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstOpen = pieces.find((x) => !x.placed);
  const hintTo = firstOpen ? homeBox(firstOpen.home) : null;

  return (
    <g data-testid="homes">
      <rect width={W} height={H} rx={28} fill="#FFF8EC" />
      {plan.homes.map((h, i) => (
        <g key={h.id} data-testid={`home-${h.id}`} className="reveal" style={{ animationDelay: `${i * 250}ms` }}>
          <HomeScene id={h.id} x={homeX(i)} y={homeYOf(i)} w={homeW} h={homeH} />
        </g>
      ))}
      {pieces.map((pc, i) => (
        <g
          key={pc.id}
          {...bind(pc.id)}
          className={'piece' + (pc.dragging ? ' dragging' : '') + (pc.placed ? ' placed' : '')}
          transform={pieceTransform(pc)}
          data-testid={`animal-${pc.id}`}
          data-home={pc.home}
          data-placed={pc.placed}
        >
          <g className="reveal" style={{ animationDelay: `${600 + i * 300}ms` }}>
            <g key={pc.wrong} className={pc.wrong ? 'wiggle' : pc.placed ? 'bounce-once' : ''}>
              {!pc.placed && <circle r={animalSize * 0.62} fill="#fff" stroke="#E7DCC8" strokeWidth={4} />}
              <Emoji ch={pc.animal.emoji} x={0} y={0} size={animalSize * (pc.placed ? 0.72 : 0.82)} />
            </g>
          </g>
        </g>
      ))}
      {firstOpen && hintTo && <HintHand x1={firstOpen.homeX} y1={firstOpen.homeY + 40} x2={hintTo.x + hintTo.w / 2} y2={hintTo.y + hintTo.h / 2} show={api.hint} />}
      {bursts.layer}
    </g>
  );
}

/** Each home is a little drawn scene, so it's obvious what it is. */
function HomeScene({ id, x, y, w, h }: { id: HomeId; x: number; y: number; w: number; h: number }) {
  const clip = `clip-${id}`;
  return (
    <g>
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} rx={34} />
      </clipPath>
      <rect x={x} y={y + 8} width={w} height={h} rx={34} fill="#000" opacity={0.08} />
      <g clipPath={`url(#${clip})`}>
        {id === 'ocean' && (
          <>
            <rect x={x} y={y} width={w} height={h} fill="#CDEBFA" />
            <rect x={x} y={y + h * 0.25} width={w} height={h * 0.75} fill="#3D9BE0" />
            <rect x={x} y={y + h * 0.6} width={w} height={h * 0.4} fill="#2A7CC4" />
            {[0.25, 0.45].map((k, i) => (
              <path
                key={i}
                d={`M ${x} ${y + h * k} q ${w / 8} ${-18} ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`}
                fill="none"
                stroke="#fff"
                strokeWidth={6}
                opacity={i === 0 ? 0.9 : 0.35}
              />
            ))}
            <rect x={x} y={y + h * 0.9} width={w} height={h * 0.1} fill="#F2D9A0" />
            {[0.2, 0.75, 0.55].map((k, i) => (
              <circle key={i} cx={x + w * k} cy={y + h * (0.4 + i * 0.12)} r={8 + i * 3} fill="none" stroke="#fff" strokeWidth={3} opacity={0.6} />
            ))}
          </>
        )}
        {id === 'farm' && (
          <>
            <rect x={x} y={y} width={w} height={h} fill="#CFEAF7" />
            <rect x={x} y={y + h * 0.55} width={w} height={h * 0.45} fill="#8CCB6B" />
            {/* barn */}
            <g transform={`translate(${x + w * 0.5} ${y + h * 0.56})`}>
              <path d={`M ${-w * 0.3} 0 V ${-h * 0.26} L 0 ${-h * 0.42} L ${w * 0.3} ${-h * 0.26} V 0 Z`} fill="#D8463E" />
              <path d={`M ${-w * 0.34} ${-h * 0.24} L 0 ${-h * 0.45} L ${w * 0.34} ${-h * 0.24}`} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="round" />
              <rect x={-w * 0.11} y={-h * 0.2} width={w * 0.22} height={h * 0.2} fill="#fff" />
              <rect x={-w * 0.09} y={-h * 0.18} width={w * 0.18} height={h * 0.18} fill="#B53A33" />
              <path d={`M ${-w * 0.09} ${-h * 0.18} L ${w * 0.09} 0 M ${w * 0.09} ${-h * 0.18} L ${-w * 0.09} 0`} stroke="#fff" strokeWidth={4} />
            </g>
            {/* fence */}
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={x + 8 + (i * (w - 16)) / 6.4} y={y + h * 0.62} width={8} height={h * 0.12} fill="#fff" opacity={0.8} />
            ))}
            <rect x={x} y={y + h * 0.65} width={w} height={6} fill="#fff" opacity={0.8} />
          </>
        )}
        {id === 'tree' && (
          <>
            <rect x={x} y={y} width={w} height={h} fill="#DFF2D0" />
            <rect x={x} y={y + h * 0.86} width={w} height={h * 0.14} fill="#8CCB6B" />
            <path d={`M ${x + w * 0.44} ${y + h} L ${x + w * 0.46} ${y + h * 0.45} L ${x + w * 0.54} ${y + h * 0.45} L ${x + w * 0.56} ${y + h} Z`} fill="#8B5A2B" />
            <path d={`M ${x + w * 0.5} ${y + h * 0.6} L ${x + w * 0.7} ${y + h * 0.45}`} stroke="#8B5A2B" strokeWidth={12} strokeLinecap="round" />
            {[
              [0.5, 0.28, 0.32],
              [0.25, 0.38, 0.22],
              [0.75, 0.38, 0.22],
              [0.38, 0.16, 0.2],
              [0.64, 0.16, 0.2],
            ].map(([cx, cy, rr], i) => (
              <circle key={i} cx={x + w * cx} cy={y + h * cy} r={w * rr} fill={i % 2 ? '#4FA64A' : '#5DB858'} />
            ))}
          </>
        )}
        {id === 'sky' && (
          <>
            <rect x={x} y={y} width={w} height={h} fill="#9FD3F7" />
            <circle cx={x + w * 0.8} cy={y + h * 0.18} r={w * 0.12} fill="#FFD54A" />
            {[
              [0.25, 0.3, 1],
              [0.65, 0.55, 0.8],
              [0.3, 0.8, 0.9],
            ].map(([cx, cy, s], i) => (
              <g key={i} fill="#fff" transform={`translate(${x + w * cx} ${y + h * cy}) scale(${(s * w) / 300})`}>
                <ellipse rx={70} ry={28} />
                <ellipse cx={-36} cy={6} rx={44} ry={24} />
                <ellipse cx={40} cy={6} rx={44} ry={22} />
              </g>
            ))}
          </>
        )}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={34} fill="none" stroke="#fff" strokeWidth={8} />
    </g>
  );
}

export const animalHomes: GameDef = {
  id: 'animal-homes',
  title: p('Animal Homes', 'Casas de Animales'),
  icon: '🏡',
  skill: p('Sorting & logic', 'Clasificar y lógica'),
  tint: '#7DB55A',
  rounds: () => 3,
  adaptive: true,
  Component: AnimalHomes,
};
