import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { num, p } from '../../engine/i18n';
import { type Piece, usePieces } from '../../engine/pieces';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { Emoji, HintHand, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

interface Eater {
  emoji: string;
  en: string;
  esAl: string; // "al oso"
  food: string;
  foodEn: [string, string]; // singular, plural
  foodEs: [string, string];
  feminine: boolean;
}

export const EATERS: Eater[] = [
  { emoji: '🐻', en: 'bear', esAl: 'al oso', food: '🍎', foodEn: ['apple', 'apples'], foodEs: ['manzana', 'manzanas'], feminine: true },
  { emoji: '🐰', en: 'bunny', esAl: 'al conejo', food: '🥕', foodEn: ['carrot', 'carrots'], foodEs: ['zanahoria', 'zanahorias'], feminine: true },
  { emoji: '🐒', en: 'monkey', esAl: 'al mono', food: '🍌', foodEn: ['banana', 'bananas'], foodEs: ['plátano', 'plátanos'], feminine: false },
  { emoji: '🐶', en: 'puppy', esAl: 'al perrito', food: '🦴', foodEn: ['bone', 'bones'], foodEs: ['hueso', 'huesos'], feminine: false },
];

export function feedPlan(level: number, seed: number, round: number) {
  const rng = makeRng(seed);
  const eater = EATERS[(seed + round) % EATERS.length];
  if (level >= 4 && round % 2 === 1) {
    const a = 1 + Math.floor(rng() * 3); // 1..3
    const b = a + 2 + Math.floor(rng() * 2); // 3..6
    const [left, right] = rng() < 0.5 ? [a, b] : [b, a];
    return { mode: 'compare' as const, eater, left: Math.min(left, 6), right: Math.min(right, 6), target: 0, available: 0 };
  }
  const ranges: Record<number, [number, number, number]> = { 1: [1, 1, 3], 2: [2, 3, 5], 3: [3, 5, 6], 4: [4, 5, 7] };
  const [lo, hi, avail] = ranges[Math.min(4, Math.max(1, level))];
  const target = lo + Math.floor(rng() * (hi - lo + 1));
  return { mode: 'feed' as const, eater, target, available: avail, left: 0, right: 0 };
}

interface FoodPiece extends Piece {
  n: number;
}

function FeedTheBear({ api }: { api: RoundApi }) {
  const plan = useMemo(() => feedPlan(api.level, api.seed, api.round), [api.level, api.seed, api.round]);
  return plan.mode === 'compare' ? <Compare api={api} plan={plan} /> : <Feed api={api} plan={plan} />;
}

function Feed({ api, plan }: { api: RoundApi; plan: ReturnType<typeof feedPlan> }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const e = plan.eater;
  const landscape = W >= H;
  const eaterX = landscape ? W * 0.27 : W / 2;
  const eaterY = landscape ? H * 0.36 : H * 0.22;
  const plateX = eaterX;
  const plateY = landscape ? H * 0.74 : H * 0.48;
  const plateR = Math.min(190, landscape ? W * 0.2 : W * 0.33);
  const food = Math.min(120, landscape ? H * 0.17 : W * 0.15);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [eating, setEating] = useState(false);
  const [nudge, setNudge] = useState<{ id: string; k: number } | null>(null);
  const toldToDrag = useRef(false);
  /** generous drop zone: anywhere over the plate or the animal */
  const overPlate = (x: number, y: number) => Math.hypot((x - plateX) / 1.15, (y - plateY) / 0.8) < plateR * 1.2 || Math.hypot(x - eaterX, y - eaterY) < plateR * 0.95;

  const slots = (k: number) => {
    const angle = (k / Math.max(plan.target, 1)) * Math.PI * 2 - Math.PI / 2;
    const r = plan.target === 1 ? 0 : plateR * 0.5;
    return { x: plateX + Math.cos(angle) * r, y: plateY + Math.sin(angle) * r * 0.55 };
  };

  const { pieces, bind } = usePieces<FoodPiece>(
    () => {
      const rng = makeRng(api.seed + 11);
      return shuffle(
        Array.from({ length: plan.available }, (_, i) => i),
        rng,
      ).map((n, i) => {
        let x: number, y: number;
        if (landscape) {
          const cols = 2;
          x = W * 0.66 + (i % cols) * food * 1.35 + (Math.floor(i / cols) % 2) * food * 0.3;
          y = H * 0.17 + Math.floor(i / cols) * food * 1.12;
        } else {
          const cols = 4;
          x = W / 2 + ((i % cols) - 1.5) * food * 1.3;
          y = H * 0.72 + Math.floor(i / cols) * food * 1.2;
        }
        return { id: 'f' + n, n, x, y, homeX: x, homeY: y, placed: false, dragging: false, wrong: 0 };
      });
    },
    ({ piece, tap, p: finger }) => {
      if (countRef.current >= plan.target) return 'home';
      if (tap) {
        // a tap doesn't feed: the food hops toward the plate to show "drag me there"
        setNudge((n) => ({ id: piece.id, k: (n?.k ?? 0) + 1 }));
        if (!toldToDrag.current) {
          toldToDrag.current = true;
          void api.say(p('Drag it to the plate!', '¡Arrástrala al plato!'));
        }
        return 'home';
      }
      if (!overPlate(piece.x, piece.y) && !overPlate(finger.x, finger.y)) return 'home';
      const k = countRef.current;
      countRef.current = k + 1;
      setCount(k + 1);
      sfx.count(k);
      void api.say(num(k + 1));
      if (k + 1 === plan.target) {
        later(() => {
          setEating(true);
          sfx.win();
          bursts.add(makeBurst(eaterX, eaterY, '#F7C431', true));
          void api.say(p('Yum! Thank you!', '¡Mmm, qué rico! ¡Gracias!'));
        }, 700);
        later(() => api.solved(), 1900);
      }
      return slots(k);
    },
  );

  useEffect(() => {
    const t = plan.target;
    api.instruct(
      L.give(e.en, e.esAl, t, { en: e.foodEn, es: e.foodEs, feminine: e.feminine }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstFree = pieces.find((x) => !x.placed);
  const dragged = pieces.find((x) => x.dragging);
  const hovering = !!dragged && overPlate(dragged.x, dragged.y);
  return (
    <g data-testid="feed" data-target={plan.target} data-count={count}>
      <rect width={W} height={H} rx={28} fill="#FDF3E1" />
      <ellipse cx={eaterX} cy={plateY + plateR * 0.2} rx={plateR * 1.35} ry={plateR * 0.5} fill="#EADBC0" opacity={0.6} />
      <g className={eating ? 'chomp' : 'breathe'} style={{ transformOrigin: `${eaterX}px ${eaterY}px` }}>
        <Emoji ch={e.emoji} x={eaterX} y={eaterY} size={Math.min(260, plateR * 1.45)} />
        {eating && <Emoji ch="😋" x={eaterX + plateR * 0.75} y={eaterY - plateR * 0.6} size={70} className="pop-in" />}
      </g>
      {/* the plate glows when food is dragged over it */}
      {(hovering || (dragged && count < plan.target)) && (
        <ellipse cx={plateX} cy={plateY} rx={plateR * 1.12} ry={plateR * 0.66} fill={hovering ? 'rgba(76,184,106,0.22)' : 'rgba(247,196,49,0.18)'} stroke={hovering ? '#4CB86A' : '#F7C431'} strokeWidth={hovering ? 10 : 6} strokeDasharray={hovering ? 'none' : '16 12'} />
      )}
      <ellipse cx={plateX} cy={plateY} rx={plateR} ry={plateR * 0.55} fill="#fff" stroke="#D9CBB0" strokeWidth={6} data-testid="plate" />
      <ellipse cx={plateX} cy={plateY} rx={plateR * 0.72} ry={plateR * 0.38} fill="none" stroke="#EFE6D4" strokeWidth={4} />
      {/* big count badge */}
      <g transform={`translate(${plateX + plateR * 0.95} ${plateY - plateR * 0.55})`}>
        <circle r={44} fill="#3D8BE8" />
        <text fontSize={52} fontWeight={800} fill="#fff" textAnchor="middle" dominantBaseline="central" data-testid="count-badge">
          {count}
        </text>
      </g>
      {pieces.map((pc, i) => (
        <g
          key={pc.id}
          {...bind(pc.id)}
          className={'piece' + (pc.dragging ? ' dragging' : '') + (pc.placed ? ' placed' : '') + (eating && pc.placed ? ' eaten' : '')}
          style={{ transform: `translate(${pc.x}px, ${pc.y}px)` }}
          data-testid="food"
          data-placed={pc.placed}
        >
          <g className="reveal" style={{ animationDelay: `${300 + i * 120}ms` }}>
            <g key={nudge?.id === pc.id ? nudge.k : 0} className={nudge?.id === pc.id ? 'hop-toward' : ''} style={{ ['--hx' as string]: `${(plateX - pc.homeX) * 0.12}px`, ['--hy' as string]: `${(plateY - pc.homeY) * 0.12}px` }}>
              {/* big invisible grab area for small fingers */}
              <circle r={food * 0.75} fill="transparent" />
              {pc.dragging && <ellipse cx={0} cy={food * 0.55} rx={food * 0.4} ry={food * 0.1} fill="#000" opacity={0.12} />}
              <Emoji ch={e.food} x={0} y={0} size={pc.placed ? food * 0.7 : food * 0.85} />
            </g>
          </g>
        </g>
      ))}
      {firstFree && <HintHand x1={firstFree.homeX} y1={firstFree.homeY + 30} x2={plateX} y2={plateY} show={api.hint} />}
      {bursts.layer}
    </g>
  );
}

function Compare({ api, plan }: { api: RoundApi; plan: ReturnType<typeof feedPlan> }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const e = plan.eater;
  const [chosen, setChosen] = useState<'left' | 'right' | null>(null);
  const [wrong, setWrong] = useState({ left: 0, right: 0 });
  const [hint, setHint] = useState(false);
  const more = plan.left > plan.right ? 'left' : 'right';
  const landscape = W >= H;
  const plateR = Math.min(200, landscape ? W * 0.2 : W * 0.38);
  const pos = {
    left: landscape ? { x: W * 0.28, y: H * 0.55 } : { x: W / 2, y: H * 0.3 },
    right: landscape ? { x: W * 0.72, y: H * 0.55 } : { x: W / 2, y: H * 0.72 },
  };
  const food = Math.min(80, plateR * 0.42);

  useEffect(() => {
    void api.instruct(L.whichMore(e.foodEn[1], e.foodEs[1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const choose = (side: 'left' | 'right') => {
    if (chosen) return;
    if (side !== more) {
      sfx.nope();
      setWrong((w) => ({ ...w, [side]: w[side] + 1 }));
      api.mistake(p('That plate has fewer. Look again!', 'Ese plato tiene menos. ¡Mira otra vez!'));
      return;
    }
    setChosen(side);
    sfx.win();
    bursts.add(makeBurst(pos[side].x, pos[side].y, '#F7C431', true));
    const n = side === 'left' ? plan.left : plan.right;
    void api.say(L.yesMore(n));
    later(() => api.solved(), 2000);
  };

  return (
    <g data-testid="compare" data-more={more}>
      <rect width={W} height={H} rx={28} fill="#FDF3E1" />
      <Emoji ch={e.emoji} x={W / 2} y={landscape ? H * 0.16 : H * 0.51} size={landscape ? 130 : 110} />
      {(['left', 'right'] as const).map((side) => {
        const n = side === 'left' ? plan.left : plan.right;
        const c = pos[side];
        return (
          <g
            key={side}
            data-testid={`plate-${side}`}
            onPointerDown={(ev) => {
              ev.preventDefault();
              choose(side);
            }}
          >
            <g key={wrong[side]} className={wrong[side] ? 'wiggle' : chosen === side ? 'bounce' : ''} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
              {hint && side === more && <circle cx={c.x} cy={c.y} r={plateR * 1.1} className="glow-ring" data-testid="hint-glow" />}
              <circle cx={c.x} cy={c.y} r={plateR} fill="#fff" stroke={chosen === side ? '#4CB86A' : '#D9CBB0'} strokeWidth={chosen === side ? 12 : 6} />
              {Array.from({ length: n }, (_, i) => {
                const a = (i / n) * Math.PI * 2;
                const rr = n === 1 ? 0 : plateR * 0.55;
                return <Emoji key={i} ch={e.food} x={c.x + Math.cos(a) * rr} y={c.y + Math.sin(a) * rr} size={food} />;
              })}
              {chosen === side && <Emoji ch="✅" x={c.x + plateR * 0.8} y={c.y - plateR * 0.8} size={70} className="pop-in" />}
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

export const feedTheBear: GameDef = {
  id: 'feed-the-bear',
  title: p('Feed the Animals', 'Dales de Comer'),
  icon: '🍎',
  skill: p('Counting & comparing', 'Contar y comparar'),
  tint: '#C0392B',
  rounds: () => 3,
  adaptive: true,
  Component: FeedTheBear,
};
