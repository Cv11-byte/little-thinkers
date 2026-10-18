import { type Phrase, p } from '../../engine/i18n';

export type ShapeId = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'diamond' | 'hexagon' | 'moon' | 'oval' | 'rectangle' | 'pentagon' | 'cross';

export const SHAPES: Record<ShapeId, { name: Phrase; color: string; dark: string }> = {
  circle: { name: p('circle', 'círculo'), color: '#E8524A', dark: '#B83A33' },
  square: { name: p('square', 'cuadrado'), color: '#3D8BE8', dark: '#2A66B0' },
  triangle: { name: p('triangle', 'triángulo'), color: '#F7C431', dark: '#C99A12' },
  star: { name: p('star', 'estrella'), color: '#9B6BD6', dark: '#7249A8' },
  heart: { name: p('heart', 'corazón'), color: '#F27BB0', dark: '#C9578A' },
  diamond: { name: p('diamond', 'rombo'), color: '#4CB86A', dark: '#33884C' },
  hexagon: { name: p('hexagon', 'hexágono'), color: '#F58A3A', dark: '#C46520' },
  moon: { name: p('moon', 'luna'), color: '#6C7BD9', dark: '#4A57A8' },
  oval: { name: p('oval', 'óvalo'), color: '#2BB3B1', dark: '#1D8584' },
  rectangle: { name: p('rectangle', 'rectángulo'), color: '#E06D5A', dark: '#B04E3E' },
  pentagon: { name: p('pentagon', 'pentágono'), color: '#B07BD6', dark: '#8455A8' },
  cross: { name: p('cross', 'cruz'), color: '#E5A93A', dark: '#B58220' },
};

const poly = (n: number, r: number, rot = -Math.PI / 2) =>
  'M ' +
  Array.from({ length: n }, (_, k) => {
    const a = rot + (k * 2 * Math.PI) / n;
    return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' L ') +
  ' Z';

/** SVG path for a shape of radius r centered at 0,0 */
export function shapePath(id: ShapeId, r: number): string {
  switch (id) {
    case 'circle':
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    case 'square': {
      const s = r * 0.88;
      const k = r * 0.18;
      return `M ${-s + k} ${-s} H ${s - k} Q ${s} ${-s} ${s} ${-s + k} V ${s - k} Q ${s} ${s} ${s - k} ${s} H ${-s + k} Q ${-s} ${s} ${-s} ${s - k} V ${-s + k} Q ${-s} ${-s} ${-s + k} ${-s} Z`;
    }
    case 'triangle':
      return `M 0 ${-r} L ${r * 0.95} ${r * 0.72} L ${-r * 0.95} ${r * 0.72} Z`;
    case 'star': {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.48;
        pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr + r * 0.06).toFixed(1)}`);
      }
      return 'M ' + pts.join(' L ') + ' Z';
    }
    case 'heart':
      return `M 0 ${r * 0.85} C ${-r * 1.4} ${-r * 0.1} ${-r * 0.7} ${-r * 1.15} 0 ${-r * 0.45} C ${r * 0.7} ${-r * 1.15} ${r * 1.4} ${-r * 0.1} 0 ${r * 0.85} Z`;
    case 'diamond':
      return `M 0 ${-r} L ${r * 0.72} 0 L 0 ${r} L ${-r * 0.72} 0 Z`;
    case 'hexagon':
      return poly(6, r, 0);
    case 'pentagon':
      return poly(5, r);
    case 'moon':
      return `M ${r * 0.35} ${-r * 0.94} A ${r} ${r} 0 1 0 ${r * 0.35} ${r * 0.94} A ${r * 0.78} ${r * 0.78} 0 1 1 ${r * 0.35} ${-r * 0.94} Z`;
    case 'oval':
      return `M ${-r} 0 a ${r} ${r * 0.62} 0 1 0 ${2 * r} 0 a ${r} ${r * 0.62} 0 1 0 ${-2 * r} 0 Z`;
    case 'rectangle': {
      const w = r;
      const h = r * 0.55;
      const k = r * 0.14;
      return `M ${-w + k} ${-h} H ${w - k} Q ${w} ${-h} ${w} ${-h + k} V ${h - k} Q ${w} ${h} ${w - k} ${h} H ${-w + k} Q ${-w} ${h} ${-w} ${h - k} V ${-h + k} Q ${-w} ${-h} ${-w + k} ${-h} Z`;
    }
    case 'cross': {
      const a = r * 0.34;
      return `M ${-a} ${-r} H ${a} V ${-a} H ${r} V ${a} H ${a} V ${r} H ${-a} V ${a} H ${-r} V ${-a} H ${-a} Z`;
    }
  }
}

export function Shape({ id, r, fill, stroke, sw = 0, className }: { id: ShapeId; r: number; fill: string; stroke?: string; sw?: number; className?: string }) {
  return <path d={shapePath(id, r)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" className={className} />;
}
