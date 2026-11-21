'use client';
// The atelier list of the active character, in this browser (localStorage). Small and per character, like the notes.
import { useCallback, useSyncExternalStore } from 'react';
import type { AtelierLine } from '../../src/atelier-shared.ts';

export interface AtelierState { lines: AtelierLine[]; have: Record<number, number>; sub: boolean }
const EMPTY: AtelierState = { lines: [], have: {}, sub: true };
const key = (charId: string) => `atlas:atelier:${charId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, AtelierState>();

function read(charId: string): AtelierState {
  const hit = cache.get(charId);
  if (hit) return hit;
  let s = EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(key(charId)) ?? 'null');
    if (raw && Array.isArray(raw.lines)) {
      s = {
        lines: raw.lines.filter((l: AtelierLine) => Number.isInteger(l?.id) && Number.isInteger(l?.qty) && l.qty > 0).slice(0, 100),
        have: raw.have && typeof raw.have === 'object' ? raw.have : {},
        sub: raw.sub !== false,
      };
    }
  } catch { /* storage blocked or corrupt: start empty */ }
  cache.set(charId, s);
  return s;
}
export function writeAtelier(charId: string, next: AtelierState) {
  cache.set(charId, next);
  try { localStorage.setItem(key(charId), JSON.stringify(next)); } catch { /* private mode: kept for this page only */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('atlas:atelier:')) { cache.clear(); l(); } };
  addEventListener('storage', onStorage);
  return () => { listeners.delete(l); removeEventListener('storage', onStorage); };
};

export function useAtelier(charId: string) {
  const state = useSyncExternalStore(subscribe, () => read(charId), () => EMPTY);
  const set = useCallback((f: (s: AtelierState) => AtelierState) => writeAtelier(charId, f(read(charId))), [charId]);
  const add = useCallback((id: number, qty = 1) => set((s) => {
    const has = s.lines.find((l) => l.id === id);
    return { ...s, lines: has ? s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(100000, l.qty + qty), done: false } : l)) : [...s.lines, { id, qty }].slice(0, 100) };
  }), [set]);
  return { state, set, add };
}
