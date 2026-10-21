// Pictures that replace emoji.
// Drop a file named after a catalog id into src/art/<group>/ (e.g. src/art/animals/lion.png)
// and every 🦁 in the app shows that picture instead. Nothing else to change.
// Square images with a transparent background look best (512×512 PNG or WebP).

import { ID_BY_GLYPH, THING_BY_ID, needsPicture, type Thing } from '../content/catalog';

const files = import.meta.glob('../art/*/*.{png,webp,jpg,jpeg,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** catalog id → picture url */
export const ART: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.[a-z]+$/i, '').toLowerCase();
  ART[id] = url;
}

/** picture for an emoji or catalog id, if one was added */
export function artFor(glyph: string): string | undefined {
  const id = ID_BY_GLYPH[glyph] ?? (glyph.startsWith('#') ? glyph.slice(1) : glyph);
  return ART[id];
}

export const hasArt = (id: string) => !!ART[id];

/** Can a game show this thing? (it has an emoji, a built-in drawing, or a picture) */
export function showable(x: Thing, drawn: Record<string, unknown>): boolean {
  return !needsPicture(x) || hasArt(x.id) || x.emoji in drawn;
}

export { THING_BY_ID };
