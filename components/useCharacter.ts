'use client';
// Characters live in the browser and, once signed in, in the account database.
// One shared store so every component on the page (nav, map, guide) sees the same character instantly.
import { useMemo, useSyncExternalStore } from 'react';
import type { Profile, Progress } from '../src/criteria.ts';
import { newCharacterId, sanitizeCharacter, type ChangeSource, type Character, type HistoryEntry, type Playstyle, type SavedBuild } from '../src/character.ts';

export type { ChangeSource, Character, HistoryEntry, Playstyle, SavedBuild };
export type Mark = 'done' | 'active' | null;
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

export const PLAYSTYLES: { id: Playstyle; label: string; help: string }[] = [
  { id: 'solo', label: 'PvM solo', help: 'Combattre les monstres seul, à son rythme.' },
  { id: 'groupe', label: 'PvM en groupe', help: 'Donjons et monstres avec d’autres joueurs.' },
  { id: 'pvp', label: 'PvP', help: 'Affronter d’autres joueurs (Kolizéum, percepteurs…).' },
];

/**
 * `owner`: the account these characters were last synced with. On a shared browser, characters of
 * account A must never be merged into account B when B signs in (they stay on A's server copy).
 */
interface Store { activeId: string | null; characters: Character[]; sync: SyncState; owner: number | null }

const KEY = 'dofus-companion:characters:v2';
const OLD_KEY = 'dofus-companion:character:v1';
const EMPTY_STORE: Store = { activeId: null, characters: [], sync: 'local', owner: null };
export const DEFAULT_CHARACTER: Character = sanitizeCharacter({}, 'c0')!;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as { activeId?: unknown; characters?: unknown; owner?: unknown };
      const characters = (Array.isArray(s.characters) ? s.characters : [])
        .map((c, i) => sanitizeCharacter(c, `c${i}`)).filter((c): c is Character => c !== null);
      const activeId = characters.some((c) => c.id === s.activeId) ? (s.activeId as string) : characters[0]?.id ?? null;
      return { activeId, characters, sync: 'local', owner: Number.isInteger(s.owner) ? (s.owner as number) : null };
    }
    // migrate the single character saved by the first version of the quest map
    const old = localStorage.getItem(OLD_KEY);
    const c = old ? sanitizeCharacter({ ...JSON.parse(old), name: 'Mon personnage' }, 'c0') : null;
    if (c) return { activeId: c.id, characters: [c], sync: 'local', owner: null };
  } catch { /* private mode or corrupt value: start empty */ }
  // a new object, not EMPTY_STORE: React re-renders only when the snapshot changes, and EMPTY_STORE means "not loaded yet"
  return { ...EMPTY_STORE };
}

let store: Store = EMPTY_STORE;
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: Store) {
  store = next;
  try { localStorage.setItem(KEY, JSON.stringify({ activeId: store.activeId, characters: store.characters, owner: store.owner })); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}
function set(next: Omit<Store, 'sync' | 'owner'>) {
  emit({ ...next, owner: store.owner, sync: account ? 'syncing' : 'local' });
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
  emit({ activeId, characters, sync: 'syncing', owner: account });
  await push();
}

/**
 * Explicit sign-out: sends pending changes, then removes the account's characters from this browser
 * (shared computers). If they could not be sent, they are kept, still marked with their owner.
 */
export async function flushAndForget(after: () => Promise<void>) {
  if (timer) { clearTimeout(timer); timer = null; }
  await push();
  const saved = store.sync !== 'error';
  await after();
  if (saved) emit({ ...EMPTY_STORE });
}

/** After account deletion: the server copy is gone, the local one goes too. */
export const forgetLocal = () => emit({ ...EMPTY_STORE });

/** Called by the session hook when the signed-in user changes. */
export async function connectAccount(userId: number | null) {
  if (userId === account) return;
  account = userId;
  pushed.clear();
  if (!userId) { emit({ ...store, sync: 'local' }); return; }
  if (!loaded) { store = load(); loaded = true; }
  // characters synced with another account on this browser are that account's: not merged into this one
  if (store.owner !== null && store.owner !== userId) emit({ ...EMPTY_STORE });
  try { await pull(); } catch { emit({ ...store, sync: 'error' }); }
}

/** Appends what changed between two versions of a character to its history. */
function withHistory(before: Character, after: Character, source: ChangeSource, label: string): Character {
  const was = new Set(before.done), now = new Set(after.done);
  const added = after.done.filter((d) => !was.has(d)), removed = before.done.filter((d) => !now.has(d));
  if (!added.length && !removed.length) return after;
  const entry: HistoryEntry = { at: new Date().toISOString(), source, added, removed, label: label.slice(0, 160) };
  return { ...after, history: [...before.history, entry].slice(-200) };
}

// ---------- backups (same format for every profile, independent of the account)
const BACKUP_APP = 'atlas-des-douze';

export function exportBackup(): string {
  return JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), characters: store.characters }, null, 2);
}

/** Adds the backup's characters; one with the same id is replaced. */
export function importBackup(text: string): { imported: number; replaced: number } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Ce fichier n’est pas une sauvegarde valide (JSON illisible).'); }
  const list = (data as { app?: unknown; characters?: unknown })?.characters;
  if ((data as { app?: unknown })?.app !== BACKUP_APP || !Array.isArray(list)) throw new Error('Ce fichier n’est pas une sauvegarde de ce site.');
  const now = new Date().toISOString();
  // stamped now so the imported copy wins over the account's on the next sync
  const imported = list.map((c) => sanitizeCharacter(c, newCharacterId())).filter((c): c is Character => c !== null).map((c) => ({ ...c, updatedAt: now }));
  if (!imported.length) throw new Error('Aucun personnage valide dans ce fichier.');
  const ids = new Set(imported.map((c) => c.id));
  const replaced = store.characters.filter((c) => ids.has(c.id)).length;
  set({ activeId: store.activeId ?? imported[0].id, characters: [...store.characters.filter((c) => !ids.has(c.id)), ...imported] });
  return { imported: imported.length, replaced };
}

// ---------- Windows companion: it writes to the character it saw in DOFUS, which may not be the active one
function current(): Store { if (!loaded) { store = load(); loaded = true; } return store; }
export const getCharacters = () => current().characters;
/** Edits one character by id (stamped for sync). False when it does not exist. */
export function updateCharacterById(id: string, fn: (c: Character) => Character): boolean {
  const s = current();
  if (!s.characters.some((c) => c.id === id)) return false;
  const now = new Date().toISOString();
  set({ activeId: s.activeId, characters: s.characters.map((c) => (c.id === id ? { ...fn(c), updatedAt: now } : c)) });
  return true;
}
export function selectCharacter(id: string) {
  const s = current();
  if (s.activeId !== id && s.characters.some((c) => c.id === id)) set({ activeId: id, characters: s.characters });
}
export function addCharacter(c: Character) {
  const s = current();
  set({ activeId: c.id, characters: [...s.characters, c] });
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
    ready: s !== EMPTY_STORE,
    sync: s.sync,
    characters: s.characters,
    hasCharacter: active !== null,
    character,
    progress,
    setLevel: (level: number) => update((c) => ({ ...c, level: Math.min(200, Math.max(1, Math.round(level) || 1)) })),
    setProfile: (patch: Partial<Profile>) => update((c) => ({ ...c, profile: { ...c.profile, ...patch } })),
    setInfo: (patch: Partial<Pick<Character, 'name' | 'element' | 'playstyle' | 'notes'>>) => update((c) => ({ ...c, ...patch })),
    setMark: (id: string, mark: Mark, source: ChangeSource = 'manual', label = '') => update((c) => withHistory(c, {
      ...c,
      done: mark === 'done' ? [...c.done.filter((d) => d !== id), id] : c.done.filter((d) => d !== id),
      active: mark === 'active' ? [...c.active.filter((d) => d !== id), id] : c.active.filter((d) => d !== id),
    }, source, label)),
    /** Marks several nodes done at once (a quest and its prerequisites, a confirmed scan). */
    markDone: (ids: string[], source: ChangeSource = 'manual', label = '') => update((c) => {
      const add = new Set(ids);
      return withHistory(c, { ...c, done: [...c.done.filter((d) => !add.has(d)), ...add], active: c.active.filter((d) => !add.has(d)) }, source, label);
    }),
    /** Puts back a previous progress snapshot (undo). */
    restoreProgress: (done: string[], active: string[]) => update((c) => withHistory(c, { ...c, done, active }, 'manual', 'Annulation')),
    /** Undoes one history entry: what it added is removed, what it removed comes back. */
    revertEntry: (index: number) => update((c) => {
      const h = c.history[index];
      if (!h) return c;
      const added = new Set(h.added);
      return withHistory(c, { ...c, done: [...c.done.filter((d) => !added.has(d)), ...h.removed.filter((d) => !c.done.includes(d))] }, 'manual', `Annulation : ${h.label}`);
    }),
    saveBuild: (b: Omit<SavedBuild, 'savedAt'>, wear = false) => update((c) => ({
      ...c,
      builds: [...c.builds.filter((x) => x.id !== b.id), { ...b, savedAt: new Date().toISOString() }],
      currentBuild: wear ? b.id : c.currentBuild,
    })),
    removeBuild: (id: string) => update((c) => ({ ...c, builds: c.builds.filter((x) => x.id !== id), currentBuild: c.currentBuild === id ? undefined : c.currentBuild })),
    /** Profession level (1–200) of the active character; null forgets it. */
    setJobLevel: (jobId: number, level: number | null) => update((c) => {
      const jobs = { ...c.jobs };
      if (level == null) delete jobs[jobId]; else jobs[jobId] = Math.min(200, Math.max(1, Math.round(level)));
      return { ...c, jobs };
    }),
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
    reset: () => update((c) => withHistory(c, { ...c, done: [], active: [] }, 'manual', 'Progression réinitialisée')),
  };
}
