'use client';
// « Compagnon Windows » on /compagnon: pairing, connection, active character in game, mode and pause, what waits for
// a confirmation, and what was done with each event. The rest of the site works the same without it.
import { useState } from 'react';
import { Check, Link2, MonitorCheck, MonitorX, Pause, Play, UserPlus, X } from 'lucide-react';
import { companion, eventLabel, useCompanionSync } from './companion-sync';
import { useCharacter } from '../useCharacter';
import { Button, Card, SectionTitle } from '../ui';
import type { CompanionEvent, CompanionMode } from '../../src/companion-sync.ts';

const MODES: { id: CompanionMode; label: string; help: string }[] = [
  { id: 'observation', label: 'Observation', help: 'Lit et note, n’enregistre rien.' },
  { id: 'assisted', label: 'Assisté', help: 'Vous confirmez chaque changement.' },
  { id: 'automatic', label: 'Automatique', help: 'Enregistre ce qui est lu avec certitude ; le reste vous attend ici.' },
];
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('fr-FR') : '—');

export default function CompanionSyncPanel() {
  const s = useCompanionSync();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => unknown) => { setError(null); setBusy(true); try { await f(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };

  if (!s.paired) return (
    <Card className="mx-auto mb-4 flex max-w-3xl flex-col gap-3">
      <SectionTitle hint="facultatif">Compagnon Windows</SectionTitle>
      <p className="text-sm text-muted">
        Le compagnon Windows lit le titre de la fenêtre DOFUS (votre personnage) et les listes que vous affichez (quêtes terminées, succès obtenus),
        puis les envoie ici. Il ne touche jamais au jeu. Lancez-le sur ce PC, puis collez son code d’appairage.
      </p>
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => companion.pair(code)); }}>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">Code d’appairage
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false}
            className="rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-xs text-text" placeholder="64 caractères, depuis « Copier le code »" />
        </label>
        <Button type="submit" variant="primary" disabled={busy || !code.trim()} className="self-end"><Link2 size={15} aria-hidden /> Relier</Button>
      </form>
      {error && <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Card>
  );

  const st = s.status;
  return (
    <Card className="mx-auto mb-4 flex max-w-3xl flex-col gap-4">
      <SectionTitle hint={<button className="hover:text-text" onClick={() => companion.unpair()}>Délier</button>}>Compagnon Windows</SectionTitle>
      <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={`inline-flex items-center gap-1.5 font-medium ${s.connected ? 'text-done' : 'text-red-300'}`}>
          {s.connected ? <MonitorCheck size={16} aria-hidden /> : <MonitorX size={16} aria-hidden />}
          {s.connected ? (st?.stopped ? 'Relié, arrêté' : 'Relié') : 'Déconnecté'}
        </span>
        {s.connected && <span className="text-muted">En jeu : {st?.active ? `${st.active.characterKey} (${st.active.className})` : st?.dofus ? 'aucun personnage' : 'DOFUS fermé'}</span>}
        <span className="text-faint">Dernière synchro : {time(s.lastSync)}</span>
      </div>
      {s.error && <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{s.error}</p>}
      {error && <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      {s.connected && st && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Mode</legend>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <label key={m.id} className={`flex cursor-pointer flex-col rounded-md border px-3 py-1.5 text-sm ${st.mode === m.id ? 'border-accent bg-surface-2' : 'border-line'}`}>
                <span className="flex items-center gap-1.5"><input type="radio" name="companion-mode" checked={st.mode === m.id} onChange={() => void run(() => companion.control({ mode: m.id }))} /> {m.label}</span>
                <span className="text-xs text-muted">{m.help}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <Button onClick={() => void run(() => companion.control({ stop: !st.stopped }))} disabled={busy}>
              {st.stopped ? <><Play size={15} aria-hidden /> Reprendre</> : <><Pause size={15} aria-hidden /> Arrêt d’urgence</>}
            </Button>
          </div>
        </fieldset>
      )}

      <Pending items={s.pending} onError={setError} />

      {s.recent.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Derniers événements</h3>
          <ul className="flex flex-col divide-y divide-line/60 text-sm">
            {s.recent.slice(0, 12).map((r) => (
              <li key={r.event.eventId + r.at} className="flex flex-wrap items-baseline gap-x-2 py-1">
                <span className="text-xs tabular-nums text-faint">{time(r.at)}</span>
                <span>{eventLabel(r.event)}</span>
                {r.event.characterKey && r.event.type !== 'character.seen' && <span className="text-xs text-muted">({r.event.characterKey})</span>}
                <span className="ml-auto text-xs text-muted">{r.outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

function Pending({ items, onError }: { items: CompanionEvent[]; onError: (m: string | null) => void }) {
  const ch = useCharacter();
  const [pick, setPick] = useState<Record<string, string>>({});
  if (!items.length) return <p className="text-sm text-muted">Rien à confirmer.</p>;
  const people = items.filter((e) => e.type === 'character.seen');
  const results = items.filter((e) => e.type !== 'character.seen');
  const linked = new Set(ch.characters.map((c) => c.gameName).filter(Boolean));
  const keys = [...new Set(results.map((e) => e.characterKey!))];
  const free = ch.characters.filter((c) => !c.gameName);
  return (
    <section className="flex flex-col gap-3" aria-label="À confirmer">
      {people.map((e) => (
        <div key={e.eventId} className="rounded-md border border-accent/60 bg-surface-2 p-3">
          <p className="text-sm"><strong>Nouveau personnage vu dans DOFUS : {e.characterKey}</strong>{e.className ? ` (${e.className})` : ''}</p>
          <p className="mt-0.5 text-xs text-muted">Rien n’est enregistré pour lui tant que vous ne choisissez pas son profil. Les noms proches ne sont jamais fusionnés.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => companion.createProfile(e.eventId)}><UserPlus size={15} aria-hidden /> Créer son profil</Button>
            {free.length > 0 && (
              <span className="flex items-center gap-1">
                <select aria-label={`Profil existant pour ${e.characterKey}`} value={pick[e.eventId] ?? ''} onChange={(x) => setPick({ ...pick, [e.eventId]: x.target.value })}
                  className="rounded-md border border-line bg-bg px-2 py-1.5 text-sm">
                  <option value="">Profil existant…</option>
                  {free.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button disabled={!pick[e.eventId]} onClick={() => { try { companion.link(e.eventId, pick[e.eventId]); } catch (err) { onError((err as Error).message); } }}>Associer</Button>
              </span>
            )}
            <Button variant="ghost" onClick={() => companion.reject(e.eventId)}>Ignorer</Button>
          </div>
        </div>
      ))}
      {keys.map((k) => {
        const list = results.filter((e) => e.characterKey === k);
        return (
          <div key={k} className="rounded-md border border-line p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{k} : {list.length} à confirmer</p>
              {linked.has(k)
                ? <Button className="ml-auto" onClick={() => companion.confirmAll(k)}><Check size={15} aria-hidden /> Tout confirmer</Button>
                : <span className="ml-auto text-xs text-muted">Choisissez d’abord le profil de ce personnage.</span>}
            </div>
            <ul className="flex flex-col gap-1">
              {list.map((e) => (
                <li key={e.eventId} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{eventLabel(e)}</span>
                  <span className={`rounded border px-1.5 text-[11px] ${e.certain ? 'border-done text-done' : 'border-line text-muted'}`}>{e.certain ? 'lu avec certitude' : 'lecture incertaine'}</span>
                  {e.evidence?.text && <span className="truncate text-xs text-faint" title="Texte lu à l’écran">« {e.evidence.text} »</span>}
                  <span className="ml-auto flex gap-1">
                    <Button className="px-2 py-1" disabled={!linked.has(k)} onClick={() => companion.confirm(e.eventId)} aria-label={`Confirmer : ${eventLabel(e)}`}><Check size={14} aria-hidden /></Button>
                    <Button className="px-2 py-1" variant="ghost" onClick={() => companion.reject(e.eventId)} aria-label={`Refuser : ${eventLabel(e)}`}><X size={14} aria-hidden /></Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
