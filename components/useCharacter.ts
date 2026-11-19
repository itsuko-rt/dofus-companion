'use client';
// Characters live in the browser and, once signed in, in the account database.
// One shared store so every component on the page (nav, map, guide) sees the same character instantly.
import { useMemo, useSyncExternalStore } from 'react';
import type { Profile, Progress } from '../src/criteria.ts';
import { newCharacterId, sanitizeCharacter, type Character, type Playstyle, type SavedBuild } from '../src/character.ts';

export type { Character, Playstyle, SavedBuild };
export type Mark = 'done' | 'active' | null;
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

export const PLAYSTYLES: { id: Playstyle; label: string; help: string }[] = [
  { id: 'solo', label: 'PvM solo', help: 'Combattre les monstres seul, à son rythme.' },
  { id: 'groupe', label: 'PvM en groupe', help: 'Donjons et monstres avec d’autres joueurs.' },
  { id: 'pvp', label: 'PvP', help: 'Affronter d’autres joueurs (Kolizéum, percepteurs…).' },
];

interface Store { activeId: string | null; characters: Character[]; sync: SyncState }

const KEY = 'dofus-companion:characters:v2';
const OLD_KEY = 'dofus-companion:character:v1';
const EMPTY_STORE: Store = { activeId: null, characters: [], sync: 'local' };
export const DEFAULT_CHARACTER: Character = sanitizeCharacter({}, 'c0')!;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as { activeId?: unknown; characters?: unknown };
      const characters = (Array.isArray(s.characters) ? s.characters : [])
        .map((c, i) => sanitizeCharacter(c, `c${i}`)).filter((c): c is Character => c !== null);
      const activeId = characters.some((c) => c.id === s.activeId) ? (s.activeId as string) : characters[0]?.id ?? null;
      return { activeId, characters, sync: 'local' };
    }
    // migrate the single character saved by the first version of the quest map
    const old = localStorage.getItem(OLD_KEY);
    const c = old ? sanitizeCharacter({ ...JSON.parse(old), name: 'Mon personnage' }, 'c0') : null;
    if (c) return { activeId: c.id, characters: [c], sync: 'local' };
  } catch { /* private mode or corrupt value: start empty */ }
  return EMPTY_STORE;
}

let store: Store = EMPTY_STORE;
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: Store) {
  store = next;
  try { localStorage.setItem(KEY, JSON.stringify({ activeId: store.activeId, characters: store.characters })); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}
function set(next: Omit<Store, 'sync'>) {
  emit({ ...next, sync: account ? 'syncing' : 'local' });
  schedulePush();
}
function subscribe(l: () => void) {
  if (!loaded) { store = load(); loaded = true; }
  listeners.add(l);
  queueMicrotask(l); // render once with the loaded store
  return () => listeners.delete(l);
}
const getSnapshot = () => store;
const getServerSnapshot = () => EMPTY_STORE;

// ---------- account sync
let account: number | null = null;
const pushed = new Map<string, string>(); // id → JSON last saved on the server
let timer: ReturnType<typeof setTimeout> | null = null;

const api = (path: string, init?: RequestInit) => fetch(path, { ...init, headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });

function schedulePush() {
  if (!account) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 700);
}

async function push() {
  if (!account) return;
  try {
    for (const c of store.characters) {
      const body = JSON.stringify(c);
      if (pushed.get(c.id) === body) continue;
      const r = await api(`/api/characters/${c.id}`, { method: 'PUT', body });
      if (r.status === 409) { await pull(); return; }
      if (!r.ok) throw new Error(String(r.status));
      pushed.set(c.id, body);
    }
    for (const id of [...pushed.keys()]) {
      if (store.characters.some((c) => c.id === id)) continue;
      const r = await api(`/api/characters/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(String(r.status));
      pushed.delete(id);
    }
    emit({ ...store, sync: 'synced' });
  } catch {
    emit({ ...store, sync: 'error' });
  }
}

/** Server copy wins when it is newer; local-only characters are uploaded. */
async function pull() {
  const r = await api('/api/characters');
  if (!r.ok) throw new Error(String(r.status));
  const remote = ((await r.json()).characters as unknown[]).map((c) => sanitizeCharacter(c, 'cx')).filter((c): c is Character => c !== null);
  pushed.clear();
  for (const c of remote) pushed.set(c.id, JSON.stringify(c));
  const byId = new Map(remote.map((c) => [c.id, c]));
  for (const c of store.characters) {
    const other = byId.get(c.id);
    if (!other || c.updatedAt > other.updatedAt) byId.set(c.id, c);
  }
  const characters = [...byId.values()];
  const activeId = characters.some((c) => c.id === store.activeId) ? store.activeId : characters[0]?.id ?? null;
  emit({ activeId, characters, sync: 'syncing' });
  await push();
}

/** Called by the session hook when the signed-in user changes. */
export async function connectAccount(userId: number | null) {
  if (userId === account) return;
  account = userId;
  pushed.clear();
  if (!userId) { emit({ ...store, sync: 'local' }); return; }
  if (!loaded) { store = load(); loaded = true; }
  try { await pull(); } catch { emit({ ...store, sync: 'error' }); }
}

// ---------- hook
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

  /** Edits the active character (stamped for sync), creating a first one if there is none yet. */
  const update = (fn: (c: Character) => Character) => {
    const stamp = (c: Character) => ({ ...fn(c), updatedAt: new Date().toISOString() });
    const cur = store.characters.find((c) => c.id === store.activeId);
    if (!cur) {
      const c = stamp({ ...DEFAULT_CHARACTER, id: newCharacterId() });
      return set({ activeId: c.id, characters: [...store.characters, c] });
    }
    set({ activeId: store.activeId, characters: store.characters.map((c) => (c.id === cur.id ? stamp(c) : c)) });
  };

  return {
    ready: loaded,
    sync: s.sync,
    characters: s.characters,
    hasCharacter: active !== null,
    character,
    progress,
    setLevel: (level: number) => update((c) => ({ ...c, level: Math.min(200, Math.max(1, Math.round(level) || 1)) })),
    setProfile: (patch: Partial<Profile>) => update((c) => ({ ...c, profile: { ...c.profile, ...patch } })),
    setInfo: (patch: Partial<Pick<Character, 'name' | 'element' | 'playstyle' | 'notes'>>) => update((c) => ({ ...c, ...patch })),
    setMark: (id: string, mark: Mark) => update((c) => ({
      ...c,
      done: mark === 'done' ? [...c.done.filter((d) => d !== id), id] : c.done.filter((d) => d !== id),
      active: mark === 'active' ? [...c.active.filter((d) => d !== id), id] : c.active.filter((d) => d !== id),
    })),
    saveBuild: (b: Omit<SavedBuild, 'savedAt'>, wear = false) => update((c) => ({
      ...c,
      builds: [...c.builds.filter((x) => x.id !== b.id), { ...b, savedAt: new Date().toISOString() }],
      currentBuild: wear ? b.id : c.currentBuild,
    })),
    removeBuild: (id: string) => update((c) => ({ ...c, builds: c.builds.filter((x) => x.id !== id), currentBuild: c.currentBuild === id ? undefined : c.currentBuild })),
    wearBuild: (id: string | undefined) => update((c) => ({ ...c, currentBuild: id })),
    create: (c: Pick<Character, 'name' | 'level' | 'element' | 'playstyle' | 'profile'>) => {
      const created = sanitizeCharacter({ ...c, id: newCharacterId(), updatedAt: new Date().toISOString() }, newCharacterId())!;
      set({ activeId: created.id, characters: [...store.characters, created] });
      return created.id;
    },
    select: (id: string) => set({ activeId: id, characters: store.characters }),
    remove: (id: string) => {
      const characters = store.characters.filter((c) => c.id !== id);
      set({ activeId: store.activeId === id ? characters[0]?.id ?? null : store.activeId, characters });
    },
    /** Clears the active character's progress (keeps the character). */
    reset: () => update((c) => ({ ...c, done: [], active: [] })),
  };
}
