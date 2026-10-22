// Más o Menos: comparing amounts, the first step toward subtraction.
//  - Compare rounds: two rows of food, lined up in columns. "¿Cuál tiene más?" (or menos).
//    After the answer, the rows pair up one-to-one and the extras light up: "¡Dos más!"
//    That leftover is the difference, so the child sees what "more" means.
//  - Take-away rounds (levels 3–4): "Hay 5 manzanas. El oso se come 2. ¿Cuántas quedan?"

import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { num, p } from '../../engine/i18n';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import { EATERS } from '../feed/FeedTheBear';
import type { GameDef, RoundApi } from '../types';

type Ask = 'more' | 'less';

export function moreLessPlan(level: number, sessionSeed: number, round: number) {
  const rng = makeRng(sessionSeed * 13 + round * 71 + level);
  const eater = EATERS[(sessionSeed + round) % EATERS.length];
  const lvl = Math.min(4, Math.max(1, level));
  if (lvl >= 3 && round % 2 === 1) {
    // take-away: start, eaten, left
    const [lo, hi, maxEat] = lvl === 3 ? [3, 6, 2] : [4, 9, 4];
    const start = lo + Math.floor(rng() * (hi - lo + 1));
    const eat = 1 + Math.floor(rng() * Math.min(maxEat, start - 1));
    const left = start - eat;
    const opts = new Set([left]);
    for (const d of shuffle([-2, -1, 1, 2], rng)) {
      if (opts.size >= 3) break;
      const v = left + d;
      if (v >= 0 && v <= start) opts.add(v);
    }
    return { kind: 'takeaway' as const, eater, start, eat, left, options: [...opts].sort((a, b) => a - b), a: 0, b: 0, ask: 'more' as Ask };
  }
  // compare: [max amount, smallest difference]
  const [max, minDiff] = ({ 1: [5, 3], 2: [6, 2], 3: [8, 1], 4: [10, 1] } as Record<number, [number, number]>)[lvl];
  const small = 1 + Math.floor(rng() * (max - minDiff));
  const big = Math.min(max, small + minDiff + Math.floor(rng() * (max - small - minDiff + 1)));
  const [a, b] = rng() < 0.5 ? [small, big] : [big, small];
  // little one: always "more"; then more and less take turns
  const ask: Ask = lvl === 1 ? 'more' : round % 2 === 0 ? 'more' : 'less';
  return { kind: 'compare' as const, eater, a, b, ask, start: 0, eat: 0, left: 0, options: [] as number[] };
}

function MoreLess({ api }: { api: RoundApi }) {
  const plan = useMemo(() => moreLessPlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  return plan.kind === 'compare' ? <Compare api={api} plan={plan} /> : <TakeAway api={api} plan={plan} />;
}

type Plan = ReturnType<typeof moreLessPlan>;

function Compare({ api, plan }: { api: RoundApi; plan: Plan }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const food = plan.eater.food;
  const max = Math.max(plan.a, plan.b);
  const rowH = H * 0.4;
  const rows = [
    { key: 'top', n: plan.a, y: H * 0.06 },
    { key: 'bottom', n: plan.b, y: H * 0.54 },
  ];
  const right: 'top' | 'bottom' = (plan.ask === 'more') === plan.a > plan.b ? 'top' : 'bottom';
  const colW = Math.min(150, (W - 160) / max);
  const item = Math.min(colW * 0.82, rowH * 0.6);
  const x0 = (W - colW * max) / 2 + colW / 2;
  const [chosen, setChosen] = useState<string | null>(null);
  const [paired, setPaired] = useState(0);
  const [extra, setExtra] = useState(0);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);
  const [shown, setShown] = useState(0);
  const diff = Math.abs(plan.a - plan.b);
  const pairs = Math.min(plan.a, plan.b);

  useEffect(() => {
    // items appear one column at a time, so the child can see the rows grow
    for (let i = 1; i <= max; i++) later(() => setShown(i), 200 + i * 160);
    void api.instruct(plan.ask === 'more' ? p('Which one has more?', '¿Cuál tiene más?') : p('Which one has less?', '¿Cuál tiene menos?'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const choose = (key: string) => {
    if (chosen) return;
    if (key !== right) {
      sfx.nope();
      setWrong((w) => ({ ...w, [key]: (w[key] ?? 0) + 1 }));
      void api.mistake(false);
      return;
    }
    setChosen(key);
    sfx.win();
    // pair them up one by one, then light up the extras
    for (let i = 1; i <= pairs; i++) later(() => setPaired(i), i * 260);
    for (let k = 1; k <= diff; k++)
      later(() => {
        setExtra(k);
        sfx.count(k - 1);
      }, pairs * 260 + 300 + k * 450);
    later(() => {
      const r = rows.find((x) => x.key === key)!;
      bursts.add(makeBurst(W / 2, r.y + rowH / 2, '#F7C431', true));
      void api.say(plan.ask === 'more' ? L.moreBy(diff) : L.lessBy(diff));
    }, pairs * 260 + 400 + diff * 450);
    later(() => api.solved(), pairs * 260 + 2200 + diff * 450);
  };

  const bigger = plan.a > plan.b ? 'top' : 'bottom';
  return (
    <g data-testid="more-less" data-kind="compare" data-ask={plan.ask} data-right={right}>
      <rect width={W} height={H} rx={28} fill="#F1F7FF" />
      {rows.map((r) => {
        const isRight = r.key === right;
        return (
          <g
            key={r.key}
            data-testid={`row-${r.key}`}
            data-count={r.n}
            onPointerDown={(e) => {
              e.preventDefault();
              choose(r.key);
            }}
          >
            <g key={wrong[r.key] ?? 0} className={wrong[r.key] ? 'wiggle-x' : ''} style={{ transformOrigin: `${W / 2}px ${r.y + rowH / 2}px` }}>
              {hint && isRight && <rect x={20} y={r.y - 8} width={W - 40} height={rowH + 16} rx={40} className="glow-rect" data-testid="hint-glow" />}
              <rect x={30} y={r.y} width={W - 60} height={rowH} rx={36} fill={chosen === r.key ? '#DFF3E4' : '#fff'} stroke={chosen === r.key ? '#4CB86A' : '#D6E4F5'} strokeWidth={chosen === r.key ? 10 : 6} />
              {Array.from({ length: Math.min(r.n, shown) }, (_, i) => {
                const x = x0 + i * colW;
                const isExtra = chosen && r.key === bigger && i >= pairs;
                const lit = isExtra && i - pairs < extra;
                return (
                  <g key={i} className="pop-in">
                    {lit && <circle cx={x} cy={r.y + rowH / 2} r={item * 0.62} fill="#FFE27A" />}
                    <Emoji ch={food} x={x} y={r.y + rowH / 2} size={item} className={lit ? 'bounce' : ''} />
                    {lit && (
                      <text x={x} y={r.y + rowH / 2 + item * 0.72} fontSize={item * 0.36} fontWeight={900} fill="#E8524A" textAnchor="middle" dominantBaseline="hanging">
                        {i - pairs + 1}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
      {/* one-to-one pairs: a line joins each top item to the one below it */}
      {Array.from({ length: paired }, (_, i) => (
        <line key={i} x1={x0 + i * colW} y1={rows[0].y + rowH / 2 + item * 0.5} x2={x0 + i * colW} y2={rows[1].y + rowH / 2 - item * 0.5} stroke="#3D8BE8" strokeWidth={6} strokeDasharray="10 8" strokeLinecap="round" className="pop-in" />
      ))}
      {bursts.layer}
    </g>
  );
}

function TakeAway({ api, plan }: { api: RoundApi; plan: Plan }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const e = plan.eater;
  const foodWords = { en: e.foodEn, es: e.foodEs, feminine: e.feminine };
  const landscape = W >= H;
  const eaterX = landscape ? W * 0.14 : W * 0.18;
  const eaterY = H * 0.3;
  const eaterSize = Math.min(220, H * 0.34);
  const rowX0 = landscape ? W * 0.32 : W * 0.32;
  const slot = Math.min(110, (W - rowX0 - 30) / plan.start);
  const rowY = H * 0.3;
  const [eaten, setEaten] = useState(0);
  const [stage, setStage] = useState<'show' | 'eat' | 'ask' | 'done'>('show');
  const [counted, setCounted] = useState(0);
  const [wrong, setWrong] = useState<Record<number, number>>({});
  const [hint, setHint] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const run = async () => {
      await api.say(L.thereAre(plan.start, foodWords));
      if (!alive.current) return;
      setStage('eat');
      await api.say(L.eats(e.en, e.esAl, plan.eat, foodWords));
      for (let k = 1; k <= plan.eat; k++) {
        await new Promise((r) => later(() => r(null), 650));
        if (!alive.current) return;
        setEaten(k);
        sfx.pop();
      }
      await new Promise((r) => later(() => r(null), 500));
      if (!alive.current) return;
      setStage('ask');
      void api.instruct(L.howManyLeft(e.feminine));
    };
    void run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const choose = (n: number, x: number, y: number) => {
    if (stage !== 'ask') return;
    if (n !== plan.left) {
      sfx.nope();
      setWrong((w) => ({ ...w, [n]: (w[n] ?? 0) + 1 }));
      void api.mistake(false);
      return;
    }
    setStage('done');
    sfx.win();
    bursts.add(makeBurst(x, y, '#F7C431', true));
    // count what's left, one by one
    for (let k = 1; k <= plan.left; k++)
      later(() => {
        setCounted(k);
        sfx.count(k - 1);
      }, k * 420);
    later(() => void api.say(L.leftYes(plan.left, e.feminine)), plan.left * 420 + 200);
    later(() => api.solved(), plan.left * 420 + 2000);
  };

  const n = plan.options.length;
  const card = Math.min(170, (W - 80) / n - 30, H * 0.26);
  return (
    <g data-testid="more-less" data-kind="takeaway" data-left={plan.left}>
      <rect width={W} height={H} rx={28} fill="#FFF6E8" />
      <g className={eaten > 0 && stage === 'eat' ? 'chomp' : 'breathe'} style={{ transformOrigin: `${eaterX}px ${eaterY}px` }}>
        <Emoji ch={e.emoji} x={eaterX} y={eaterY} size={eaterSize} />
      </g>
      <rect x={rowX0 - slot * 0.6} y={rowY - slot * 0.7} width={slot * plan.start + slot * 0.2} height={slot * 1.4} rx={slot * 0.7} fill="#fff" stroke="#EBDCC2" strokeWidth={5} />
      {Array.from({ length: plan.start }, (_, i) => {
        // the eater takes them from the left end of the row
        const gone = i < eaten;
        const x = rowX0 + i * slot;
        const keptIndex = i - plan.eat;
        const lit = stage === 'done' && keptIndex >= 0 && keptIndex < counted;
        return (
          <g key={i} className={gone ? 'eaten-away' : ''} style={gone ? { ['--ex' as string]: `${eaterX - x}px` } : undefined}>
            {lit && <circle cx={x} cy={rowY} r={slot * 0.48} fill="#FFE27A" />}
            <Emoji ch={e.food} x={x} y={rowY} size={slot * 0.78} />
            {lit && (
              <text x={x} y={rowY + slot * 0.55} fontSize={slot * 0.34} fontWeight={900} fill="#E8524A" textAnchor="middle" dominantBaseline="hanging">
                {keptIndex + 1}
              </text>
            )}
          </g>
        );
      })}
      {(stage === 'ask' || stage === 'done') &&
        plan.options.map((o, i) => {
          const x = W / 2 + (i - (n - 1) / 2) * (card + 30);
          const y = H * 0.74;
          const right = o === plan.left;
          return (
            <g
              key={o}
              data-testid={`answer-${o}`}
              onPointerDown={(ev) => {
                ev.preventDefault();
                choose(o, x, y);
              }}
            >
              <g className="reveal" style={{ animationDelay: `${i * 300}ms` }}>
                <g key={wrong[o] ?? 0} className={wrong[o] ? 'wiggle' : stage === 'done' && right ? 'bounce' : ''} style={{ transformOrigin: `${x}px ${y}px` }}>
                  {hint && right && <circle cx={x} cy={y} r={card * 0.66} className="glow-ring" data-testid="hint-glow" />}
                  <circle cx={x} cy={y + 7} r={card / 2} fill="#E8D7BC" />
                  <circle cx={x} cy={y} r={card / 2} fill={stage === 'done' && right ? '#DFF3E4' : '#fff'} stroke={stage === 'done' && right ? '#4CB86A' : '#F0C987'} strokeWidth={8} />
                  <text x={x} y={y} fontSize={card * 0.55} fontWeight={900} fill="#5A4A2E" textAnchor="middle" dominantBaseline="central">
                    {o}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      {bursts.layer}
    </g>
  );
}

export const moreLess: GameDef = {
  id: 'more-less',
  title: p('More or Less', 'Más o Menos'),
  icon: '⚖️',
  skill: p('Comparing & taking away', 'Comparar y quitar'),
  tint: '#2BB3B1',
  rounds: () => 3,
  adaptive: true,
  Component: MoreLess,
};

/** every number word the game can say (for the voice list) */
export const MORE_LESS_RANGE = Array.from({ length: 10 }, (_, i) => num(i + 1));
