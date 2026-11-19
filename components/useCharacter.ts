'use client';
// One local character, saved in the browser (no accounts yet — phase 4).
import { useEffect, useMemo, useState } from 'react';
import type { Profile, Progress } from '../src/criteria.ts';

export interface Character { level: number; profile: Profile; done: string[]; active: string[] }
export type Mark = 'done' | 'active' | null;

const KEY = 'dofus-companion:character:v1';
const EMPTY: Character = { level: 1, profile: {}, done: [], active: [] };

/** localStorage is user-editable: keep only well-formed fields. */
function sanitize(raw: unknown): Character {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const r = raw as Record<string, unknown>;
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
  const level = Number(r.level);
  const p = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const num = (x: unknown) => (Number.isInteger(x) ? (x as number) : undefined);
  return {
    level: Number.isInteger(level) && level >= 1 && level <= 200 ? level : 1,
    profile: {
      breed: num(p.breed), alignmentSide: num(p.alignmentSide), alignmentLevel: num(p.alignmentLevel),
      subscribed: typeof p.subscribed === 'boolean' ? p.subscribed : undefined,
    },
    done: ids(r.done),
    active: ids(r.active),
  };
}

export function useCharacter() {
  const [character, setCharacter] = useState<Character>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCharacter(sanitize(JSON.parse(raw)));
    } catch { /* private mode or corrupt value: start empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(character)); } catch { /* storage unavailable */ }
  }, [character, loaded]);

  const progress = useMemo<Progress>(() => ({
    level: character.level,
    profile: character.profile,
    done: new Set(character.done),
    active: new Set(character.active),
  }), [character]);

  return {
    character,
    progress,
    setLevel: (level: number) => setCharacter((c) => ({ ...c, level: Math.min(200, Math.max(1, Math.round(level) || 1)) })),
    setProfile: (patch: Partial<Profile>) => setCharacter((c) => ({ ...c, profile: { ...c.profile, ...patch } })),
    setMark: (id: string, mark: Mark) => setCharacter((c) => ({
      ...c,
      done: mark === 'done' ? [...c.done.filter((d) => d !== id), id] : c.done.filter((d) => d !== id),
      active: mark === 'active' ? [...c.active.filter((d) => d !== id), id] : c.active.filter((d) => d !== id),
    })),
    reset: () => setCharacter(EMPTY),
  };
}
