'use client';
// The site's side of the Windows companion: while a page of Atlas is open, it asks the companion (127.0.0.1:47120)
// for new events, decides what to do with each one (src/companion-sync.ts) and writes progress through the
// character store, then tells the companion. The site works the same without it: nothing runs until it is paired.
import { useEffect, useSyncExternalStore } from 'react';
import { applyCompletion, COMPANION_MODES, decide, findByGameName, noteSeen, parseEvent, type CompanionEvent, type CompanionMode } from '../../src/companion-sync.ts';
import { newCharacterId, sanitizeCharacter } from '../../src/character.ts';
import { addCharacter, getCharacters, selectCharacter, updateCharacterById } from '../useCharacter';

export const COMPANION_URL = 'http://127.0.0.1:47120';
const KEY = 'atlas:companion:v1';
type Ack = 'applied' | 'pending' | 'rejected' | 'ignored';

export interface CompanionStatus {
  mode: CompanionMode; stopped: boolean; dofus: boolean; list: string;
  active: { characterKey: string; className: string; breedId: number | null; gameVersion: string } | null;
}
export interface Recent { event: CompanionEvent; outcome: string; at: string }
export interface SyncState {
  paired: boolean; connected: boolean; error: string | null; lastSync: string | null;
  status: CompanionStatus | null; pending: CompanionEvent[]; recent: Recent[];
}

let token: string | null = null, last: string | null = null;
let state: SyncState = { paired: false, connected: false, error: null, lastSync: null, status: null, pending: [], recent: [] };
let loaded = false, timer: ReturnType<typeof setTimeout> | null = null, running = false;
const acks = new Map<string, Ack>(); // sent with the next request, kept until the companion has them
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && /^[a-f0-9]{64}$/.test(raw.token)) {
      token = raw.token;
      last = typeof raw.last === 'string' && /^[a-z0-9]{10,40}$/.test(raw.last) ? raw.last : null;
      const pending = Array.isArray(raw.pending) ? raw.pending.map(parseEvent).filter(Boolean) as CompanionEvent[] : [];
      state = { ...state, paired: true, pending };
    }
  } catch { /* storage unavailable or damaged: not paired */ }
}
function save() {
  try {
    if (token) localStorage.setItem(KEY, JSON.stringify({ token, last, pending: state.pending }));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
}
function emit(patch: Partial<SyncState>) { state = { ...state, ...patch }; save(); listeners.forEach((l) => l()); }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(COMPANION_URL + path, {
    ...init, signal: AbortSignal.timeout(4000), cache: 'no-store',
    headers: { authorization: `Bearer ${token}`, ...(init?.body ? { 'content-type': 'application/json' } : {}) },
  });
  if (r.status === 401) throw Object.assign(new Error('Code d’appairage refusé : collez le code affiché par le compagnon.'), { auth: true });
  if (!r.ok) throw new Error(`Compagnon : erreur ${r.status}`);
  return r.json() as Promise<T>;
}

const name = (e: CompanionEvent) => e.name ?? e.objectId ?? '';
function note(event: CompanionEvent, outcome: string) {
  state = { ...state, recent: [{ event, outcome, at: new Date().toISOString() }, ...state.recent].slice(0, 30) };
}

/** One event: decide, write if allowed, remember what to tell the companion. */
function handle(e: CompanionEvent, mode: CompanionMode) {
  const d = decide(e, getCharacters(), mode);
  if (d.kind === 'switch') {
    updateCharacterById(d.characterId, (c) => noteSeen(c, e));
    selectCharacter(d.characterId);
    acks.set(e.eventId, 'applied'); note(e, 'Profil actif');
  } else if (d.kind === 'apply') {
    updateCharacterById(d.characterId, (c) => applyCompletion(c, e));
    acks.set(e.eventId, 'applied'); note(e, 'Enregistré');
  } else if (d.kind === 'pending') {
    // one card per unknown character, however many times it is seen
    const dup = state.pending.some((p) => p.eventId === e.eventId || (e.type === 'character.seen' && p.type === 'character.seen' && p.characterKey === e.characterKey));
    if (!dup) state = { ...state, pending: [...state.pending, e].slice(-300) };
    acks.set(e.eventId, 'pending'); note(e, d.reason === 'unknown-character' ? 'Profil à choisir' : 'À confirmer');
  } else {
    acks.set(e.eventId, 'ignored');
    if (d.reason !== 'info') note(e, { observation: 'Observé (mode observation)', 'already-done': 'Déjà fait', 'already-applied': 'Déjà enregistré' }[d.reason]);
  }
}

async function flushAcks() {
  if (!acks.size) return;
  const batch = [...acks].map(([eventId, status]) => ({ eventId, status }));
  await call('/v1/ack', { method: 'POST', body: JSON.stringify({ acks: batch }) });
  for (const a of batch) acks.delete(a.eventId);
}

async function tick() {
  timer = null;
  if (!token) return;
  try {
    const status = await call<CompanionStatus>('/v1/status');
    const mode = COMPANION_MODES.includes(status.mode) ? status.mode : 'assisted';
    const { events } = await call<{ events: unknown[] }>(`/v1/events${last ? `?after=${last}` : ''}`);
    for (const raw of events) {
      const e = parseEvent(raw);
      const id = (raw as { eventId?: unknown })?.eventId;
      if (e) handle(e, mode);
      else if (typeof id === 'string' && /^[a-z0-9]{10,40}$/.test(id)) acks.set(id, 'rejected');
      if (typeof id === 'string' && /^[a-z0-9]{10,40}$/.test(id) && (!last || id > last)) last = id;
    }
    await flushAcks();
    emit({ connected: true, error: null, status, lastSync: new Date().toISOString() });
  } catch (err) {
    const e = err as Error & { auth?: boolean };
    emit({ connected: false, error: e.auth ? e.message : 'Compagnon injoignable : est-il ouvert sur ce PC ?' });
  }
  if (token) timer = setTimeout(tick, state.connected ? 2000 : 5000);
}

function start() {
  load();
  if (running || !token) return;
  running = true;
  void tick().finally(() => { running = false; });
}

function subscribe(l: () => void) { load(); listeners.add(l); return () => listeners.delete(l); }
const SERVER: SyncState = { paired: false, connected: false, error: null, lastSync: null, status: null, pending: [], recent: [] };

/** Re-reads the waiting events after a profile was created or linked: they may now have somewhere to go. */
function retryPending() {
  const mode = state.status?.mode ?? 'assisted';
  const keep: CompanionEvent[] = [];
  const waiting = state.pending;
  state = { ...state, pending: [] };
  for (const e of waiting) {
    const d = decide(e, getCharacters(), mode);
    if (d.kind === 'pending') keep.push(e);
    else handle(e, mode);
  }
  state = { ...state, pending: [...keep, ...state.pending.filter((p) => !keep.includes(p))] };
}

function settle(eventId: string, ack: Ack, outcome?: string) {
  const e = state.pending.find((p) => p.eventId === eventId);
  if (!e) return;
  acks.set(eventId, ack);
  if (outcome) note(e, outcome);
  emit({ pending: state.pending.filter((p) => p.eventId !== eventId) });
  void flushAcks().catch(() => { /* sent with the next poll */ });
}

export const companion = {
  /** Pairs with the code shown by the companion, after checking that it answers. */
  async pair(code: string) {
    const t = code.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(t)) throw new Error('Le code d’appairage fait 64 caractères (chiffres et lettres a à f). Copiez-le depuis le compagnon.');
    const before = token;
    token = t;
    try { await call('/v1/status'); }
    catch (e) { token = before; throw (e as { auth?: boolean }).auth ? e : new Error('Le compagnon ne répond pas : ouvrez-le sur ce PC, puis réessayez.'); }
    last = null;
    emit({ paired: true, error: null });
    start();
  },
  unpair() {
    token = null; last = null; acks.clear();
    if (timer) clearTimeout(timer);
    timer = null;
    emit({ paired: false, connected: false, status: null, pending: [], error: null });
  },
  /** A completion confirmed by the player goes to the character the companion saw. */
  confirm(eventId: string) {
    const e = state.pending.find((p) => p.eventId === eventId);
    const c = e?.characterKey ? findByGameName(getCharacters(), e.characterKey) : null;
    if (!e || !c || e.type === 'character.seen') return;
    updateCharacterById(c.id, (x) => applyCompletion(x, e));
    settle(eventId, 'applied', 'Confirmé');
  },
  confirmAll(characterKey: string) {
    for (const p of state.pending.filter((x) => x.characterKey === characterKey && x.type !== 'character.seen')) companion.confirm(p.eventId);
  },
  reject(eventId: string) { settle(eventId, 'rejected', 'Refusé'); },
  /** A profile for a character seen for the first time: only on the player's click. */
  createProfile(eventId: string) {
    const e = state.pending.find((p) => p.eventId === eventId);
    if (!e?.characterKey || findByGameName(getCharacters(), e.characterKey)) return;
    const id = newCharacterId();
    addCharacter(sanitizeCharacter({ id, name: e.characterKey, gameName: e.characterKey, lastSeenAt: e.at, profile: { breed: e.breedId ?? undefined }, updatedAt: new Date().toISOString() }, id)!);
    settle(eventId, 'applied', 'Profil créé');
    retryPending(); emit({});
  },
  /** Links an existing profile to the in-game name. Refused if another profile already has that name. */
  link(eventId: string, characterId: string) {
    const e = state.pending.find((p) => p.eventId === eventId);
    if (!e?.characterKey) return;
    const owner = findByGameName(getCharacters(), e.characterKey);
    if (owner && owner.id !== characterId) throw new Error(`« ${e.characterKey} » est déjà lié au profil « ${owner.name} ».`);
    updateCharacterById(characterId, (c) => ({ ...noteSeen(c, e), gameName: e.characterKey }));
    selectCharacter(characterId);
    settle(eventId, 'applied', 'Profil lié');
    retryPending(); emit({});
  },
  async control(c: { mode?: CompanionMode; stop?: boolean }) {
    const status = await call<CompanionStatus>('/v1/control', { method: 'POST', body: JSON.stringify(c) });
    emit({ status });
  },
};

/** The sync state; also starts the polling on any page once paired. */
export function useCompanionSync(): SyncState {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => { start(); }, [s.paired]);
  return s;
}

export const eventLabel = (e: CompanionEvent) => ({
  'character.seen': `Personnage vu : ${e.characterKey}${e.className ? ` (${e.className})` : ''}`,
  'quest.completed': `Quête terminée : ${name(e)}`,
  'achievement.completed': `Succès obtenu : ${name(e)}`,
  'companion.stopped': 'Compagnon arrêté', 'companion.resumed': 'Compagnon relancé',
}[e.type]);
