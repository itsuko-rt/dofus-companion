'use client';
// Local characters, saved in the browser (no accounts yet). One shared store so every
// component on the page (nav, map, guide) sees the same character instantly.
import { useMemo, useSyncExternalStore } from 'react';
import type { Profile, Progress } from '../src/criteria.ts';
import { ELEMENTS, type Element } from '../src/spells.ts';

export type Playstyle = 'solo' | 'groupe' | 'pvp';
export const PLAYSTYLES: { id: Playstyle; label: string; help: string }[] = [
  { id: 'solo', label: 'PvM solo', help: 'Combattre les monstres seul, à son rythme.' },
  { id: 'groupe', label: 'PvM en groupe', help: 'Donjons et monstres avec d’autres joueurs.' },
  { id: 'pvp', label: 'PvP', help: 'Affronter d’autres joueurs (Kolizéum, percepteurs…).' },
];

export interface Character {
  id: string;
  name: string;
  level: number;
  element?: Element;
  playstyle?: Playstyle;
  profile: Profile; // breed, alignment… (used by quest conditions)
  done: string[];
  active: string[];
}
export type Mark = 'done' | 'active' | null;

interface Store { activeId: string | null; characters: Character[] }

const KEY = 'dofus-companion:characters:v2';
const OLD_KEY = 'dofus-companion:character:v1';
const EMPTY_STORE: Store = { activeId: null, characters: [] };
export const DEFAULT_CHARACTER: Character = { id: '', name: '', level: 1, profile: {}, done: [], active: [] };

/** localStorage is user-editable: keep only well-formed fields. */
function sanitizeCharacter(raw: unknown, fallbackId: string): Character | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
  const int = (x: unknown) => (Number.isInteger(x) ? (x as number) : undefined);
  const p = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const level = Number(r.level);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : fallbackId,
    name: typeof r.name === 'string' ? r.name.slice(0, 40) : '',
    level: Number.isInteger(level) && level >= 1 && level <= 200 ? level : 1,
    element: ELEMENTS.includes(r.element as Element) ? (r.element as Element) : undefined,
    playstyle: PLAYSTYLES.some((s) => s.id === r.playstyle) ? (r.playstyle as Playstyle) : undefined,
    profile: {
      breed: int(p.breed), alignmentSide: int(p.alignmentSide), alignmentLevel: int(p.alignmentLevel),
      subscribed: typeof p.subscribed === 'boolean' ? p.subscribed : undefined,
    },
    done: ids(r.done),
    active: ids(r.active),
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as { activeId?: unknown; characters?: unknown };
      const characters = (Array.isArray(s.characters) ? s.characters : [])
        .map((c, i) => sanitizeCharacter(c, `c${i}`)).filter((c): c is Character => c !== null);
      const activeId = characters.some((c) => c.id === s.activeId) ? (s.activeId as string) : characters[0]?.id ?? null;
      return { activeId, characters };
    }
    // migrate the single character saved by the first version of the quest map
    const old = localStorage.getItem(OLD_KEY);
    const c = old ? sanitizeCharacter({ ...JSON.parse(old), name: 'Mon personnage' }, 'c0') : null;
    if (c) return { activeId: c.id, characters: [c] };
  } catch { /* private mode or corrupt value: start empty */ }
  return EMPTY_STORE;
}

let store: Store = EMPTY_STORE;
let loaded = false;
const listeners = new Set<() => void>();

function set(next: Store) {
  store = next;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  if (!loaded) { store = load(); loaded = true; }
  listeners.add(l);
  queueMicrotask(l); // render once with the loaded store
  return () => listeners.delete(l);
}
const getSnapshot = () => store;
const getServerSnapshot = () => EMPTY_STORE;

const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useCharacter() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = s.characters.find((c) => c.id === s.activeId) ?? null;
  const character = active ?? DEFAULT_CHARACTER;

  const progress = useMemo<Progress>(() => ({
    level: character.level,
    profile: character.profile,
    done: new Set(character.done),
    active: new Set(character.active),
  }), [character]);

  /** Edits the active character, creating a first one if there is none yet. */
  const update = (fn: (c: Character) => Character) => {
    const cur = store.characters.find((c) => c.id === store.activeId);
    if (!cur) {
      const c = fn({ ...DEFAULT_CHARACTER, id: newId(), name: 'Mon personnage' });
      return set({ activeId: c.id, characters: [...store.characters, c] });
    }
    set({ ...store, characters: store.characters.map((c) => (c.id === cur.id ? fn(c) : c)) });
  };

  return {
    ready: loaded,
    characters: s.characters,
    hasCharacter: active !== null,
    character,
    progress,
    setLevel: (level: number) => update((c) => ({ ...c, level: Math.min(200, Math.max(1, Math.round(level) || 1)) })),
    setProfile: (patch: Partial<Profile>) => update((c) => ({ ...c, profile: { ...c.profile, ...patch } })),
    setInfo: (patch: Partial<Pick<Character, 'name' | 'element' | 'playstyle'>>) => update((c) => ({ ...c, ...patch })),
    setMark: (id: string, mark: Mark) => update((c) => ({
      ...c,
      done: mark === 'done' ? [...c.done.filter((d) => d !== id), id] : c.done.filter((d) => d !== id),
      active: mark === 'active' ? [...c.active.filter((d) => d !== id), id] : c.active.filter((d) => d !== id),
    })),
    create: (c: Omit<Character, 'id' | 'done' | 'active'>) => {
      const created: Character = { ...c, id: newId(), done: [], active: [] };
      set({ activeId: created.id, characters: [...store.characters, created] });
      return created.id;
    },
    select: (id: string) => set({ ...store, activeId: id }),
    remove: (id: string) => {
      const characters = store.characters.filter((c) => c.id !== id);
      set({ activeId: store.activeId === id ? characters[0]?.id ?? null : store.activeId, characters });
    },
    /** Clears the active character's progress (keeps the character). */
    reset: () => update((c) => ({ ...c, done: [], active: [] })),
  };
}
