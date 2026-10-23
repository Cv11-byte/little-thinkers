// Boss game: the astronaut's rocket needs fixing before it can fly home.
// Each round is one repair step that uses a skill from the other games:
//   0 colors (fuel)  1 counting (star power)  2 shapes (door)
//   3 memory (lights)  4 kindness (alien friend)  5 numbers (countdown)
// The rocket keeps the parts already fixed, so the child sees it come together.

import { useEffect, useMemo, useRef, useState } from 'react';
import { L } from '../../engine/lines';
import { COLORS, type ColorId, type Phrase, num, p } from '../../engine/i18n';
import { makeRng, pickN, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import { SHAPES, Shape, type ShapeId } from '../shapes/shapes';
import { NEEDS, NeedFriend, TOYS } from '../../components/needs';

/** what the sad alien can need (clear, everyday needs) */
export const BOSS_NEEDS = ['cold', 'hungry', 'sleepy', 'hurt', 'thirsty'] as const;
import type { GameDef, RoundApi } from '../types';

export const BOSS_STEPS = ['fuel', 'stars', 'door', 'lights', 'friend', 'countdown'] as const;
const STEP_ICONS = ['⛽', '⭐', '🚪', '💡', '👽', '🚀'];

export const FUEL_COLORS: ColorId[] = ['red', 'blue', 'yellow', 'green', 'purple'];
export const DOOR_SHAPES: ShapeId[] = ['circle', 'square', 'triangle', 'star', 'heart'];

export function bossPlan(level: number, seed: number) {
  const rng = makeRng(seed);
  const nChoices = level <= 1 ? 2 : level >= 4 ? 4 : 3;
  const fuel = pickN(FUEL_COLORS, nChoices, rng);
  const fuelTarget = fuel[Math.floor(rng() * fuel.length)];
  const stars = level <= 1 ? 2 : level === 2 ? 3 : level === 3 ? 4 : 5;
  const doors = pickN(DOOR_SHAPES, nChoices, rng);
  const door = doors[Math.floor(rng() * doors.length)];
  const lights = level <= 1 ? 2 : 3;
  const seqLen = level <= 1 ? 1 : level === 2 ? 2 : 3;
  const seq: number[] = [];
  while (seq.length < seqLen) {
    const k = Math.floor(rng() * lights);
    if (!seq.length || seq[seq.length - 1] !== k) seq.push(k);
  }
  const needs = BOSS_NEEDS[Math.floor(rng() * BOSS_NEEDS.length)];
  const countFrom = level <= 1 ? 0 : level >= 4 ? 5 : 3;
  return { fuel, fuelTarget, stars, doors, door, lights, seq, needs, countFrom, nChoices };
}

type Plan = ReturnType<typeof bossPlan>;

function RocketRescue({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  // one plan for the whole boss level, so the rocket parts stay the same between steps
  const planSeed = useRef(api.seed - api.round * 101);
  const plan = useMemo(() => bossPlan(api.level, planSeed.current), [api.level]);
  const landscape = W >= H;
  const rocket = landscape ? { x: W * 0.22, y: H * 0.56, s: Math.min(H / 640, W / 1100) } : { x: W / 2, y: H * 0.3, s: Math.min(H / 1150, W / 820) };
  const area = landscape ? { x: W * 0.42, y: 110, w: W * 0.56, h: H - 130 } : { x: 20, y: H * 0.56, w: W - 40, h: H * 0.42 };
  const step = BOSS_STEPS[Math.min(api.round, BOSS_STEPS.length - 1)];
  const [launch, setLaunch] = useState(false);

  return (
    <g data-testid="boss" data-step={step}>
      <SpaceBackdrop W={W} H={H} seed={planSeed.current} />
      {/* progress across the top */}
      <g transform={`translate(${W / 2} 52)`}>
        {STEP_ICONS.map((ic, i) => {
          const x = (i - 2.5) * 86;
          const done = i < api.round;
          const now = i === api.round;
          return (
            <g key={i} transform={`translate(${x} 0)`}>
              {i < 5 && <line x1={0} y1={0} x2={86} y2={0} stroke={done ? '#F7C431' : '#3B4A78'} strokeWidth={6} />}
              <circle r={now ? 34 : 28} fill={done ? '#F7C431' : now ? '#fff' : '#2A3763'} stroke={now ? '#F7C431' : 'none'} strokeWidth={5} className={now ? 'pulse-soft' : ''} />
              <Emoji ch={done ? '✔️' : ic} x={0} y={0} size={now ? 34 : 28} style={{ opacity: done || now ? 1 : 0.5 }} />
            </g>
          );
        })}
      </g>
      <Rocket x={rocket.x} y={rocket.y} s={rocket.s} done={api.round} plan={plan} launch={launch} focus={step} />
      {step === 'fuel' && <FuelStep api={api} plan={plan} area={area} rocket={rocket} />}
      {step === 'stars' && <StarsStep api={api} plan={plan} area={area} rocket={rocket} />}
      {step === 'door' && <DoorStep api={api} plan={plan} area={area} />}
      {step === 'lights' && <LightsStep api={api} plan={plan} area={area} />}
      {step === 'friend' && <FriendStep api={api} plan={plan} area={area} />}
      {step === 'countdown' && <CountdownStep api={api} plan={plan} area={area} onLaunch={() => setLaunch(true)} />}
    </g>
  );
}

// ---------------- scenery ----------------

function SpaceBackdrop({ W, H, seed }: { W: number; H: number; seed: number }) {
  const stars = useMemo(() => {
    const rng = makeRng(seed + 99);
    return Array.from({ length: 60 }, () => ({ x: rng() * W, y: rng() * H, r: 1 + rng() * 2.6, d: rng() * 3 }));
  }, [W, H, seed]);
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="space" cx="0.3" cy="0.2" r="1">
          <stop offset="0" stopColor="#2E3F7A" />
          <stop offset="1" stopColor="#141B38" />
        </radialGradient>
        <radialGradient id="planet" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFB38A" />
          <stop offset="1" stopColor="#D9674A" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} rx={28} fill="url(#space)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className={i % 3 === 0 ? 'twinkle' : ''} style={{ animationDelay: `${s.d}s` }} opacity={0.8} />
      ))}
      {/* planet tucked in the bottom-left corner, away from the buttons */}
      <circle cx={40} cy={H - 30} r={95} fill="url(#planet)" opacity={0.9} />
      <ellipse cx={40} cy={H - 30} rx={140} ry={24} fill="none" stroke="#FFD9A8" strokeWidth={7} opacity={0.6} transform={`rotate(-15 40 ${H - 30})`} />
      <circle cx={70} cy={H - 70} r={14} fill="#C25A40" opacity={0.6} />
    </g>
  );
}

function Rocket({ x, y, s, done, plan, launch, focus }: { x: number; y: number; s: number; done: number; plan: Plan; launch: boolean; focus?: string }) {
  const fuelColor = COLORS[plan.fuelTarget].hex;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} data-testid="rocket">
      <g className={launch ? 'rocket-go' : 'rocket-idle'}>
        {/* flame when launching or fueled */}
        {(launch || done >= 1) && (
          <g className="flame" transform="translate(0 205)">
            <path d="M -48 0 Q -30 120 0 170 Q 30 120 48 0 Z" fill="#F7A531" />
            <path d="M -26 0 Q -16 80 0 115 Q 16 80 26 0 Z" fill="#FFE27A" />
          </g>
        )}
        {/* fins */}
        <path d="M -78 120 L -150 215 L -150 250 L -78 205 Z" fill="#D9473F" />
        <path d="M 78 120 L 150 215 L 150 250 L 78 205 Z" fill="#D9473F" />
        {/* body */}
        <path d="M 0 -250 C 95 -170 100 -40 92 210 L -92 210 C -100 -40 -95 -170 0 -250 Z" fill="#F3F1EC" stroke="#C9C2B4" strokeWidth={6} />
        <path d="M 0 -250 C 50 -210 70 -170 78 -130 L -78 -130 C -70 -170 -50 -210 0 -250 Z" fill="#D9473F" />
        <rect x={-92} y={190} width={184} height={28} rx={10} fill="#8C93A6" />
        {/* window */}
        <circle cx={0} cy={-55} r={52} fill="#7C8AA8" />
        <circle cx={0} cy={-55} r={42} fill={done >= 2 ? '#2B3C77' : '#9FC7EE'} />
        {done >= 2 &&
          Array.from({ length: plan.stars }, (_, i) => {
            const a = (i / plan.stars) * Math.PI * 2;
            return (
              <text key={i} x={Math.cos(a) * 22} y={-55 + Math.sin(a) * 22} fontSize={22} textAnchor="middle" dominantBaseline="central" className="twinkle">
                ⭐
              </text>
            );
          })}
        {done >= 5 && (
          <text x={0} y={-50} fontSize={46} textAnchor="middle" dominantBaseline="central" className="pop-in">
            👽
          </text>
        )}
        <ellipse cx={-16} cy={-74} rx={10} ry={16} fill="#fff" opacity={0.45} transform="rotate(30 -16 -74)" />
        {/* the part being fixed right now glows, so it's clear what's missing */}
        {focus === 'stars' && done < 2 && <circle cx={0} cy={-55} r={64} className="part-glow" data-testid="part-glow" />}
        {focus === 'lights' && done < 4 && <rect x={-58} y={-174} width={116} height={48} rx={24} className="part-glow" data-testid="part-glow" />}
        {focus === 'fuel' && done < 1 && <rect x={94} y={-114} width={48} height={210} rx={24} className="part-glow" data-testid="part-glow" />}
        {/* door */}
        <g transform="translate(0 90)">
          {focus === 'door' && done < 3 && (
            <g className="goal-pulse" data-testid="part-glow">
              <Shape id={plan.door} r={56} fill="#FFE27A" />
              <Shape id={plan.door} r={50} fill="none" stroke="#F7C431" sw={8} />
            </g>
          )}
          {done >= 3 ? (
            <Shape id={plan.door} r={42} fill={SHAPES[plan.door].color} stroke="#B88A2E" sw={7} />
          ) : (
            <Shape id={plan.door} r={42} fill="#3A3F52" stroke="#8C93A6" sw={6} />
          )}
        </g>
        {/* nose lights */}
        {[-34, 0, 34].map((lx, i) => (
          <circle key={i} cx={lx} cy={-150} r={10} fill={done >= 4 ? ['#4CB86A', '#F7C431', '#3D8BE8'][i] : '#B9B3A6'} className={done >= 4 ? 'blink' : ''} style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
        {/* fuel gauge */}
        <g transform="translate(118 -10)">
          <rect x={-14} y={-90} width={28} height={180} rx={14} fill="#2A3763" stroke="#8C93A6" strokeWidth={5} />
          <rect x={-8} y={done >= 1 ? -82 : 80} width={16} height={done >= 1 ? 164 : 2} rx={8} fill={fuelColor} className="fuel-fill" />
          <text y={-112} fontSize={28} textAnchor="middle" dominantBaseline="central">
            ⛽
          </text>
        </g>
      </g>
    </g>
  );
}

// ---------------- steps ----------------

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface StepProps {
  api: RoundApi;
  plan: Plan;
  area: Area;
}

function useHint(api: RoundApi) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!api.hint) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);
  return on;
}

function rowPositions(area: Area, n: number, size: number) {
  const gap = Math.min(40, (area.w - n * size) / Math.max(1, n - 1));
  const total = n * size + (n - 1) * gap;
  return Array.from({ length: n }, (_, i) => ({ x: area.x + (area.w - total) / 2 + i * (size + gap) + size / 2, y: area.y + area.h / 2 }));
}

function FuelStep({ api, plan, area, rocket }: StepProps & { rocket: { x: number; y: number; s: number } }) {
  const later = useTimers();
  const bursts = useBursts();
  const hint = useHint(api);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [chosen, setChosen] = useState<ColorId | null>(null);
  const size = Math.min(170, area.w / (plan.fuel.length + 0.6));
  const pos = rowPositions(area, plan.fuel.length, size);

  useEffect(() => {
    void api.instruct([
      p("Let's fix the rocket so the astronaut can fly home!", '¡Arreglemos el cohete para que el astronauta vuelva a casa!'),
      L.fuelFirst(plan.fuelTarget, fuelEs(plan.fuelTarget)),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g data-testid="fuel-step" data-target={plan.fuelTarget}>
      {plan.fuel.map((c, i) => {
        const q = pos[i];
        const isChosen = chosen === c;
        const tx = isChosen ? rocket.x + 118 * rocket.s - q.x : 0;
        const ty = isChosen ? rocket.y - q.y : 0;
        return (
          <g
            key={c}
            data-testid={`fuel-${c}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (chosen) return;
              if (c !== plan.fuelTarget) {
                sfx.nope();
                setWrong((w) => ({ ...w, [c]: (w[c] ?? 0) + 1 }));
                void api.mistake([L.fuelThatOne(c, fuelEs(c)), L.fuelFind(plan.fuelTarget, fuelEs(plan.fuelTarget))]);
                return;
              }
              setChosen(c);
              sfx.snap();
              bursts.add(makeBurst(q.x, q.y, COLORS[c].hex));
              void api.say(L.fuelGlug(c, fuelEs(c)));
              later(() => api.solved(), 1500);
            }}
            className="piece"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${isChosen ? 0.3 : 1})`, transformOrigin: `${q.x}px ${q.y}px`, transition: 'transform 0.8s ease-in' }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 400}ms` }}>
              <g key={wrong[c] ?? 0} className={wrong[c] ? 'wiggle' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }}>
                {hint && c === plan.fuelTarget && <circle cx={q.x} cy={q.y} r={size * 0.62} className="glow-ring" data-testid="hint-glow" />}
                <FuelCan x={q.x} y={q.y} size={size} color={COLORS[c].hex} dark={COLORS[c].dark} />
              </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

export const fuelEs = (c: ColorId) => {
  // "lata" is feminine
  const fem: Record<ColorId, string> = { red: 'roja', blue: 'azul', yellow: 'amarilla', green: 'verde', purple: 'morada', orange: 'anaranjada', pink: 'rosa' };
  return fem[c];
};

function FuelCan({ x, y, size, color, dark }: { x: number; y: number; size: number; color: string; dark: string }) {
  const w = size * 0.62;
  const h = size * 0.82;
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      <rect x={-6} y={-6} width={w + 12} height={h + 12} fill="transparent" />
      <rect x={w * 0.55} y={-h * 0.12} width={w * 0.22} height={h * 0.18} rx={5} fill={dark} />
      <rect width={w} height={h} rx={w * 0.18} fill={color} stroke={dark} strokeWidth={6} />
      <rect x={w * 0.12} y={h * 0.08} width={w * 0.14} height={h * 0.84} rx={6} fill="#fff" opacity={0.3} />
      <path d={`M ${w / 2} ${h * 0.32} q ${w * 0.2} ${h * 0.22} 0 ${h * 0.36} q ${-w * 0.2} ${-h * 0.14} 0 ${-h * 0.36} Z`} fill="#fff" opacity={0.85} />
    </g>
  );
}

function StarsStep({ api, plan, area, rocket }: StepProps & { rocket: { x: number; y: number; s: number } }) {
  const later = useTimers();
  const hint = useHint(api);
  const [taken, setTaken] = useState<number[]>([]);
  const takenRef = useRef<number[]>([]);
  const total = plan.stars + 2;
  const spots = useMemo(() => {
    const rng = makeRng(plan.stars * 31 + 7);
    const cols = Math.ceil(total / 2);
    return Array.from({ length: total }, (_, i) => ({
      x: area.x + ((i % cols) + 0.5) * (area.w / cols) + (rng() - 0.5) * 30,
      y: area.y + (Math.floor(i / cols) + 0.5) * (area.h / 2) + (rng() - 0.5) * 30,
    }));
  }, [area.x, area.y, area.w, area.h, total, plan.stars]);
  const size = Math.min(130, area.w / (Math.ceil(total / 2) + 0.4), area.h / 2.6);

  useEffect(() => {
    void api.instruct(L.starPower(plan.stars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wx = rocket.x;
  const wy = rocket.y - 55 * rocket.s;
  return (
    <g data-testid="stars-step" data-target={plan.stars} data-count={taken.length}>
      {spots.map((q, i) => {
        const got = taken.includes(i);
        return (
          <g
            key={i}
            data-testid="power-star"
            data-taken={got}
            className="piece"
            style={{
              transform: got ? `translate(${wx - q.x}px, ${wy - q.y}px) scale(0.2)` : 'none',
              transformOrigin: `${q.x}px ${q.y}px`,
              transition: 'transform 0.7s ease-in, opacity 0.7s',
              opacity: got ? 0 : 1,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              if (got || takenRef.current.length >= plan.stars) return;
              const next = [...takenRef.current, i];
              takenRef.current = next;
              setTaken(next);
              sfx.count(next.length - 1);
              void api.say(num(next.length));
              if (next.length === plan.stars) {
                later(() => {
                  sfx.win();
                  void api.say(p('Star power!', '¡Poder de estrellas!'));
                }, 700);
                later(() => api.solved(), 1900);
              }
            }}
          >
            <circle cx={q.x} cy={q.y} r={size * 0.55} fill="transparent" />
            {hint && !got && <circle cx={q.x} cy={q.y} r={size * 0.5} className="glow-ring" data-testid="hint-glow" />}
            <Emoji ch="⭐" x={q.x} y={q.y} size={size * 0.75} className="bob-small" style={{ animationDelay: `${i * 0.3}s` }} />
          </g>
        );
      })}
      {/* counter */}
      <g transform={`translate(${area.x + area.w - 60} ${area.y + 20})`}>
        <circle r={42} fill="#F7C431" />
        <text fontSize={44} fontWeight={800} textAnchor="middle" dominantBaseline="central" fill="#2A3763">
          {taken.length}
        </text>
      </g>
    </g>
  );
}

function DoorStep({ api, plan, area }: StepProps) {
  const later = useTimers();
  const bursts = useBursts();
  const hint = useHint(api);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const n = plan.doors.length;
  const size = Math.min(170, area.w / (n + 0.6));
  const pos = rowPositions({ ...area, y: area.y + area.h * 0.15 }, n, size);

  useEffect(() => {
    void api.instruct(p('The door is missing! Which piece fits the door?', '¡Falta la puerta! ¿Qué pieza le queda a la puerta?'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g data-testid="door-step" data-target={plan.door}>
      {plan.doors.map((s, i) => {
        const q = pos[i];
        return (
          <g
            key={s}
            data-testid={`door-${s}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (done) return;
              if (s !== plan.door) {
                sfx.nope();
                setWrong((w) => ({ ...w, [s]: (w[s] ?? 0) + 1 }));
                void api.mistake(L.shapeNoFit(SHAPES[s].name));
                return;
              }
              setDone(true);
              sfx.snap();
              bursts.add(makeBurst(q.x, q.y, SHAPES[s].color));
              void api.say(L.shapeFits(SHAPES[s].name));
              later(() => api.solved(), 1500);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 400}ms` }}>
            <g key={wrong[s] ?? 0} className={wrong[s] ? 'wiggle' : done && s === plan.door ? 'bounce' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }}>
              <circle cx={q.x} cy={q.y} r={size * 0.55} fill="#fff" opacity={0.12} />
              {hint && s === plan.door && <circle cx={q.x} cy={q.y} r={size * 0.58} className="glow-ring" data-testid="hint-glow" />}
              <g transform={`translate(${q.x} ${q.y})`}>
                <Shape id={s} r={size * 0.36} fill={SHAPES[s].color} stroke={SHAPES[s].dark} sw={6} />
              </g>
            </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

function LightsStep({ api, plan, area }: StepProps) {
  const later = useTimers();
  const hint = useHint(api);
  const [phase, setPhase] = useState<'watch' | 'play' | 'done'>('watch');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [lit, setLit] = useState<number | null>(null);
  const stepRef = useRef(0);
  const [step, setStep] = useState(0);
  const colors = ['#4CB86A', '#F7C431', '#3D8BE8'];
  const names: Phrase[] = [p('green', 'verde'), p('yellow', 'amarillo'), p('blue', 'azul')];
  const size = Math.min(170, area.w / (plan.lights + 0.8));
  const pos = rowPositions(area, plan.lights, size);

  const play = () => {
    setPhase('watch');
    phaseRef.current = 'watch';
    stepRef.current = 0;
    setStep(0);
    plan.seq.forEach((k, i) => {
      later(() => {
        setLit(k);
        sfx.pad(k);
        void api.say(names[k]);
      }, 400 + i * 1100);
      later(() => setLit(null), 400 + i * 1100 + 700);
    });
    later(() => {
      setPhase('play');
      phaseRef.current = 'play';
    }, 400 + plan.seq.length * 1100);
  };

  useEffect(() => {
    void api.instruct(p('Now the lights! Watch, then copy me.', '¡Ahora las luces! Mira y luego cópiame.')).then(play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g data-testid="lights-step" data-seq={plan.seq.join(',')} data-phase={phase}>
      <rect x={area.x + 10} y={area.y + area.h / 2 - size * 0.8} width={area.w - 20} height={size * 1.6} rx={40} fill="#2A3763" stroke="#8C93A6" strokeWidth={6} />
      {pos.map((q, i) => {
        const isLit = lit === i;
        return (
          <g
            key={i}
            data-testid={`light-${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (phaseRef.current !== 'play') return;
              if (plan.seq[stepRef.current] !== i) {
                sfx.nope();
                setPhase('watch');
                phaseRef.current = 'watch';
                void api.mistake(p("Oops! Let's watch again.", '¡Ups! Miremos otra vez.')).then(play);
                return;
              }
              setLit(i);
              sfx.pad(i);
              later(() => setLit((l) => (l === i ? null : l)), 350);
              stepRef.current += 1;
              setStep(stepRef.current);
              if (stepRef.current >= plan.seq.length) {
                setPhase('done');
                phaseRef.current = 'done';
                later(() => {
                  sfx.win();
                  void api.say(p('The lights work!', '¡Las luces funcionan!'));
                }, 300);
                later(() => api.solved(), 1700);
              }
            }}
          >
            {hint && phase === 'play' && plan.seq[step] === i && <circle cx={q.x} cy={q.y} r={size * 0.56} className="glow-ring" data-testid="hint-glow" />}
            <circle cx={q.x} cy={q.y} r={size * 0.44} fill={colors[i]} opacity={isLit ? 1 : 0.35} stroke="#fff" strokeWidth={isLit ? 12 : 4} className={isLit ? 'pad-lit' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }} />
            {isLit && <circle cx={q.x} cy={q.y} r={size * 0.6} fill={colors[i]} opacity={0.3} />}
          </g>
        );
      })}
    </g>
  );
}

function FriendStep({ api, plan, area }: StepProps) {
  const later = useTimers();
  const bursts = useBursts();
  const hint = useHint(api);
  const need = NEEDS[plan.needs];
  const items = useMemo(() => {
    const toys = TOYS.slice(0, plan.nChoices - 1).map((t) => ({ emoji: t.emoji, right: false }));
    return shuffle([{ emoji: need.helper.emoji, right: true }, ...toys], makeRng(plan.stars + plan.lights));
  }, [need, plan]);
  const [helped, setHelped] = useState(false);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const landscape = area.w > area.h;
  const size = Math.min(150, (landscape ? area.w * 0.45 : area.w) / (items.length + 0.6));
  const fsize = Math.min(240, landscape ? area.h * 0.7 : area.h * 0.5);
  const ax = landscape ? area.x + area.w * 0.28 : area.x + area.w / 2;
  const ay = landscape ? area.y + area.h * 0.5 : area.y + area.h * 0.28;
  const pos = landscape
    ? items.map((_, i) => ({ x: area.x + area.w * 0.78, y: area.y + area.h / 2 + (i - (items.length - 1) / 2) * (size + 22) }))
    : rowPositions({ ...area, y: area.y + area.h * 0.55, h: area.h * 0.45 }, items.length, size);

  useEffect(() => {
    void api.instruct([
      L.alienFeels(need.feel),
      p('How can we help?', '¿Cómo le ayudamos?'),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g data-testid="friend-step" data-needs={need.id}>
      <NeedFriend emoji="👽" need={need} x={ax} y={ay} size={fsize} helped={helped} />
      {helped && <Emoji ch={need.helper.emoji} x={ax - fsize * 0.38} y={ay + fsize * 0.32} size={fsize * 0.26} className="pop-in" />}
      {items.map((it, i) => {
        const q = pos[i];
        return (
          <g
            key={it.emoji}
            data-testid={it.right ? 'alien-right' : `alien-toy-${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (helped) return;
              if (!it.right) {
                sfx.nope();
                setWrong((w) => ({ ...w, [it.emoji]: (w[it.emoji] ?? 0) + 1 }));
                void api.mistake(p('Hmm, does he need that?', 'Mmm, ¿necesita eso?'));
                return;
              }
              setHelped(true);
              sfx.win();
              bursts.add(makeBurst(ax, ay, '#4CB86A', true));
              void api.say([L.helperYes(need.helper.name), p('Now he feels better. Climb aboard!', '¡Ya se siente mejor! ¡Súbete!')]);
              later(() => api.solved(), 1200);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 400}ms` }}>
              <g key={wrong[it.emoji] ?? 0} className={wrong[it.emoji] ? 'wiggle' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }}>
                {hint && it.right && <circle cx={q.x} cy={q.y} r={size * 0.62} className="glow-ring" data-testid="hint-glow" />}
                <circle cx={q.x} cy={q.y} r={size / 2} fill="#fff" stroke={helped && it.right ? '#4CB86A' : '#C7CDE6'} strokeWidth={8} opacity={helped && !it.right ? 0.4 : 1} />
                <Emoji ch={it.emoji} x={q.x} y={q.y} size={size * 0.55} />
              </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

function CountdownStep({ api, plan, area, onLaunch }: StepProps & { onLaunch: () => void }) {
  const later = useTimers();
  const hint = useHint(api);
  const order = plan.countFrom ? Array.from({ length: plan.countFrom }, (_, i) => plan.countFrom - i) : [];
  const buttons = useMemo(() => shuffle(order, makeRng(plan.countFrom * 13 + plan.stars)), [plan.countFrom]); // eslint-disable-line react-hooks/exhaustive-deps
  const [next, setNext] = useState(0);
  const nextRef = useRef(0);
  const [wrong, setWrong] = useState<Record<number, number>>({});
  const [gone, setGone] = useState(false);

  const blastOff = () => {
    if (gone) return;
    setGone(true);
    onLaunch();
    sfx.whoosh();
    later(() => sfx.fanfare(), 400);
    void api.say(p('Blast off! Bye bye, rocket!', '¡Despegue! ¡Adiós, cohete!'));
    later(() => api.solved(), 3200);
  };

  useEffect(() => {
    void api.instruct(
      plan.countFrom
        ? L.countdown(order)
        : p('Everything is fixed! Press the big button to blast off!', '¡Todo listo! ¡Aprieta el botón grande para despegar!'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan.countFrom) {
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    const r = Math.min(120, area.h * 0.35);
    return (
      <g
        data-testid="launch-button"
        onPointerDown={(e) => {
          e.preventDefault();
          blastOff();
        }}
        className={gone ? '' : 'pulse-soft'}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy + 12} r={r} fill="#8E2A24" />
        <circle cx={cx} cy={cy} r={r} fill="#E8524A" stroke="#fff" strokeWidth={10} />
        <Emoji ch="🚀" x={cx} y={cy} size={r} />
      </g>
    );
  }

  const size = Math.min(150, area.w / (buttons.length + 0.6));
  const pos = rowPositions(area, buttons.length, size);
  return (
    <g data-testid="countdown-step" data-order={order.join(',')}>
      {buttons.map((n, i) => {
        const q = pos[i];
        const pressed = order.indexOf(n) < next;
        const isNext = order[next] === n;
        return (
          <g
            key={n}
            data-testid={`count-${n}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (gone || pressed) return;
              if (order[nextRef.current] !== n) {
                sfx.nope();
                setWrong((w) => ({ ...w, [n]: (w[n] ?? 0) + 1 }));
                void api.mistake(L.weNeed(n, order[nextRef.current]));
                return;
              }
              nextRef.current += 1;
              setNext(nextRef.current);
              sfx.count(order.length - nextRef.current);
              void api.say(num(n));
              if (nextRef.current >= order.length) later(blastOff, 900);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 300}ms` }}>
            <g key={wrong[n] ?? 0} className={wrong[n] ? 'wiggle' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }}>
              {hint && isNext && <circle cx={q.x} cy={q.y} r={size * 0.62} className="glow-ring" data-testid="hint-glow" />}
              <circle cx={q.x} cy={q.y + 8} r={size / 2} fill={pressed ? '#2E7D45' : '#2A3763'} />
              <circle cx={q.x} cy={q.y} r={size / 2} fill={pressed ? '#4CB86A' : '#fff'} stroke="#F7C431" strokeWidth={8} />
              <text x={q.x} y={q.y + 4} fontSize={size * 0.55} fontWeight={900} textAnchor="middle" dominantBaseline="central" fill={pressed ? '#fff' : '#2A3763'}>
                {n}
              </text>
            </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export const rocketRescue: GameDef = {
  id: 'rocket-rescue',
  title: p('Rocket Rescue', 'Rescate Espacial'),
  icon: '🛸',
  skill: p('Everything together', 'Todo junto'),
  tint: '#2A3763',
  rounds: () => BOSS_STEPS.length,
  // the workout picks the boss level from the child's other games
  adaptive: false,
  Component: RocketRescue,
};
