'use client';
// Signed-in user, shared by every component; drives the character sync.
import { useEffect, useSyncExternalStore } from 'react';
import { connectAccount } from '../useCharacter';

export interface User { id: number; email: string }
interface State { ready: boolean; user: User | null }

let state: State = { ready: false, user: null };
let started = false;
const listeners = new Set<() => void>();
const setState = (s: State) => { state = s; listeners.forEach((l) => l()); void connectAccount(s.user?.id ?? null); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

async function call(action: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, any> }> {
  const r = await fetch(`/api/auth/${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export async function refreshSession() {
  try {
    const { data } = await call('me');
    setState({ ready: true, user: data.user ?? null });
  } catch {
    setState({ ready: true, user: null });
  }
}

export function useSession() {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => { if (!started) { started = true; void refreshSession(); } }, []);
  const auth = async (action: 'login' | 'register', email: string, password: string) => {
    const { ok, data } = await call(action, { email, password });
    if (ok) setState({ ready: true, user: data.user });
    return ok ? null : (data.error as string) ?? 'Erreur inattendue.';
  };
  return {
    ...s,
    login: (email: string, password: string) => auth('login', email, password),
    register: (email: string, password: string) => auth('register', email, password),
    logout: async () => { await call('logout', {}); setState({ ready: true, user: null }); },
    forgot: async (email: string) => (await call('forgot', { email })).data.message as string,
    reset: async (token: string, password: string) => {
      const { ok, data } = await call('reset', { token, password });
      return ok ? null : (data.error as string) ?? 'Erreur inattendue.';
    },
  };
}
