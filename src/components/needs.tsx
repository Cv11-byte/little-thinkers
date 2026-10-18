// Shared "what does my friend need?" content: each need has a clear picture cue
// (snow falling when cold, a plate in a thought bubble when hungry...) and one
// obvious helper. Wrong choices are toys, so the right answer is clear to a toddler.

import { type Phrase, p } from '../engine/i18n';
import { Emoji } from './fx';

export type NeedId = 'cold' | 'hungry' | 'sleepy' | 'hurt' | 'thirsty';

export interface Need {
  id: NeedId;
  feel: Phrase;
  helper: { emoji: string; name: Phrase };
  thought: string;
}

export const NEEDS: Record<NeedId, Need> = {
  cold: { id: 'cold', feel: p('is cold, brrr!', 'tiene frío, ¡brrr!'), helper: { emoji: '🧥', name: p('a warm jacket', 'una chamarra calientita') }, thought: '❄️' },
  hungry: { id: 'hungry', feel: p('is hungry', 'tiene hambre'), helper: { emoji: '🍎', name: p('some food', 'comida') }, thought: '🍽️' },
  sleepy: { id: 'sleepy', feel: p('is sleepy', 'tiene sueño'), helper: { emoji: '🛏️', name: p('a cozy bed', 'una camita') }, thought: '💤' },
  hurt: { id: 'hurt', feel: p('got a boo-boo', 'se lastimó'), helper: { emoji: '🩹', name: p('a bandage', 'una curita') }, thought: '🤕' },
  thirsty: { id: 'thirsty', feel: p('is thirsty', 'tiene sed'), helper: { emoji: '🥛', name: p('a glass of water', 'un vaso de agua') }, thought: '💧' },
};

export const TOYS = [
  { emoji: '⚽', name: p('a ball', 'una pelota') },
  { emoji: '🧸', name: p('a teddy bear', 'un osito') },
  { emoji: '🎈', name: p('a balloon', 'un globo') },
  { emoji: '🪁', name: p('a kite', 'un papalote') },
  { emoji: '🎸', name: p('a guitar', 'una guitarra') },
];

/** The friend with a visible cue for how they feel; turns happy once helped. */
export function NeedFriend({ emoji, need, x, y, size, helped }: { emoji: string; need: Need; x: number; y: number; size: number; helped: boolean }) {
  return (
    <g data-testid="need-friend" data-need={need.id}>
      {/* cold: snow falling */}
      {need.id === 'cold' && !helped && (
        <g pointerEvents="none">
          {Array.from({ length: 10 }, (_, i) => (
            <text
              key={i}
              x={x - size * 0.7 + ((i * 37) % 10) * size * 0.14}
              y={y - size * 0.7}
              fontSize={size * 0.13}
              className="snow"
              style={{ animationDelay: `${(i % 5) * 0.4}s`, animationDuration: `${2.2 + (i % 3) * 0.5}s` }}
              textAnchor="middle"
            >
              ❄️
            </text>
          ))}
        </g>
      )}
      <circle cx={x} cy={y} r={size * 0.58} fill={need.id === 'cold' && !helped ? '#DCEBFA' : '#fff'} style={{ transition: 'fill 0.6s' }} />
      <g className={helped ? 'bounce' : need.id === 'cold' ? 'shiver' : need.id === 'hungry' ? 'rumble' : 'breathe'} style={{ transformOrigin: `${x}px ${y}px` }}>
        <Emoji ch={emoji} x={x} y={y} size={size * 0.78} />
      </g>
      {/* thought bubble */}
      <g transform={`translate(${x + size * 0.58} ${y - size * 0.55})`}>
      <g className="pop-in" key={helped ? 'h' : 'n'}>
        <circle cx={-size * 0.2} cy={size * 0.22} r={size * 0.04} fill="#fff" />
        <circle cx={-size * 0.11} cy={size * 0.13} r={size * 0.06} fill="#fff" />
        <circle r={size * 0.22} fill="#fff" stroke="#E5DCF1" strokeWidth={4} />
        <Emoji ch={helped ? '😊' : need.thought} x={0} y={0} size={size * 0.26} />
      </g>
      </g>
      {need.id === 'sleepy' && !helped && <Emoji ch="💤" x={x - size * 0.45} y={y - size * 0.5} size={size * 0.2} className="float-up" />}
      {helped && <Emoji ch="💖" x={x - size * 0.5} y={y - size * 0.45} size={size * 0.22} className="float-up" />}
    </g>
  );
}
