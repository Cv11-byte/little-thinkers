// Copy Me: "Mírame primero y luego tú."
// 1. Watch: the pads are locked and dimmed, an eye banner shows, and the owl's
//    helper hand taps the pattern (each animal says its name).
// 2. "¡Ahora tú!": a banner with the child's avatar, pads light up and unlock.
// Taps during the demo do nothing at all, so copying along can't count.

import { useEffect, useMemo, useRef, useState } from 'react';
import { COLORS, type ColorId, p } from '../../engine/i18n';
import { makeRng } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { ANIMALS } from '../../engine/words';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import { KIDS } from '../../app/kids';
import type { GameDef, RoundApi } from '../types';

const PADS: { color: ColorId; animal: string }[] = [
  { color: 'green', animal: 'frog' },
  { color: 'yellow', animal: 'duck' },
  { color: 'blue', animal: 'whale' },
  { color: 'red', animal: 'crab' },
];

/** patterns shown recently, so the next one is always different */
const recent: string[] = [];

/** pattern length grows a little within a session: the last round is one step longer */
export function patternPlan(level: number, seed: number, round = 0, totalRounds = 3) {
  const rng = makeRng(seed);
  const pads = level <= 1 ? 2 : level === 2 ? 3 : 4;
  const base = level <= 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
  const steps = base + (level >= 2 && round === totalRounds - 1 ? 1 : 0);
  let seq: number[] = [];
  for (let tries = 0; tries < 40; tries++) {
    seq = [];
    while (seq.length < steps) {
      const k = Math.floor(rng() * pads);
      if (seq.length && seq[seq.length - 1] === k) continue;
      seq.push(k);
    }
    // never the same pattern as the last few rounds, and never starting with the same pad as last time
    const key = seq.join(',');
    const last = recent[recent.length - 1];
    if (!recent.includes(key) && (!last || last[0] !== key[0] || pads <= 2)) break;
  }
  recent.push(seq.join(','));
  if (recent.length > 4) recent.shift();
  return { pads, seq };
}

const STEP_MS = 1300;

function CopyMe({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => patternPlan(api.level, api.seed, api.round, api.totalRounds), [api.level, api.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<'intro' | 'watch' | 'play' | 'done'>('intro');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [lit, setLit] = useState<number | null>(null);
  const [hand, setHand] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const [hint, setHint] = useState(false);
  const [wrongPad, setWrongPad] = useState<{ i: number; k: number } | null>(null);

  const n = plan.pads;
  const landscape = W >= H;
  const cols = landscape ? n : 2;
  const rows = Math.ceil(n / cols);
  const gap = 34;
  const top = 150;
  const size = Math.min(250, (W - gap * (cols + 1)) / cols, (H - top - 30 - gap * (rows - 1)) / rows);
  const x0 = (W - (cols * size + (cols - 1) * gap)) / 2;
  const y0 = top + (H - top - (rows * size + (rows - 1) * gap)) / 2;
  const padPos = (i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCount = row === rows - 1 ? n - row * cols : cols;
    const shift = ((cols - rowCount) * (size + gap)) / 2;
    return { x: x0 + shift + col * (size + gap), y: y0 + row * (size + gap) };
  };

  const setP = (ph: typeof phase) => {
    phaseRef.current = ph;
    setPhase(ph);
  };

  const demo = () => {
    setP('watch');
    stepRef.current = 0;
    setStep(0);
    plan.seq.forEach((k, i) => {
      const t = 400 + i * STEP_MS;
      later(() => setHand(k), t); // hand glides to the pad
      later(() => {
        setLit(k);
        sfx.pad(k);
        void api.say(ANIMALS[PADS[k].animal].name);
      }, t + 450);
      later(() => setLit(null), t + 1050);
    });
    later(() => {
      setHand(null);
      setP('play');
      sfx.snap();
      void api.say(p('Now you!', '¡Ahora tú!'));
    }, 400 + plan.seq.length * STEP_MS + 200);
  };

  useEffect(() => {
    void api.instruct(p('Watch me first, then you!', '¡Mírame primero y luego tú!')).then(() => demo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api.hint || phaseRef.current !== 'play') return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 3500);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const tap = (i: number) => {
    if (phaseRef.current !== 'play') return; // demo or intro: ignore completely
    const want = plan.seq[stepRef.current];
    if (i !== want) {
      sfx.nope();
      setWrongPad((w) => ({ i, k: (w?.k ?? 0) + 1 }));
      setP('watch');
      void api.mistake(p("Oops! Let's watch again.", '¡Ups! Mira otra vez.')).then(() => demo());
      return;
    }
    setHint(false);
    setLit(i);
    sfx.pad(i);
    void api.say(ANIMALS[PADS[i].animal].name);
    later(() => setLit((l) => (l === i ? null : l)), 400);
    stepRef.current += 1;
    setStep(stepRef.current);
    if (stepRef.current >= plan.seq.length) {
      setP('done');
      const pp = padPos(i);
      bursts.add(makeBurst(pp.x + size / 2, pp.y + size / 2, '#F7C431', true));
      later(() => api.solved(), 1200);
    }
  };

  const watching = phase === 'watch' || phase === 'intro';
  const kid = KIDS[api.kid];
  const bannerW = Math.min(560, W - 40);

  return (
    <g data-testid="copy-me" data-seq={plan.seq.join(',')} data-phase={phase}>
      <rect width={W} height={H} rx={28} fill={watching ? '#EDE9F7' : '#F4F1FB'} style={{ transition: 'fill 0.5s' }} />
      {/* banner: who's turn it is */}
      <g transform={`translate(${W / 2 - bannerW / 2} 22)`}>
        <rect width={bannerW} height={100} rx={50} fill={watching ? '#5B4A9E' : '#4CB86A'} style={{ transition: 'fill 0.4s' }} />
        <g key={watching ? 'w' : 'p'} className="pop-in">
          <circle cx={58} cy={50} r={38} fill="#fff" />
          <Emoji ch={watching ? '🦉' : kid.avatar} x={58} y={52} size={52} />
          <Emoji ch={watching ? '👀' : '👆'} x={bannerW - 58} y={52} size={52} />
          {/* progress: one dot per step to copy */}
          {plan.seq.map((_, i) => (
            <circle
              key={i}
              cx={bannerW / 2 + (i - (plan.seq.length - 1) / 2) * 52}
              cy={50}
              r={17}
              fill={!watching && i < step ? '#F7C431' : 'rgba(255,255,255,0.3)'}
              stroke="#fff"
              strokeWidth={4}
            />
          ))}
        </g>
      </g>
      {Array.from({ length: n }, (_, i) => {
        const pos = padPos(i);
        const pad = PADS[i];
        const isLit = lit === i;
        const showHint = hint && phase === 'play' && plan.seq[step] === i;
        const c = COLORS[pad.color];
        return (
          <g
            key={i}
            data-testid={`pad-${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(i);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${i * 150}ms` }}>
              <g key={wrongPad?.i === i ? wrongPad.k : 0} className={wrongPad?.i === i ? 'wiggle' : ''} style={{ transformOrigin: `${pos.x + size / 2}px ${pos.y + size / 2}px` }}>
                {showHint && <rect x={pos.x - 14} y={pos.y - 14} width={size + 28} height={size + 28} rx={56} className="glow-rect" data-testid="hint-glow" />}
                <rect x={pos.x} y={pos.y + 10} width={size} height={size} rx={48} fill={c.dark} opacity={watching && !isLit ? 0.25 : 0.9} />
                <rect
                  x={pos.x}
                  y={pos.y + (isLit ? 8 : 0)}
                  width={size}
                  height={size}
                  rx={48}
                  fill={c.hex}
                  opacity={isLit ? 1 : watching ? 0.42 : 0.92}
                  stroke={isLit ? '#fff' : 'none'}
                  strokeWidth={14}
                  style={{ transition: 'opacity 0.3s' }}
                />
                <Emoji ch={ANIMALS[pad.animal].emoji} x={pos.x + size / 2} y={pos.y + size / 2 + (isLit ? 8 : 0)} size={size * (isLit ? 0.6 : 0.5)} style={{ opacity: watching && !isLit ? 0.55 : 1 }} />
                {watching && !isLit && <Emoji ch="🔒" x={pos.x + size - 34} y={pos.y + 34} size={30} style={{ opacity: 0.6 }} />}
              </g>
            </g>
          </g>
        );
      })}
      {/* the owl's helper hand (white glove) shows the pattern */}
      {hand !== null && (
        <g className="mover" style={{ transform: `translate(${padPos(hand).x + size * 0.5}px, ${padPos(hand).y + size * 0.12}px)`, transition: 'transform 0.4s ease-in-out' }} data-testid="demo-hand" pointerEvents="none">
          <circle r={54} fill="#fff" opacity={0.7} />
          <Emoji ch="👇" x={0} y={0} size={86} className="tap-hand" />
        </g>
      )}
      {bursts.layer}
    </g>
  );
}

export const copyMe: GameDef = {
  id: 'copy-me',
  title: p('Copy Me', 'Cópiame'),
  icon: '🎶',
  skill: p('Memory', 'Memoria'),
  tint: '#9B6BD6',
  rounds: () => 3,
  adaptive: true,
  Component: CopyMe,
};
