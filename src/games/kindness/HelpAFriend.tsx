// Help a Friend: a friend clearly shows what they need (shivering in the snow,
// a plate in their thought bubble...). One choice helps; the others are toys.
// At higher levels, every other round asks "Who feels sad?" with faces.

import { useEffect, useMemo, useState } from 'react';
import { L } from '../../engine/lines';
import { type Phrase, p } from '../../engine/i18n';
import { makeRng, pickN, shuffle } from '../../engine/rng';
import { sfx } from '../../engine/sfx';
import { useStage, useTimers } from '../../engine/stage';
import { ANIMALS } from '../../engine/words';
import { Emoji, makeBurst, useBursts } from '../../components/fx';
import { NEEDS, type NeedId, NeedFriend, NOT_TOYS, TOYS } from '../../components/needs';
import type { GameDef, RoundApi } from '../types';

export const FRIENDS = ['puppy', 'bear', 'bunny', 'kitty', 'panda', 'fox'];
export const NEED_ORDER: NeedId[] = ['cold', 'hungry', 'hurt', 'sleepy', 'thirsty', 'play', 'dirty', 'rain', 'dark', 'teeth'];

export const FEELINGS: { face: string; name: Phrase }[] = [
  { face: '😊', name: p('happy', 'feliz') },
  { face: '😢', name: p('sad', 'triste') },
  { face: '😠', name: p('angry', 'enojado') },
  { face: '😨', name: p('scared', 'asustado') },
];

export function kindPlan(level: number, sessionSeed: number, round: number) {
  const rng = makeRng(sessionSeed * 11 + round * 17 + level);
  if (level >= 3 && round % 2 === 1) {
    const n = level >= 4 ? 4 : 3;
    const faces = pickN(FEELINGS, n, rng);
    const answer = faces[Math.floor(rng() * n)];
    return { mode: 'feelings' as const, faces: shuffle(faces, rng), answer, need: NEEDS.cold, friend: FRIENDS[0], choices: [] as { emoji: string; right: boolean }[] };
  }
  const order = shuffle(NEED_ORDER, makeRng(sessionSeed));
  const need = NEEDS[order[round % order.length]];
  const friend = FRIENDS[(sessionSeed + round) % FRIENDS.length];
  const n = level <= 1 ? 2 : 3;
  // wrong choices are toys (or, when the friend wants to play, things that aren't toys)
  const pool = (need.id === 'play' ? NOT_TOYS : TOYS).filter((t) => t.emoji !== need.helper.emoji);
  const toys = pickN(pool, n - 1, rng).map((t) => ({ emoji: t.emoji, right: false }));
  const choices = shuffle([{ emoji: need.helper.emoji, right: true }, ...toys], rng);
  return { mode: 'help' as const, need, friend, choices, faces: [] as typeof FEELINGS, answer: FEELINGS[0] };
}

function HelpAFriend({ api }: { api: RoundApi }) {
  const plan = useMemo(() => kindPlan(api.level, api.sessionSeed, api.round), [api.level, api.sessionSeed, api.round]);
  return plan.mode === 'feelings' ? <Feelings api={api} plan={plan} /> : <Help api={api} plan={plan} />;
}

function Help({ api, plan }: { api: RoundApi; plan: ReturnType<typeof kindPlan> }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const need = plan.need;
  const friend = ANIMALS[plan.friend];
  const landscape = W >= H;
  const fx = landscape ? W * 0.32 : W / 2;
  const fy = landscape ? H * 0.52 : H * 0.32;
  const fsize = Math.min(340, landscape ? H * 0.62 : W * 0.55);
  const n = plan.choices.length;
  const btn = Math.min(190, landscape ? (H - 60) / n - 24 : (W - 40) / n - 20);
  const choicePos = (i: number) =>
    landscape ? { x: W * 0.76, y: H / 2 + (i - (n - 1) / 2) * (btn + 24) } : { x: W / 2 + (i - (n - 1) / 2) * (btn + 20), y: H * 0.78 };

  const [helped, setHelped] = useState(false);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);

  useEffect(() => {
    void api.instruct([L.friendFeels(friend, need.feel), p('How can we help?', '¿Cómo le ayudamos?')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  return (
    <g data-testid="help-friend" data-needs={need.id}>
      <rect width={W} height={H} rx={28} fill={helped ? '#FFF1F3' : need.id === 'cold' || need.id === 'rain' ? '#E8F1FB' : need.id === 'dark' ? '#565C80' : '#FFF1F3'} style={{ transition: 'fill 0.6s' }} />
      <NeedFriend emoji={friend.emoji} need={need} x={fx} y={fy} size={fsize} helped={helped} />
      {helped && <Emoji ch={need.helper.emoji} x={fx - fsize * 0.38} y={fy + fsize * 0.32} size={fsize * 0.26} className="pop-in" />}
      {plan.choices.map((c, i) => {
        const q = choicePos(i);
        return (
          <g
            key={c.emoji}
            data-testid={c.right ? 'helper-right' : `helper-toy-${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (helped) return;
              if (!c.right) {
                sfx.nope();
                setWrong((w) => ({ ...w, [c.emoji]: (w[c.emoji] ?? 0) + 1 }));
                void api.mistake(L.doesNeed(friend));
                return;
              }
              setHelped(true);
              sfx.win();
              bursts.add(makeBurst(fx, fy, '#F27BB0', true));
              void api.say([L.helperYes(need.helper.name), p('Thank you! Now I feel better!', '¡Gracias! ¡Ya me siento mejor!')]);
              later(() => api.solved(), 1200);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 400}ms` }}>
              <g key={wrong[c.emoji] ?? 0} className={wrong[c.emoji] ? 'wiggle' : ''} style={{ transformOrigin: `${q.x}px ${q.y}px` }}>
                {hint && c.right && <circle cx={q.x} cy={q.y} r={btn * 0.62} className="glow-ring" data-testid="hint-glow" />}
                <circle cx={q.x} cy={q.y + 7} r={btn / 2} fill="#E6C9D2" />
                <circle cx={q.x} cy={q.y} r={btn / 2} fill={helped && c.right ? '#DFF3E4' : '#fff'} stroke={helped && c.right ? '#4CB86A' : '#F3C6CF'} strokeWidth={8} opacity={helped && !c.right ? 0.4 : 1} />
                <Emoji ch={c.emoji} x={q.x} y={q.y} size={btn * 0.56} />
              </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

function Feelings({ api, plan }: { api: RoundApi; plan: ReturnType<typeof kindPlan> }) {
  const { W, H } = useStage();
  const later = useTimers();
  const bursts = useBursts();
  const n = plan.faces.length;
  const landscape = W >= H;
  const cols = landscape ? n : 2;
  const rows = Math.ceil(n / cols);
  const size = Math.min(240, (W - 40) / cols - 30, (H - 60) / rows - 30);
  const pos = (i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: W / 2 + (col - (cols - 1) / 2) * (size + 30), y: H / 2 + (row - (rows - 1) / 2) * (size + 30) };
  };
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);

  useEffect(() => {
    void api.instruct(L.whoFeels(plan.answer.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!api.hint) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(t);
  }, [api.hint]);

  return (
    <g data-testid="feelings" data-answer={plan.answer.face}>
      <rect width={W} height={H} rx={28} fill="#FFF1F3" />
      {plan.faces.map((f, i) => {
        const c = pos(i);
        const right = f.face === plan.answer.face;
        return (
          <g
            key={f.face}
            data-testid={`face-${i}`}
            data-right={right}
            onPointerDown={(e) => {
              e.preventDefault();
              if (found) return;
              if (!right) {
                sfx.nope();
                setWrong((w) => ({ ...w, [f.face]: (w[f.face] ?? 0) + 1 }));
                void api.mistake(L.thatFeels(f.name));
                return;
              }
              setFound(true);
              sfx.win();
              bursts.add(makeBurst(c.x, c.y, '#F7C431', true));
              void api.say(L.yesFeels(f.name));
              later(() => api.solved(), 1200);
            }}
          >
            <g className="reveal" style={{ animationDelay: `${300 + i * 350}ms` }}>
              <g key={wrong[f.face] ?? 0} className={wrong[f.face] ? 'wiggle' : found && right ? 'bounce' : ''} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
                {hint && right && <circle cx={c.x} cy={c.y} r={size * 0.62} className="glow-ring" data-testid="hint-glow" />}
                <circle cx={c.x} cy={c.y} r={size / 2} fill="#fff" stroke={found && right ? '#4CB86A' : '#F3C6CF'} strokeWidth={8} />
                <Emoji ch={f.face} x={c.x} y={c.y} size={size * 0.72} />
              </g>
            </g>
          </g>
        );
      })}
      {bursts.layer}
    </g>
  );
}

export const helpAFriend: GameDef = {
  id: 'help-a-friend',
  title: p('Help a Friend', 'Ayuda a un Amigo'),
  icon: '🤗',
  skill: p('Feelings & kindness', 'Emociones y bondad'),
  tint: '#F27BB0',
  rounds: () => 3,
  adaptive: true,
  Component: HelpAFriend,
};
