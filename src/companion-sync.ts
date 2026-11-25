// What the site does with each event of the Windows companion (knowledge: Game Companion Design §4–5). Pure, so the
// rules are tested on their own; the browser engine (components/companion/companion-sync.ts) only fetches and stores.
import { EVENT_ID_RE, NODE_RE, type Character } from './character.ts';

export type CompanionMode = 'observation' | 'assisted' | 'automatic';
export const COMPANION_MODES: CompanionMode[] = ['observation', 'assisted', 'automatic'];
const TYPES = ['character.seen', 'quest.completed', 'achievement.completed', 'companion.stopped', 'companion.resumed'] as const;
export type EventType = (typeof TYPES)[number];

export interface CompanionEvent {
  eventId: string; at: string; type: EventType;
  characterKey?: string; className?: string; breedId?: number | null;
  objectId?: string; name?: string; certain?: boolean; confidence?: number;
  evidence?: { source?: string; screen?: string; text?: string };
}

const str = (x: unknown, max: number) => (typeof x === 'string' && x.length <= max ? x : undefined);

/** Validates an event from the companion (a local program, but still outside the site: nothing is trusted). */
export function parseEvent(raw: unknown): CompanionEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = TYPES.find((t) => t === r.type);
  const eventId = str(r.eventId, 40), at = str(r.at, 40);
  if (!type || !eventId || !EVENT_ID_RE.test(eventId) || !at || Number.isNaN(Date.parse(at))) return null;
  const e: CompanionEvent = { eventId, at, type };
  const key = str(r.characterKey, 40)?.trim();
  if (key) e.characterKey = key;
  if (str(r.className, 30)) e.className = r.className as string;
  if (Number.isInteger(r.breedId) && (r.breedId as number) > 0 && (r.breedId as number) < 100) e.breedId = r.breedId as number;
  if (type === 'quest.completed' || type === 'achievement.completed') {
    const id = str(r.objectId, 20);
    const prefix = type === 'quest.completed' ? 'quest:' : 'ach:';
    if (!id || !NODE_RE.test(id) || !id.startsWith(prefix) || !key) return null;
    e.objectId = id;
    e.certain = r.certain === true;
    if (typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1) e.confidence = r.confidence;
    if (str(r.name, 160)) e.name = r.name as string;
    const ev = r.evidence as Record<string, unknown> | undefined;
    if (ev && typeof ev === 'object') e.evidence = { source: str(ev.source, 20), screen: str(ev.screen, 30), text: str(ev.text, 200) };
  }
  if (type === 'character.seen' && !key) return null;
  return e;
}

/** Exact in-game name only: two characters are never merged because their names look alike. */
export const findByGameName = (characters: Character[], key: string) => characters.find((c) => c.gameName === key) ?? null;

export type Decision =
  | { kind: 'switch'; characterId: string }                 // character.seen of a linked profile: make it active
  | { kind: 'apply'; characterId: string }                  // write the completion now
  | { kind: 'pending'; reason: 'unknown-character' | 'confirm'; characterId?: string }
  | { kind: 'ignore'; reason: 'observation' | 'already-done' | 'already-applied' | 'info' };

export function decide(e: CompanionEvent, characters: Character[], mode: CompanionMode): Decision {
  if (e.type === 'companion.stopped' || e.type === 'companion.resumed') return { kind: 'ignore', reason: 'info' };
  const c = e.characterKey ? findByGameName(characters, e.characterKey) : null;
  if (e.type === 'character.seen') return c ? { kind: 'switch', characterId: c.id } : { kind: 'pending', reason: 'unknown-character' };
  if (c && c.history.some((h) => h.eventId === e.eventId)) return { kind: 'ignore', reason: 'already-applied' };
  if (c && c.done.includes(e.objectId!)) return { kind: 'ignore', reason: 'already-done' };
  if (mode === 'observation') return { kind: 'ignore', reason: 'observation' };
  if (!c) return { kind: 'pending', reason: 'unknown-character' };
  if (mode === 'automatic' && e.certain) return { kind: 'apply', characterId: c.id };
  return { kind: 'pending', reason: 'confirm', characterId: c.id };
}

/** The character with the completion written, its history entry carrying the event id (idempotent). */
export function applyCompletion(c: Character, e: CompanionEvent, now = new Date().toISOString()): Character {
  if (!e.objectId || c.history.some((h) => h.eventId === e.eventId) || c.done.includes(e.objectId)) return c;
  const label = `${e.type === 'quest.completed' ? 'Quête terminée' : 'Succès obtenu'} : ${e.name ?? e.objectId}${e.certain ? '' : ' (confirmé)'}`.slice(0, 160);
  return {
    ...c,
    done: [...c.done, e.objectId],
    active: c.active.filter((d) => d !== e.objectId),
    history: [...c.history, { at: now, source: 'companion' as const, added: [e.objectId], removed: [], label, eventId: e.eventId }].slice(-200),
    updatedAt: now,
  };
}

/** A character.seen event linked to a profile: remembers when, and fills the class if the profile had none. */
export function noteSeen(c: Character, e: CompanionEvent): Character {
  return { ...c, lastSeenAt: e.at, profile: c.profile.breed || !e.breedId ? c.profile : { ...c.profile, breed: e.breedId } };
}
