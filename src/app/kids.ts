import type { KidId } from '../engine/storage';

export const KIDS: Record<KidId, { name: string; avatar: string; color: string; soft: string }> = {
  kid1: { name: '', avatar: '🦁', color: '#3D7BD9', soft: '#DCEAFE' },
  kid2: { name: '', avatar: '🐻', color: '#E07B2E', soft: '#FFE7D1' },
};

/**
 * The children's names are typed in the grown-up corner and saved only on the iPad,
 * so they never appear in the code. The app calls this whenever settings load or change.
 */
export function setKidNames(names: Record<KidId, string>) {
  KIDS.kid1.name = names.kid1 ?? '';
  KIDS.kid2.name = names.kid2 ?? '';
}

/** Name for grown-up screens: the typed name, or a neutral label. */
export const adultLabel = (kid: KidId) => KIDS[kid].name || (kid === 'kid1' ? 'Older child' : 'Younger child');

export const STICKERS = [
  '🦄', '🐙', '🦋', '🐢', '🦖', '🐳', '🦒', '🐬', '🦩', '🐝', '🐞', '🦔', '🦓', '🐊', '🦜', '🌈', '🍉', '🚂',
  '🚒', '🚁', '⛵', '🎸', '🥁', '🌻', '🍩', '🧁', '🍦', '🌙', '🚜', '🦕', '🐠', '🦀', '🍓', '🎺', '🪁', '🏰',
];
