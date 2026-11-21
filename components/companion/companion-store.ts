'use client';
// Companion state of the active character, in this browser: pinned achievements and the guide position.
import { useCallback, useSyncExternalStore } from 'react';

export interface CompanionState { pins: number[]; guide: { slug: string; route: number; step: number } | null }
const EMPTY: CompanionState = { pins: [], guide: null };
const key = (charId: string) => `atlas:compagnon:${charId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, CompanionState>();

function read(charId: string): CompanionState {
  const hit = cache.get(charId);
  if (hit) return hit;
  let s = EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(key(charId)) ?? 'null');
    if (raw && typeof raw === 'object') {
      const g = raw.guide;
      s = {
        pins: Array.isArray(raw.pins) ? raw.pins.filter((x: unknown) => Number.isInteger(x)).slice(0, 30) : [],
        guide: g && typeof g.slug === 'string' && Number.isInteger(g.route) && Number.isInteger(g.step) ? { slug: g.slug, route: g.route, step: g.step } : null,
      };
    }
  } catch { /* storage blocked or corrupt: start empty */ }
  cache.set(charId, s);
  return s;
}
function write(charId: string, next: CompanionState) {
  cache.set(charId, next);
  try { localStorage.setItem(key(charId), JSON.stringify(next)); } catch { /* private mode: kept for this page only */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  // the companion popup and the main tab share this state through storage events
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('atlas:compagnon:')) { cache.clear(); l(); } };
  addEventListener('storage', onStorage);
  return () => { listeners.delete(l); removeEventListener('storage', onStorage); };
};

export function useCompanion(charId: string) {
  const state = useSyncExternalStore(subscribe, () => read(charId), () => EMPTY);
  const set = useCallback((f: (s: CompanionState) => CompanionState) => write(charId, f(read(charId))), [charId]);
  const togglePin = useCallback((id: number) => set((s) => ({ ...s, pins: s.pins.includes(id) ? s.pins.filter((x) => x !== id) : [...s.pins, id].slice(-30) })), [set]);
  return { state, set, togglePin };
}
