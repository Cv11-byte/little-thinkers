// Find It: "¿Dónde está el perro?" — tap the one you hear named.
// Animals for the little one; the older child also gets vehicles, helpers, things and food.
// Every round of a session asks for a different animal, and the choices are
// picked to look clearly different from each other.

import { useEffect, useMemo, useState } from 'react';
import { L } from '../../engine/lines';
import { p } from '../../engine/i18n';
import { makeRng, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { CATALOG, type Group, THING_BY_ID, type Thing } from '../../content/catalog';
import { showable } from '../../engine/art';
import { DRAWN } from '../../components/drawn';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import type { GameDef, RoundApi } from '../types';

/** Iconic animals a toddler can tell apart, grouped so distractors come from different groups. */
export const FIND_POOL: { id: string; group: string }[] = [
  { id: 'dog', group: 'pet' },
  { id: 'cat', group: 'pet' },
  { id: 'rabbit', group: 'pet' },
  { id: 'cow', group: 'farm' },
  { id: 'pig', group: 'farm' },
  { id: 'horse', group: 'farm' },
  { id: 'sheep', group: 'farm' },
  { id: 'chicken', group: 'bird' },
  { id: 'duck', group: 'bird' },
  { id: 'owl', group: 'bird' },
  { id: 'penguin', group: 'bird' },
  { id: 'lion', group: 'wild' },
  { id: 'elephant', group: 'wild' },
  { id: 'monkey', group: 'wild' },
  { id: 'giraffe', group: 'wild' },
  { id: 'zebra', group: 'wild' },
  { id: 'bear', group: 'wild' },
  { id: 'tiger', group: 'wild' },
  { id: 'hippo', group: 'wild' },
  { id: 'fish', group: 'water' },
  { id: 'whale', group: 'water' },
  { id: 'turtle', group: 'water' },
  { id: 'shark', group: 'water' },
  { id: 'octopus', group: 'water' },
  { id: 'frog', group: 'small' },
  { id: 'butterfly', group: 'small' },
  { id: 'bee', group: 'small' },
  { id: 'snail', group: 'small' },
  { id: 'trex', group: 'dino' },
  { id: 'dinosaur', group: 'dino' },
];

/** People and family words are left out of "Where is the…?" (they suit other games). */
const NOT_FOR_FINDING = new Set(['mommy', 'daddy', 'grandma', 'grandpa', 'brother', 'baby', 'nurse', 'bone', 'water', 'lamp', 'bottle', 'diaper', 'potty']);

/** Everything this game can ask for, by group (things that still need a picture appear once one is added). */
export function findables(group: Group): Thing[] {
  if (group === 'animals') return FIND_POOL.map((a) => THING_BY_ID[a.id]);
  return CATALOG.filter((x) => x.group === group && !NOT_FOR_FINDING.has(x.id) && showable(x, DRAWN));
}

/** every non-animal the game could ever ask for, once pictures exist (for recording voices) */
export function findableEver(): Thing[] {
  return CATALOG.filter((x) => x.group !== 'animals' && !NOT_FOR_FINDING.has(x.id));
}

const CARD_COLORS = ['#FFE4B8', '#D9F0D2', '#D6E8FA', '#F8D9E6', '#EBE1FA', '#FFF0C2'];
const OTHER_GROUPS: Group[] = ['vehicles', 'characters', 'items', 'food'];

/** Which group a round asks about: animals for the little one; the older child also gets vehicles, helpers, things and food. */
export function findGroup(level: number, sessionSeed: number, round: number): Group {
  if (level <= 1 || round % 2 === 0) return 'animals';
  const order = shuffle(OTHER_GROUPS, makeRng(sessionSeed + 5));
  return order[Math.floor(round / 2) % order.length];
}

export function findPlan(level: number, sessionSeed: number, round: number) {
  const group = findGroup(level, sessionSeed, round);
  const pool = findables(group);
  // a fixed shuffled order for the session, so each round asks for something new
  const order = shuffle(pool, makeRng(sessionSeed + group.length));
  const answer = order[Math.floor(round / (level <= 1 ? 1 : 2)) % order.length];
  const n = level <= 1 ? 2 : level === 2 ? 3 : level === 3 ? 4 : 6;
  const rng = makeRng(sessionSeed + round * 977 + level);
  let others = shuffle(
    pool.filter((a) => a.id !== answer.id),
    rng,
  );
  if (group === 'animals') {
    // prefer animals from other families so they look clearly different
    const fam = (id: string) => FIND_POOL.find((f) => f.id === id)?.group;
    others = others.sort((a, b) => Number(fam(a.id) === fam(answer.id)) - Number(fam(b.id) === fam(answer.id)));
  }
  const picks = [answer, ...others.slice(0, n - 1)];
  return { group, answer, choices: shuffle(picks, rng) };
}

function FindAnimal({ api }: { api: RoundApi }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const plan = useMemo(() => findPlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  const n = plan.choices.length;
  const landscape = W >= H;
  const cols = landscape ? (n === 6 ? 3 : n) : n > 2 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const gap = 30;
  const card = Math.min(270, (W - gap * (cols + 1)) / cols, (H - 40 - gap * (rows + 1)) / rows);
  const x0 = (W - (cols * card + (cols - 1) * gap)) / 2;
  const y0 = (H - (rows * card + (rows - 1) * gap)) / 2;

  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);

  useEffect(() => {
    void api.instruct(L.whereIs(plan.answer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  const choose = (a: Thing, cx: number, cy: number) => {
    if (found) return;
    if (a.id !== plan.answer.id) {
      sfx.nope();
      setWrong((w) => ({ ...w, [a.id]: (w[a.id] ?? 0) + 1 }));
      // name what they touched, so a mistake still teaches a word
      void api.mistake(L.thatsThe(a));
      return;
    }
    setFound(true);
    sfx.win();
    bursts.add(makeBurst(cx, cy, '#F7C431', true));
    void api.say(L.theAnimal(a));
    later(() => api.solved(), 1400);
  };

  return (
    <g data-testid="who-says" data-answer={plan.answer.id} data-group={plan.group}>
      <rect width={W} height={H} rx={28} fill="#F3F7EC" />
      {plan.choices.map((a, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const rowCount = row === rows - 1 ? n - row * cols : cols;
        const shift = ((cols - rowCount) * (card + gap)) / 2;
        const x = x0 + shift + col * (card + gap);
        const y = y0 + row * (card + gap);
        const cx = x + card / 2;
        const cy = y + card / 2;
        const isAnswer = a.id === plan.answer.id;
        return (
          <g
            key={a.id}
            data-testid={`card-${a.id}`}
            onPointerDown={(e) => {
              e.preventDefault();
              choose(a, cx, cy);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 350}ms` }}>
              <g key={wrong[a.id] ?? 0} className={wrong[a.id] ? 'wiggle' : found && isAnswer ? 'bounce' : found ? 'fade-out' : ''} style={{ transformOrigin: `${cx}px ${cy}px` }}>
                {hint && isAnswer && <rect x={x - 14} y={y - 14} width={card + 28} height={card + 28} rx={48} className="glow-rect" data-testid="hint-glow" />}
                <rect x={x} y={y + 8} width={card} height={card} rx={40} fill="#000" opacity={0.06} />
                <rect x={x} y={y} width={card} height={card} rx={40} fill={CARD_COLORS[i % CARD_COLORS.length]} stroke={found && isAnswer ? '#4CB86A' : '#fff'} strokeWidth={found && isAnswer ? 12 : 8} />
                <Emoji ch={a.emoji} x={cx} y={cy} size={card * 0.64} />
              </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

export const whoSays: GameDef = {
  id: 'who-says',
  title: p('Find It', '¿Dónde Está?'),
  icon: '🔎',
  skill: p('Listening & words', 'Escuchar y vocabulario'),
  tint: '#4CB86A',
  rounds: () => 4,
  adaptive: true,
  Component: FindAnimal,
};
