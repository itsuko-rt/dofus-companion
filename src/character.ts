// Character model shared by the browser store and the account API. Anything coming from
// localStorage or a request body goes through sanitizeCharacter before being used or stored.
import type { Profile } from './criteria.ts';
import { ELEMENTS, type Element } from './spells.ts';

export type Playstyle = 'solo' | 'groupe' | 'pvp';
export const PLAYSTYLE_IDS: Playstyle[] = ['solo', 'groupe', 'pvp'];

export interface SavedBuild { source: string; id: string; name: string; level: number; url: string; savedAt: string }

export interface Character {
  id: string;
  name: string;
  level: number;
  element?: Element;
  playstyle?: Playstyle;
  profile: Profile;
  done: string[];        // node ids: quest:…, ach:…, dungeon:…
  active: string[];
  builds: SavedBuild[];  // saved community builds
  currentBuild?: string; // id of the build worn now
  notes: string;
  updatedAt: string;
}

const MAX_IDS = 20_000;
const MAX_BUILDS = 50;
const ID_RE = /^[a-z][a-z0-9]{1,40}$/;
const NODE_RE = /^(quest|ach|dungeon):\d{1,9}$/;

export function sanitizeCharacter(raw: unknown, fallbackId: string): Character | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');
  const ids = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((v): v is string => typeof v === 'string' && NODE_RE.test(v)))].slice(0, MAX_IDS) : []);
  const int = (x: unknown, min: number, max: number) => (Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? (x as number) : undefined);
  const p = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const builds = (Array.isArray(r.builds) ? r.builds : []).flatMap((b): SavedBuild[] => {
    if (!b || typeof b !== 'object') return [];
    const x = b as Record<string, unknown>;
    const url = str(x.url, 300);
    if (!/^https:\/\/dofusfashionista\.gg\//.test(url) || typeof x.id !== 'string') return [];
    return [{ source: 'Dofus Fashionista', id: str(x.id, 60), name: str(x.name, 80), level: int(x.level, 1, 200) ?? 1, url, savedAt: str(x.savedAt, 40) }];
  }).slice(0, MAX_BUILDS);
  const id = typeof r.id === 'string' && ID_RE.test(r.id) ? r.id : fallbackId;
  return {
    id,
    name: str(r.name, 40).trim() || 'Mon personnage',
    level: int(Number(r.level), 1, 200) ?? 1,
    element: ELEMENTS.includes(r.element as Element) ? (r.element as Element) : undefined,
    playstyle: PLAYSTYLE_IDS.includes(r.playstyle as Playstyle) ? (r.playstyle as Playstyle) : undefined,
    profile: {
      breed: int(p.breed, 1, 99), alignmentSide: int(p.alignmentSide, 0, 3), alignmentLevel: int(p.alignmentLevel, 0, 200),
      subscribed: typeof p.subscribed === 'boolean' ? p.subscribed : undefined,
    },
    done: ids(r.done),
    active: ids(r.active),
    builds,
    currentBuild: typeof r.currentBuild === 'string' && builds.some((b) => b.id === r.currentBuild) ? r.currentBuild : undefined,
    notes: str(r.notes, 4000),
    updatedAt: str(r.updatedAt, 40) || new Date(0).toISOString(),
  };
}

export const newCharacterId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
