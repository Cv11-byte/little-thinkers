// Built-in drawings for things that have no clear emoji (a glass of water, diggers...).
// Drawn in a 100×100 box centered on 0,0. A picture in src/art/ still wins over these.

import type { ReactElement } from 'react';

const Wheel = ({ x, y, r = 11 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#333A44" />
    <circle cx={x} cy={y} r={r * 0.45} fill="#C9CED6" />
  </g>
);

export const DRAWN: Record<string, () => ReactElement> = {
  '#water': () => (
    <g>
      <path d="M -26 -38 L 26 -38 L 20 40 Q 19 46 13 46 L -13 46 Q -19 46 -20 40 Z" fill="#EAF6FF" stroke="#9CC9EA" strokeWidth={4} />
      <path d="M -23 -8 Q -10 -14 0 -8 T 23 -8 L 19.5 39 Q 19 43 14 43 L -14 43 Q -19 43 -19.5 39 Z" fill="#4BA8EC" />
      <path d="M -23 -8 Q -10 -14 0 -8 T 23 -8" fill="none" stroke="#8FD0FF" strokeWidth={4} strokeLinecap="round" />
      <rect x={-16} y={-30} width={6} height={62} rx={3} fill="#fff" opacity={0.6} />
      <circle cx={8} cy={12} r={3.5} fill="#BFE6FF" />
      <circle cx={2} cy={26} r={2.5} fill="#BFE6FF" />
    </g>
  ),
  '#xylophone': () => (
    <g>
      {['#E8524A', '#F58A3A', '#F7C431', '#4CB86A', '#3D8BE8', '#9B6BD6'].map((c, i) => (
        <rect key={c} x={-46 + i * 16} y={-30 + i * 4} width={13} height={64 - i * 8} rx={4} fill={c} />
      ))}
      <rect x={-50} y={-4} width={100} height={5} rx={2} fill="#8A6239" opacity={0.6} />
      <line x1={12} y1={-46} x2={30} y2={-16} stroke="#8A6239" strokeWidth={4} strokeLinecap="round" />
      <circle cx={31} cy={-14} r={6} fill="#E8524A" />
    </g>
  ),
  '#excavator': () => (
    <g>
      <rect x={-44} y={22} width={60} height={18} rx={9} fill="#3B4250" />
      {[-34, -22, -10, 2].map((x) => (
        <circle key={x} cx={x + 2} cy={31} r={5} fill="#8A93A3" />
      ))}
      <rect x={-40} y={0} width={46} height={22} rx={4} fill="#F7B925" />
      <rect x={-26} y={-24} width={26} height={26} rx={4} fill="#F7B925" />
      <rect x={-22} y={-20} width={16} height={14} rx={2} fill="#BFE6FF" />
      <path d="M 4 4 L 28 -30 L 34 -26 L 12 8 Z" fill="#E59E12" />
      <path d="M 28 -30 L 44 2 L 38 5 L 24 -24 Z" fill="#E59E12" />
      <path d="M 34 2 L 50 2 L 46 18 Q 40 22 32 16 Z" fill="#6B7280" />
      <circle cx={28} cy={-28} r={4} fill="#3B4250" />
    </g>
  ),
  '#dumptruck': () => (
    <g>
      <path d="M -46 -8 L 6 -8 L 10 18 L -46 18 Z" fill="#9AA3B1" />
      <path d="M -50 -26 L 8 -12 L 6 -8 L -46 -8 Z" fill="#B7BFCB" />
      <path d="M 10 -14 L 34 -14 L 46 2 L 46 22 L 10 22 Z" fill="#F7B925" />
      <path d="M 16 -9 L 31 -9 L 39 2 L 16 2 Z" fill="#BFE6FF" />
      <rect x={-48} y={16} width={96} height={8} rx={3} fill="#3B4250" />
      <Wheel x={-30} y={30} />
      <Wheel x={-8} y={30} />
      <Wheel x={30} y={30} />
    </g>
  ),
  '#garbagetruck': () => (
    <g>
      <rect x={-48} y={-24} width={62} height={44} rx={6} fill="#3FA65A" />
      <rect x={-42} y={-18} width={50} height={8} rx={4} fill="#fff" opacity={0.35} />
      <path d="M -26 -2 h 16 l -2 16 h -12 Z" fill="#fff" opacity={0.85} />
      <rect x={-28} y={-6} width={20} height={4} rx={2} fill="#fff" opacity={0.85} />
      <path d="M 14 -14 L 34 -14 L 46 2 L 46 22 L 14 22 Z" fill="#2E7D45" />
      <path d="M 19 -9 L 31 -9 L 39 2 L 19 2 Z" fill="#BFE6FF" />
      <rect x={-50} y={18} width={98} height={8} rx={3} fill="#3B4250" />
      <Wheel x={-32} y={31} />
      <Wheel x={-10} y={31} />
      <Wheel x={30} y={31} />
    </g>
  ),
  '#mixer': () => (
    <g>
      <g transform="rotate(-14 -14 -2)">
        <ellipse cx={-14} cy={-2} rx={34} ry={22} fill="#E9EDF2" stroke="#9AA3B1" strokeWidth={3} />
        {[-34, -20, -6, 8].map((x) => (
          <path key={x} d={`M ${x} -20 q 8 18 0 36`} stroke="#F58A3A" strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
      </g>
      <path d="M 18 -14 L 34 -14 L 46 2 L 46 22 L 18 22 Z" fill="#F58A3A" />
      <path d="M 22 -9 L 31 -9 L 39 2 L 22 2 Z" fill="#BFE6FF" />
      <rect x={-48} y={18} width={96} height={8} rx={3} fill="#3B4250" />
      <Wheel x={-30} y={31} />
      <Wheel x={-8} y={31} />
      <Wheel x={32} y={31} />
    </g>
  ),
};
