// Character model shared by the browser store and the account API. Anything coming from
// localStorage or a request body goes through sanitizeCharacter before being used or stored.
import type { Profile } from './criteria.ts';
import { ELEMENTS, type Element } from './spells.ts';

export type Playstyle = 'solo' | 'groupe' | 'pvp';
export const PLAYSTYLE_IDS: Playstyle[] = ['solo', 'groupe', 'pvp'];

export interface SavedBuild { source: string; id: string; name: string; level: number; url: string; savedAt: string }
/** Gathering route saved from the world map: zone ids in visit order. */
export interface SavedRoute { id: string; name: string; stops: number[]; jobId?: number; resourceId?: number; savedAt: string }

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
  /** profession level per job id (1–200), declared by the player */
  jobs: Record<string, number>;
  routes: SavedRoute[];
  /** audit trail of progress changes, newest last (undo, provenance, "recently completed") */
  history: HistoryEntry[];
  updatedAt: string;
}

/** Where a change came from. 'inferred' state is never stored: it is recomputed from game conditions. */
export type ChangeSource = 'manual' | 'import' | 'scan' | 'prerequisites';
export const CHANGE_SOURCES: Record<ChangeSource, string> = {
  manual: 'Coché à la main',
  import: 'Importé (sauvegarde)',
  scan: 'Capture d’écran, confirmé',
  prerequisites: 'Prérequis, confirmé',
};
export interface HistoryEntry { at: string; source: ChangeSource; added: string[]; removed: string[]; label: string }

const MAX_IDS = 20_000;
const MAX_BUILDS = 50;
const MAX_HISTORY = 200;
const MAX_ROUTES = 20;
const MAX_STOPS = 40;
const ID_RE = /^[a-z][a-z0-9]{1,40}$/;
const NODE_RE = /^(quest|ach|dungeon|obj):\d{1,9}$/;

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
    jobs: Object.fromEntries(Object.entries(r.jobs && typeof r.jobs === 'object' && !Array.isArray(r.jobs) ? r.jobs : {})
      .filter(([k, v]) => /^\d{1,4}$/.test(k) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 200).slice(0, 40)) as Record<string, number>,
    routes: (Array.isArray(r.routes) ? r.routes : []).flatMap((x): SavedRoute[] => {
      if (!x || typeof x !== 'object') return [];
      const o = x as Record<string, unknown>;
      const stops = (Array.isArray(o.stops) ? o.stops : []).filter((v): v is number => Number.isInteger(v) && v > 0 && v < 1e6).slice(0, MAX_STOPS);
      if (typeof o.id !== 'string' || !/^r[a-z0-9]{1,30}$/.test(o.id) || !stops.length) return [];
      return [{ id: o.id, name: str(o.name, 60).trim() || 'Itinéraire', stops, jobId: int(o.jobId, 1, 9999), resourceId: int(o.resourceId, 1, 1e7), savedAt: str(o.savedAt, 40) }];
    }).slice(0, MAX_ROUTES),
    history: (Array.isArray(r.history) ? r.history : []).flatMap((h): HistoryEntry[] => {
      if (!h || typeof h !== 'object') return [];
      const x = h as Record<string, unknown>;
      const source = x.source as ChangeSource;
      if (!(source in CHANGE_SOURCES)) return [];
      return [{ at: str(x.at, 40), source, added: ids(x.added).slice(0, 2000), removed: ids(x.removed).slice(0, 2000), label: str(x.label, 160) }];
    }).slice(-MAX_HISTORY),
    updatedAt: str(r.updatedAt, 40) || new Date(0).toISOString(),
  };
}

export const newCharacterId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
