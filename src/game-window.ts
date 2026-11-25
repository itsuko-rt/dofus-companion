// Reads the DOFUS window title, which the game sets to « <character> - <class> - <version> - <channel> » once a
// character is in game (seen on 3.7.14.18, 2026-11-25). The title comes from the OS window list: nothing touches
// the game. Character names may contain hyphens (« Abc-Def »), so the title is split on « - » with spaces, from
// the right.
import breeds from './breed-data.json' with { type: 'json' };

export interface GameWindow {
  version: string;
  channel: string;
  /** null on the login and character-selection screens, whose title carries no character */
  character: { name: string; className: string; breedId: number | null } | null;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const BREEDS = new Map((breeds as { id: number; name: string }[]).map((b) => [fold(b.name), b.id]));
const VERSION = /^\d+(\.\d+){1,3}$/;

export function parseDofusTitle(title: string): GameWindow | null {
  const t = title.trim();
  if (/^dofus$/i.test(t)) return { version: '', channel: '', character: null };
  const parts = t.split(' - ');
  if (parts.length < 3) return null;
  const channel = parts.at(-1)!.trim(), version = parts.at(-2)!.trim();
  if (!VERSION.test(version) || !/^[A-Za-z]{2,20}$/.test(channel)) return null;
  if (parts.length === 3 && /^dofus$/i.test(parts[0].trim())) return { version, channel, character: null };
  if (parts.length < 4) return null;
  const className = parts.at(-3)!.trim();
  const name = parts.slice(0, -3).join(' - ').trim();
  if (!name || name.length > 40 || !className) return null;
  return { version, channel, character: { name, className, breedId: BREEDS.get(fold(className)) ?? null } };
}
