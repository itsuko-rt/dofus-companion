'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, CloudOff, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { BRAND } from '../../src/brand.ts';
import { Button, Card, SectionTitle, PageHero, SECTION } from '../ui';
import { useCharacter } from '../useCharacter';
import { useSession } from './useSession';

const field = 'mt-1 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text';
type Tab = 'login' | 'register' | 'forgot';

export default function AccountView() {
  const s = useSession();
  const ch = useCharacter();
  if (!s.ready) return <p className="p-8 text-sm text-muted">Chargement…</p>;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color={SECTION.account} kicker={BRAND.name} title="Mon compte">
        <p className="text-sm text-white/80">Vos personnages et votre progression, sur tous vos appareils.</p>
      </PageHero>
      <div className="mx-auto max-w-xl px-4 py-8">
        {s.user ? <Dashboard /> : <AuthForms />}
        <p className="mt-6 text-xs text-faint">
          Ce compte est propre à {BRAND.name}. Il n’a aucun lien avec votre compte Ankama et ne s’y connecte pas.
          {!s.user && ch.characters.length > 0 && ` Vos ${ch.characters.length} personnage(s) enregistré(s) dans ce navigateur seront ajoutés à votre compte à la connexion.`}
        </p>
      </div>
    </div>
  );
}

function AuthForms() {
  const s = useSession();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    if (tab === 'forgot') setInfo(await s.forgot(email));
    else setError(await (tab === 'login' ? s.login(email, password) : s.register(email, password)));
    setBusy(false);
  };
  const tabs: [Tab, string][] = [['login', 'Connexion'], ['register', 'Créer un compte'], ['forgot', 'Mot de passe oublié']];

  return (
    <Card>
      <h2 className="font-display text-lg">Connexion au site</h2>
      <div className="mt-4 flex gap-1 border-b border-line" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(null); setInfo(null); }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>{label}</button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-muted">Adresse e-mail
          <input type="email" required autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {tab !== 'forgot' && (
          <label className="text-sm text-muted">Mot de passe {tab === 'register' && <span className="text-faint">(10 caractères minimum)</span>}
            <input type="password" required minLength={tab === 'register' ? 10 : undefined} autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {info && <p role="status" className="rounded-lg border border-done/40 bg-done/10 px-3 py-2 text-sm text-text">{info}</p>}
        <Button variant="primary" type="submit" disabled={busy}>
          {busy && <Loader2 size={15} className="animate-spin" />}
          {tab === 'login' ? 'Se connecter' : tab === 'register' ? 'Créer mon compte' : 'Recevoir un lien'}
        </Button>
      </form>
    </Card>
  );
}

function Dashboard() {
  const s = useSession();
  const ch = useCharacter();
  const SYNC = {
    synced: { icon: CheckCircle2, text: 'Progression enregistrée sur votre compte.', cls: 'text-done' },
    syncing: { icon: RefreshCw, text: 'Enregistrement en cours…', cls: 'text-muted' },
    error: { icon: CloudOff, text: 'Enregistrement impossible pour l’instant : vos changements restent dans ce navigateur et seront renvoyés.', cls: 'text-check' },
    local: { icon: CloudOff, text: 'Non synchronisé.', cls: 'text-muted' },
  }[ch.sync];
  const Icon = SYNC.icon;
  useEffect(() => { if (ch.sync === 'error') { const t = setTimeout(() => ch.setInfo({}), 15_000); return () => clearTimeout(t); } }, [ch.sync]); // retry later
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle hint={s.user!.email}>Mon compte</SectionTitle>
        <p className={`flex items-center gap-2 text-sm ${SYNC.cls}`}><Icon size={16} /> {SYNC.text}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => s.logout()}><LogOut size={15} /> Se déconnecter</Button>
        </div>
      </Card>
      <Card>
        <SectionTitle hint={`${ch.characters.length} / 20`}>Mes personnages</SectionTitle>
        <ul className="flex flex-col gap-1">
          {ch.characters.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span><b className="font-medium">{c.name}</b> <span className="text-muted">· niv. {c.level} · {c.done.length} terminées · {c.builds.length} build(s)</span></span>
            </li>
          ))}
        </ul>
        <Link href="/personnage" className="mt-3 inline-block text-sm text-accent underline">Gérer mes personnages</Link>
      </Card>
    </div>
  );
}

export function ResetView() {
  const s = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token')); }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = await s.reset(token ?? '', password);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Mot de passe changé. Vous pouvez vous connecter.' });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <h1 className="font-display text-lg font-semibold">Nouveau mot de passe</h1>
        {!token ? <p className="mt-2 text-sm text-muted">Lien incomplet : utilisez le lien reçu.</p> : (
          <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
            <label className="text-sm text-muted">Nouveau mot de passe (10 caractères minimum)
              <input type="password" required minLength={10} autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-done' : 'text-red-200'}`}>{msg.text}</p>}
            <Button variant="primary" type="submit">Changer le mot de passe</Button>
            {msg?.ok && <Link href="/compte" className="text-sm text-accent underline">Se connecter</Link>}
          </form>
        )}
      </Card>
    </div>
  );
}
