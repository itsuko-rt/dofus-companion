'use client';
// "Scanner ma progression": the player shows a Dofus window (screenshot, paste or browser window capture),
// the text is read locally, matched to game names, and nothing is saved before the player confirms.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, ImagePlus, Loader2, MonitorUp, RotateCcw, ScanLine, ShieldCheck, Square, X, Zap } from 'lucide-react';
import { buildCatalog, isCertain, isLikely, matchLines, type Match } from '../../src/recognize.ts';
import { prerequisitesToComplete } from '../../src/views.ts';
import { CHANGE_SOURCES } from '../../src/character.ts';
import { useGame } from '../quests/useGame';
import { Button, Card, PageHero, SECTION, SectionTitle } from '../ui';
import { readLines, startShare, type ShareSession } from './ocr';

const MAX_PIXELS = 40e6;
const MAX_BYTES = 25 * 1024 * 1024;
/** Decodes a picked or pasted file in the browser; nothing is uploaded. */
const decode = (f: File) => (f.size > MAX_BYTES
  ? Promise.reject(new Error('Fichier trop lourd : 25 Mo au plus.'))
  : createImageBitmap(f));

type Mode = 'quests_done' | 'quests_active' | 'achievements';
const MODES: { id: Mode; label: string; help: string }[] = [
  { id: 'quests_done', label: 'Quêtes terminées', help: 'Fenêtre des quêtes, liste des quêtes terminées.' },
  { id: 'quests_active', label: 'Quêtes en cours', help: 'Fenêtre des quêtes, liste des quêtes en cours.' },
  { id: 'achievements', label: 'Succès obtenus', help: 'Fenêtre des succès, en n’affichant que les succès obtenus.' },
];
const AUTO_READ_MS = 1500;        // automatic reading while sharing: at most one read per 1.5 s, only when the view changed
const AUTO_READ_LIMIT = 10 * 60e3; // and it stops by itself after 10 minutes
const AUTO_SAVE_KEY = 'atlas:scan:autosave';

interface Shot { id: number; name: string; status: 'reading' | 'done' | 'error'; lines: number; error?: string; text?: string[] }

export default function ScanView() {
  const { graph, ch } = useGame();
  const [mode, setMode] = useState<Mode>('quests_done');
  const [shots, setShots] = useState<Shot[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [deduced, setDeduced] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // names read with certainty are saved at once (undo in the history); the switch is remembered in this browser
  const [autoSave, setAutoSave] = useState(true);
  useEffect(() => { try { setAutoSave(localStorage.getItem(AUTO_SAVE_KEY) !== '0'); } catch { /* storage blocked */ } }, []);
  const [autoSaved, setAutoSaved] = useState<string[]>([]);
  const [share, setShare] = useState<ShareSession | null>(null);
  const [autoRead, setAutoRead] = useState(false);
  const [reads, setReads] = useState(0);
  const [shareError, setShareError] = useState<string | null>(null);
  const busy = useRef(false);
  const autoSince = useRef(0); // when automatic reading was switched on (the 10-minute limit)
  const preview = useRef<HTMLDivElement>(null);

  const catalog = useMemo(() => graph ? buildCatalog([...graph.nodes.values()]
    .filter((n) => (mode === 'achievements' ? n.kind === 'achievement' : n.kind === 'quest'))
    .map((n) => ({ id: n.id, name: n.label }))) : null, [graph, mode]);

  // development only: lets the OCR benchmark drive the real pipeline (docs/RAPPORT_SUCCES_SCAN.md)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && catalog) (window as unknown as Record<string, unknown>).__scan = { readLines, matchLines, catalog };
  }, [catalog]);

  const reset = () => { setShots([]); setMatches([]); setPicked(new Set()); setDeduced(new Set()); setSaved(null); setAutoSaved([]); setReads(0); };
  useEffect(reset, [mode]);

  /** Reads one image; `quiet`: a frame of the shared window in automatic mode (counted, not listed one by one). */
  async function add(image: Promise<ImageBitmap>, name: string, quiet = false) {
    if (!catalog) return;
    const id = Date.now() + Math.random();
    busy.current = true;
    if (!quiet) setShots((s) => [...s, { id, name, status: 'reading', lines: 0 }]);
    setSaved(null);
    try {
      const img = await image.catch(() => { throw new Error('Image illisible : utilisez une capture PNG, JPEG ou WebP.'); });
      // a giant image would allocate gigabytes of canvas and freeze the tab
      if (img.width * img.height > MAX_PIXELS) throw new Error('Image trop grande : 40 mégapixels au plus.');
      const lines = await readLines(img, (p) => setProgress(p));
      const found = matchLines(lines, catalog);
      if (quiet) setReads((n) => n + 1);
      else setShots((s) => s.map((x) => (x.id === id ? { ...x, status: 'done', lines: lines.length, text: [...new Set(lines.map((l) => l.text))] } : x)));
      const fresh = found.filter((m) => !isRecorded(m.id));
      const sure = autoSave ? fresh.filter(isCertain) : [];
      if (sure.length) {
        const ids = sure.map((m) => m.id);
        const what = MODES.find((m) => m.id === mode)!.label.toLowerCase();
        if (mode === 'quests_active') for (const x of ids) ch.setMark(x, 'active', 'scan');
        else ch.markDone(ids, 'scan', `Capture d’écran : ${ids.length} ${what} enregistré(e)s automatiquement`);
        setAutoSaved((prev) => [...prev, ...sure.map((m) => m.name)]);
      }
      setMatches((prev) => {
        const all = new Map(prev.map((m) => [m.id, m]));
        for (const m of found) if (!all.has(m.id) || all.get(m.id)!.confidence < m.confidence) all.set(m.id, m);
        return [...all.values()].sort((a, b) => b.confidence - a.confidence);
      });
      setPicked((prev) => {
        const next = new Set(prev);
        for (const m of fresh) if (isLikely(m) && !sure.includes(m)) next.add(m.id);
        return next;
      });
    } catch (e) {
      if (!quiet) setShots((s) => s.map((x) => (x.id === id ? { ...x, status: 'error', error: (e as Error).message } : x)));
    } finally { setProgress(null); busy.current = false; }
  }

  async function beginShare() {
    setShareError(null);
    try {
      const sess = await startShare();
      sess.onEnded(() => { setShare(null); setAutoRead(false); });
      setShare(sess);
    } catch (e) {
      setShareError((e as Error).name === 'NotAllowedError' ? 'Partage annulé.' : 'Le navigateur n’a pas pu partager la fenêtre.');
    }
  }
  const endShare = () => { share?.stop(); setShare(null); setAutoRead(false); };
  // show what is shared, small, so the player sees which window is read
  useEffect(() => {
    const box = preview.current;
    if (!share || !box) return;
    share.video.className = 'h-full w-full object-contain';
    box.replaceChildren(share.video);
    return () => { box.replaceChildren(); };
  }, [share]);
  useEffect(() => () => share?.stop(), [share]);
  // automatic reading: the player scrolls the list in game, a new view is read when it appears
  useEffect(() => {
    if (!share || !autoRead) return;
    const t = setInterval(() => {
      if (Date.now() - autoSince.current > AUTO_READ_LIMIT) { setAutoRead(false); return; }
      if (busy.current || !share.changed()) return;
      void add(share.grab(), 'Fenêtre partagée', true);
    }, AUTO_READ_MS);
    return () => clearInterval(t);
  });

  // Ctrl+V of a screenshot (Win+Maj+S puts one in the clipboard)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); void add(decode(f), 'Image collée'); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const isRecorded = (id: string) => (mode === 'quests_active' ? ch.progress.active.has(id) || ch.progress.done.has(id) : ch.progress.done.has(id));
  // prerequisites that must be done if the recognised quests are: deduced, never pre-ticked
  const inferred = useMemo(() => {
    if (!graph || mode === 'achievements') return [];
    const out = new Set<string>();
    for (const id of picked) for (const p of prerequisitesToComplete(graph, id, ch.progress.done)) if (!picked.has(p)) out.add(p);
    return [...out];
  }, [graph, picked, mode, ch.progress.done]);

  if (!graph || !catalog) return <p className="p-8 text-sm text-muted">Chargement des données du jeu…</p>;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };
  const confirm = () => {
    const ids = [...picked];
    const extra = inferred.filter((id) => deduced.has(id));
    const what = MODES.find((m) => m.id === mode)!.label.toLowerCase();
    if (mode === 'quests_active') for (const id of ids) ch.setMark(id, 'active', 'scan');
    else if (ids.length) ch.markDone(ids, 'scan', `Capture d’écran : ${ids.length} ${what} confirmé(e)s`);
    if (extra.length) ch.markDone(extra, 'prerequisites', `${extra.length} prérequis déduits de la capture, confirmés`);
    setSaved(`${ids.length + extra.length} élément(s) enregistré(s) pour ${ch.character.name}.`);
    setMatches([]); setPicked(new Set()); setDeduced(new Set()); setShots([]);
  };
  const history = [...ch.character.history].map((h, i) => ({ h, i })).reverse().slice(0, 8);

  return (
    <div className="h-full overflow-y-auto">
      <PageHero color={SECTION.scan} kicker="Synchronisation du personnage" title="Scanner ma progression">
        <p className="max-w-2xl text-sm text-white/80">
          Ouvrez une fenêtre de Dofus, montrez-la ici : les noms lus sont comparés aux données du jeu, et vous validez ce qui doit être enregistré pour <b className="text-white">{ch.character.name}</b>.
        </p>
      </PageHero>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
        <div>
          <p className="flex items-start gap-1.5 rounded-lg border border-done/40 bg-done/10 px-3 py-2 text-xs text-muted"><ShieldCheck size={14} className="mt-px shrink-0 text-done" />
            L’image est lue dans votre navigateur et n’est envoyée nulle part. Le site ne touche jamais au jeu : il ne clique pas, ne lit pas sa mémoire ni ses échanges réseau, et ne demande pas vos identifiants Ankama.
          </p>
        </div>

        <Card>
          <SectionTitle>1. Que montre votre capture ?</SectionTitle>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Contenu de la capture">
            {MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === m.id ? 'border-brand bg-brand/15' : 'border-line hover:border-faint'}`}>
                <span className="block font-medium">{m.label}</span><span className="text-xs text-muted">{m.help}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">La capture ne dit pas elle-même si un élément est terminé : c’est la liste que vous montrez qui le dit. Faites défiler et capturez plusieurs fois si la liste est longue : les doublons ne comptent qu’une fois.</p>
        </Card>

        <Card>
          <SectionTitle>2. Ajoutez une ou plusieurs captures</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {!share ? (
              <Button onClick={() => void beginShare()} disabled={typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia}>
                <MonitorUp size={15} /> Partager la fenêtre Dofus
              </Button>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm hover:border-faint">
              <ImagePlus size={15} /> Choisir des images
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { for (const f of e.target.files ?? []) void add(decode(f), f.name); e.target.value = ''; }} />
            </label>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted"><ClipboardPaste size={15} /> ou collez une capture (Ctrl+V, après Win+Maj+S)</span>
          </div>
          {shareError && <p className="mt-2 text-xs text-check" role="alert">{shareError}</p>}
          {share && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-brand/50 bg-brand/10 p-3 sm:flex-row">
              <div ref={preview} className="aspect-video w-full shrink-0 overflow-hidden rounded-md bg-black sm:w-56" aria-label="Fenêtre partagée" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                <p className="font-medium">Fenêtre partagée</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void add(share.grab(), 'Fenêtre partagée')}><ScanLine size={15} /> Lire maintenant</Button>
                  <Button variant={autoRead ? 'primary' : 'secondary'} aria-pressed={autoRead} onClick={() => { autoSince.current = Date.now(); setAutoRead(!autoRead); }}>
                    <Zap size={15} /> {autoRead ? 'Lecture automatique en cours' : 'Lire en faisant défiler'}
                  </Button>
                  <Button variant="ghost" onClick={endShare}><Square size={14} /> Arrêter le partage</Button>
                </div>
                <p className="text-xs text-muted">
                  {autoRead ? `Faites défiler la liste dans le jeu : chaque nouvelle vue est lue (${reads} lue${reads > 1 ? 's' : ''}). S’arrête seul au bout de 10 minutes.`
                    : 'Ouvrez la liste dans le jeu, puis « Lire maintenant », ou la lecture automatique pour lire en faisant défiler.'}
                </p>
              </div>
            </div>
          )}
          {shots.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {shots.map((s) => (
                <li key={s.id}>
                  <span className="flex items-center gap-2">
                    {s.status === 'reading' ? <Loader2 size={14} className="animate-spin text-info" /> : s.status === 'done' ? <Check size={14} className="text-done" /> : <X size={14} className="text-red-300" />}
                    <span className="truncate">{s.name}</span>
                    <span className="text-xs text-muted">{s.status === 'reading' ? (progress != null ? `lecture ${Math.round(progress * 100)} %` : 'lecture…') : s.status === 'done' ? `${s.text?.length ?? s.lines} lignes lues` : s.error}</span>
                  </span>
                  {/* what the OCR actually read: to understand a capture where names were missed */}
                  {s.text && s.text.length > 0 && (
                    <details className="ml-6 mt-0.5 text-xs text-muted">
                      <summary className="cursor-pointer text-faint hover:text-text">Voir le texte lu</summary>
                      <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line rounded bg-surface-2 p-2 font-mono text-[11px]">{s.text.join(String.fromCharCode(10))}</p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" checked={autoSave} className="mt-0.5 accent-[var(--color-brand)]"
            onChange={(e) => { setAutoSave(e.target.checked); try { localStorage.setItem(AUTO_SAVE_KEY, e.target.checked ? '1' : '0'); } catch { /* storage blocked */ } }} />
          <span>Enregistrer tout de suite les noms lus avec certitude
            <span className="block text-xs text-muted">Nom complet lu exactement, porté par un seul élément du jeu. Le reste attend votre confirmation ci-dessous. Tout est annulable dans l’historique.</span>
          </span>
        </label>
        {autoSaved.length > 0 && (
          <div role="status" className="rounded-lg border border-done/50 bg-done/10 px-3 py-2 text-sm">
            <p className="flex flex-wrap items-center gap-2"><Check size={15} className="text-done" /> <b>{autoSaved.length}</b> enregistré(e)s automatiquement pour {ch.character.name}
              {history[0] && <button className="inline-flex items-center gap-1 text-xs text-brand hover:underline" onClick={() => { ch.revertEntry(history[0].i); setAutoSaved([]); }}><RotateCcw size={12} /> Annuler le dernier enregistrement</button>}
            </p>
            <p className="mt-1 text-xs text-muted">{autoSaved.slice(-12).join(' · ')}{autoSaved.length > 12 ? ' …' : ''}</p>
          </div>
        )}
        {(matches.length > 0 || shots.some((s) => s.status === 'done') || reads > 0) && (
          <Card>
            <SectionTitle hint={`${picked.size} sélectionné(s)`}>3. Vérifiez avant d’enregistrer</SectionTitle>
            {matches.length === 0 ? <p className="text-sm text-muted">Aucun nom reconnu. Essayez une capture plus nette, ou zoomée sur la liste.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-faint"><th className="w-8 py-1" /><th>Reconnu</th><th className="hidden sm:table-cell">Texte lu</th><th className="w-20 text-right">Nom lu</th></tr></thead>
                <tbody>
                  {matches.map((m) => {
                    const recorded = isRecorded(m.id);
                    return (
                      <tr key={m.id} className="border-t border-line">
                        <td className="py-1.5"><input type="checkbox" aria-label={m.name} disabled={recorded} checked={picked.has(m.id)} onChange={() => toggle(picked, setPicked, m.id)} className="accent-[var(--color-brand)]" /></td>
                        <td className="py-1.5">
                          {m.name}
                          {recorded && <span className="ml-2 text-xs text-done">déjà enregistré</span>}
                          {m.ambiguous && <span className="ml-2 text-xs text-check" title="Plusieurs éléments portent ce nom">nom partagé</span>}
                        </td>
                        <td className="hidden py-1.5 text-xs text-muted sm:table-cell">« {m.read} »</td>
                        <td className={`py-1.5 text-right tabular-nums ${isLikely(m) ? 'text-done' : m.similarity >= 0.85 ? 'text-accent' : 'text-check'}`} title={`Nom : ${Math.round(m.similarity * 100)} % · lecture : ${Math.round(m.ocr * 100)} %`}>{Math.round(m.similarity * 100)} %</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {inferred.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-line p-3">
                <p className="text-sm font-medium">Déduites, non lues sur l’écran ({inferred.length})</p>
                <p className="mb-2 text-xs text-muted">Ces quêtes sont des prérequis obligatoires des quêtes reconnues : elles sont sans doute terminées. Cochez celles à enregistrer.</p>
                <div className="flex flex-wrap gap-1.5">
                  {inferred.slice(0, 60).map((id) => (
                    <label key={id} className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs ${deduced.has(id) ? 'border-brand text-text' : 'border-line text-muted'}`}>
                      <input type="checkbox" checked={deduced.has(id)} onChange={() => toggle(deduced, setDeduced, id)} className="accent-[var(--color-brand)]" />
                      {graph.nodes.get(id)?.label}
                    </label>
                  ))}
                </div>
                <button className="mt-2 text-xs text-brand hover:underline" onClick={() => setDeduced(new Set(inferred))}>Tout cocher</button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={confirm} disabled={!picked.size && !deduced.size}><Check size={15} /> Enregistrer la sélection</Button>
              <Button variant="ghost" onClick={reset}>Tout rejeter</Button>
              <span className="text-xs text-faint">Pré-cochés : noms lus à 92 % ou plus, sans ambiguïté.</span>
            </div>
          </Card>
        )}
        {saved && <p role="status" className="rounded-lg border border-done/50 bg-done/10 px-3 py-2 text-sm">{saved}</p>}

        <Card>
          <SectionTitle hint="Les 8 dernières">Historique des modifications</SectionTitle>
          {history.length === 0 ? <p className="text-sm text-muted">Aucune modification enregistrée pour ce personnage.</p> : (
            <ul className="flex flex-col gap-1 text-sm">
              {history.map(({ h, i }) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md px-1.5 py-1 hover:bg-surface-2">
                  <span className="text-xs text-faint">{new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="min-w-0 flex-1 truncate">{h.label || `${h.added.length} ajout(s), ${h.removed.length} retrait(s)`}</span>
                  <span className="text-xs text-muted">{CHANGE_SOURCES[h.source]}</span>
                  <button className="inline-flex items-center gap-1 text-xs text-brand hover:underline" onClick={() => ch.revertEntry(i)}><RotateCcw size={12} /> Annuler</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
