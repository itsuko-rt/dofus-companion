'use client';
import { useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { ELEMENTS, type Element } from '../../src/spells.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import { Button, Card, PageHero, SECTION, SectionTitle, Term } from '../ui';
import { PLAYSTYLES, exportBackup, importBackup, useCharacter, type Playstyle } from '../useCharacter';
import Onboarding from './Onboarding';

const field = 'mt-1 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text';
const opt = (v: string) => (v === '' ? undefined : Number(v));

export default function CharacterProfile() {
  const ch = useCharacter();
  const [creating, setCreating] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!ch.ready) return null;

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackup()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `atlas-des-douze-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('Sauvegarde téléchargée.');
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Fichier trop volumineux pour une sauvegarde.');
      const { imported: n, replaced } = importBackup(await file.text());
      setBackupMsg(`${n} personnage${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}${replaced ? ` (dont ${replaced} remplacé${replaced > 1 ? 's' : ''} par la version du fichier)` : ''}.`);
    } catch (e) { setBackupMsg((e as Error).message); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const backup = (
    <Card>
      <SectionTitle hint="Fichier JSON">Sauvegarde</SectionTitle>
      <p className="mb-3 text-sm text-muted">Exportez tous vos personnages et leur progression pour les garder de côté ou les reprendre sur un autre appareil.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download} disabled={!ch.characters.length}><Download size={15} /> Exporter</Button>
        <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Importer</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
      </div>
      {backupMsg && <p role="status" className="mt-2 text-sm text-muted">{backupMsg}</p>}
    </Card>
  );

  if (creating || !ch.hasCharacter) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 font-display text-xl font-semibold">Nouveau personnage</h1>
        <Onboarding onDone={() => setCreating(false)} />
        {ch.hasCharacter && <Button variant="ghost" className="mt-3" onClick={() => setCreating(false)}>Annuler</Button>}
        {!ch.hasCharacter && <div className="mt-6">{backup}</div>}
      </div>
    );
  }

  const c = ch.character;
  const p = c.profile;
  const info = SUPPORTED_BREEDS.find((b) => b.id === p.breed);
  return (
    <>
    <PageHero color={info?.hue ?? SECTION.characters} image={info?.art.scene} kicker={info ? `${info.name} · ${info.title}` : 'Personnage'} title={c.name}>
      <p className="text-sm text-white/80">Niveau {c.level} · {c.done.filter((d) => d.startsWith('quest:')).length} quêtes · {c.done.filter((d) => d.startsWith('ach:')).length} succès</p>
    </PageHero>
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:grid-cols-[240px_1fr]">
      <aside>
        <SectionTitle>Mes personnages</SectionTitle>
        <ul className="flex flex-col gap-1">
          {ch.characters.map((x) => (
            <li key={x.id}>
              <button onClick={() => ch.select(x.id)} aria-current={x.id === c.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${x.id === c.id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-faint'}`}>
                <span className="block font-medium">{x.name}</span>
                <span className="text-xs text-muted">{SUPPORTED_BREEDS.find((b) => b.id === x.profile.breed)?.name ?? '—'} · niv. {x.level} · {x.done.length} terminées</span>
              </button>
            </li>
          ))}
        </ul>
        <Button className="mt-2 w-full" onClick={() => setCreating(true)}><Plus size={15} /> Nouveau personnage</Button>
      </aside>

      <div className="flex flex-col gap-5">
        <Card>
          <SectionTitle>Profil</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-muted">Nom
              <input className={field} value={c.name} maxLength={40} onChange={(e) => ch.setInfo({ name: e.target.value })} />
            </label>
            <label className="text-sm text-muted">Classe
              <select className={field} value={p.breed ?? ''} onChange={(e) => ch.setProfile({ breed: opt(e.target.value) })}>
                <option value="">Non choisie</option>
                {SUPPORTED_BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="text-sm text-muted">Niveau
              <input type="number" min={1} max={200} className={field} value={c.level} onChange={(e) => ch.setLevel(Number(e.target.value))} />
            </label>
            <label className="text-sm text-muted">Élément
              <select className={field} value={c.element ?? ''} onChange={(e) => ch.setInfo({ element: (e.target.value || undefined) as Element | undefined })}>
                <option value="">Pas encore choisi</option>
                {ELEMENTS.filter((el) => el !== 'Neutre').map((el) => <option key={el}>{el}</option>)}
              </select>
            </label>
            <label className="text-sm text-muted">Style de jeu
              <select className={field} value={c.playstyle ?? ''} onChange={(e) => ch.setInfo({ playstyle: (e.target.value || undefined) as Playstyle | undefined })}>
                <option value="">Pas encore choisi</option>
                {PLAYSTYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <SectionTitle hint="Facultatif">Pour des conditions de quêtes plus précises</SectionTitle>
          <p className="mb-3 text-sm text-muted">
            Certaines quêtes demandent un <Term def="Le camp choisi en jeu : Bonta, Brâkmar, ou neutre. Il ouvre des quêtes propres à chaque camp.">alignement</Term> ou un abonnement.
            Sans ces informations, elles restent « à vérifier en jeu ».
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-muted">Alignement
              <select className={field} value={p.alignmentSide ?? ''} onChange={(e) => ch.setProfile({ alignmentSide: opt(e.target.value) })}>
                <option value="">Non renseigné</option><option value="0">Neutre</option><option value="1">Bonta</option><option value="2">Brâkmar</option>
              </select>
            </label>
            <label className="text-sm text-muted">Niveau d’alignement
              <input type="number" min={0} max={100} className={field} value={p.alignmentLevel ?? ''} onChange={(e) => ch.setProfile({ alignmentLevel: opt(e.target.value) })} />
            </label>
            <label className="text-sm text-muted">Abonné
              <select className={field} value={p.subscribed === undefined ? '' : String(p.subscribed)}
                onChange={(e) => ch.setProfile({ subscribed: e.target.value === '' ? undefined : e.target.value === 'true' })}>
                <option value="">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option>
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <SectionTitle hint={`${c.done.filter((d) => d.startsWith('quest:')).length} quêtes · ${c.done.filter((d) => d.startsWith('ach:')).length} succès`}>Progression et équipement</SectionTitle>
          {c.builds.length === 0 ? (
            <p className="text-sm text-muted">Aucun build enregistré. <a className="text-accent underline" href="/builds">Parcourir les builds de la communauté</a></p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {c.builds.map((b) => (
                <li key={b.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 ${c.currentBuild === b.id ? 'border-accent' : 'border-line'}`}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{b.name} <span className="text-xs text-muted">niv. {b.level}</span></a>
                  <span className="flex shrink-0 items-center gap-2">
                    {c.currentBuild === b.id ? <span className="text-xs text-accent">Build actuel</span>
                      : <button className="text-xs text-muted hover:text-text" onClick={() => ch.wearBuild(b.id)}>Porter</button>}
                    <button className="text-xs text-muted hover:text-red-200" onClick={() => ch.removeBuild(b.id)}>Retirer</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-4 block text-sm text-muted">Notes personnelles
            <textarea className={`${field} min-h-24`} maxLength={4000} value={c.notes} placeholder="Objectifs, idées de stuff, rappels…"
              onChange={(e) => ch.setInfo({ notes: e.target.value })} />
          </label>
        </Card>

        {backup}

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { if (confirm(`Effacer la progression de ${c.name} (${c.done.length} terminées) ?`)) ch.reset(); }}>
            Réinitialiser la progression
          </Button>
          <Button variant="ghost" className="text-red-300 hover:text-red-200"
            onClick={() => { if (confirm(`Supprimer ${c.name} et toute sa progression ? Cette action est définitive.`)) ch.remove(c.id); }}>
            <Trash2 size={15} /> Supprimer ce personnage
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
