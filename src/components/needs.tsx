// Shared "what does my friend need?" content: each need has a clear picture cue
// (snow falling when cold, a plate in a thought bubble when hungry...) and one
// obvious helper. Wrong choices are toys, so the right answer is clear to a toddler.

import { type Phrase, p } from '../engine/i18n';
import { Emoji } from './fx';

export type NeedId = 'cold' | 'hungry' | 'sleepy' | 'hurt' | 'thirsty' | 'play' | 'dirty' | 'rain' | 'dark' | 'teeth';

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
  thirsty: { id: 'thirsty', feel: p('is thirsty', 'tiene sed'), helper: { emoji: '#water', name: p('a glass of water', 'un vaso de agua') }, thought: '💧' },
  play: { id: 'play', feel: p('wants to play', 'quiere jugar'), helper: { emoji: '⚽', name: p('a ball', 'una pelota') }, thought: '🥅' },
  dirty: { id: 'dirty', feel: p('is all dirty', 'está todo sucio'), helper: { emoji: '🧼', name: p('some soap', 'jabón') }, thought: '🛁' },
  rain: { id: 'rain', feel: p('is getting wet in the rain', 'se está mojando con la lluvia'), helper: { emoji: '☂️', name: p('an umbrella', 'un paraguas') }, thought: '🌧️' },
  dark: { id: 'dark', feel: p("can't see in the dark", 'no ve nada en la oscuridad'), helper: { emoji: '🔦', name: p('a flashlight', 'una linterna') }, thought: '🌑' },
  teeth: { id: 'teeth', feel: p('needs to brush his teeth', 'necesita lavarse los dientes'), helper: { emoji: '🪥', name: p('a toothbrush', 'un cepillo de dientes') }, thought: '🦷' },
};

/** helpers that aren't toys: wrong choices when the friend wants to play */
export const NOT_TOYS = [
  { emoji: '🪥', name: p('a toothbrush', 'un cepillo de dientes') },
  { emoji: '🧼', name: p('some soap', 'jabón') },
  { emoji: '🩹', name: p('a bandage', 'una curita') },
  { emoji: '🔦', name: p('a flashlight', 'una linterna') },
  { emoji: '🛏️', name: p('a cozy bed', 'una camita') },
];

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
      {/* rain: drops falling */}
      {need.id === 'rain' && !helped && (
        <g pointerEvents="none">
          {Array.from({ length: 14 }, (_, i) => (
            <text
              key={i}
              x={x - size * 0.7 + ((i * 37) % 14) * size * 0.1}
              y={y - size * 0.7}
              fontSize={size * 0.1}
              className="snow"
              style={{ animationDelay: `${(i % 7) * 0.25}s`, animationDuration: `${1.1 + (i % 3) * 0.3}s` }}
              textAnchor="middle"
            >
              💧
            </text>
          ))}
        </g>
      )}
      <circle
        cx={x}
        cy={y}
        r={size * 0.58}
        fill={helped ? '#fff' : need.id === 'cold' ? '#DCEBFA' : need.id === 'rain' ? '#D5E3EE' : need.id === 'dark' ? '#2E3350' : '#fff'}
        style={{ transition: 'fill 0.6s' }}
      />
      <g className={helped ? 'bounce' : need.id === 'cold' || need.id === 'rain' ? 'shiver' : need.id === 'hungry' ? 'rumble' : need.id === 'play' ? 'excited' : 'breathe'} style={{ transformOrigin: `${x}px ${y}px` }}>
        <Emoji ch={emoji} x={x} y={y} size={size * 0.78} style={need.id === 'dark' && !helped ? { opacity: 0.35 } : undefined} />
        {/* dirty: mud spots */}
        {need.id === 'dirty' && !helped && (
          <g pointerEvents="none" fill="#8B5A2B" opacity={0.75}>
            <ellipse cx={x - size * 0.16} cy={y + size * 0.1} rx={size * 0.07} ry={size * 0.05} />
            <ellipse cx={x + size * 0.18} cy={y - size * 0.08} rx={size * 0.05} ry={size * 0.04} />
            <ellipse cx={x + size * 0.05} cy={y + size * 0.22} rx={size * 0.08} ry={size * 0.04} />
            <circle cx={x - size * 0.22} cy={y - size * 0.15} r={size * 0.03} />
          </g>
        )}
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
