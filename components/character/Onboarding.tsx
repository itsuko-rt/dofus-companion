'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Element } from '../../src/spells.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import { Button, ELEMENT_CLASS } from '../ui';
import { PLAYSTYLES, useCharacter, type Playstyle } from '../useCharacter';

const ELEMENT_HELP: Record<Exclude<Element, 'Neutre'>, string> = {
  Feu: 'Intelligence', Eau: 'Chance', Terre: 'Force', Air: 'Agilité',
};

/** 4 short steps: class → level → playstyle → element. Creates and selects the character. */
export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const ch = useCharacter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [playstyle, setPlaystyle] = useState<Playstyle | null>(null);
  const [element, setElement] = useState<Element | null>(null);

  const steps = ['Classe', 'Niveau', 'Style de jeu', 'Élément'];
  const canNext = [breed !== null, level >= 1 && level <= 200, playstyle !== null, true][step];
  const finish = () => {
    ch.create({
      name: name.trim() || SUPPORTED_BREEDS.find((b) => b.id === breed)?.name || 'Mon personnage',
      level, playstyle: playstyle ?? undefined, element: element ?? undefined, profile: { breed: breed ?? undefined },
    });
    onDone?.();
  };
  const choice = (active: boolean) =>
    `rounded-xl border p-4 text-left transition ${active ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-faint'}`;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <ol className="mb-5 flex gap-2" aria-label="Étapes">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-2'}`} />
            <span className={`mt-1 block text-[11px] ${i === step ? 'text-text' : 'text-faint'}`}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset>
          <legend className="font-display text-lg font-semibold">Quelle est votre classe ?</legend>
          <p className="mb-4 text-sm text-muted">La classe définit vos sorts. D’autres classes arriveront ensuite.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORTED_BREEDS.map((b) => (
              <button key={b.id} type="button" aria-pressed={breed === b.id} onClick={() => setBreed(b.id)} className={choice(breed === b.id)}>
                <span className="font-display text-base font-semibold">{b.name}</span>
                <span className="mt-1 block text-sm text-muted">{b.blurb}</span>
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm text-muted">
            Nom du personnage <span className="text-faint">(facultatif)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="ex. Arkhane"
              className="mt-1 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-text placeholder:text-faint sm:w-72" />
          </label>
        </fieldset>
      )}

      {step === 1 && (
        <div>
          <h2 className="font-display text-lg font-semibold">Quel est votre niveau ?</h2>
          <p className="mb-4 text-sm text-muted">Il sert à vous proposer les quêtes et l’équipement adaptés. Vous débutez ? Laissez 1.</p>
          <div className="flex items-center gap-4">
            <input type="range" min={1} max={200} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="flex-1 accent-[var(--color-accent)]" aria-label="Niveau" />
            <input type="number" min={1} max={200} value={level} onChange={(e) => setLevel(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-line bg-bg px-3 py-2 text-center text-lg font-semibold" aria-label="Niveau (nombre)" />
          </div>
        </div>
      )}

      {step === 2 && (
        <fieldset>
          <legend className="font-display text-lg font-semibold">Comment aimez-vous jouer ?</legend>
          <p className="mb-4 text-sm text-muted">Cela change l’équipement conseillé. Vous pourrez le modifier plus tard.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLAYSTYLES.map((s) => (
              <button key={s.id} type="button" aria-pressed={playstyle === s.id} onClick={() => setPlaystyle(s.id)} className={choice(playstyle === s.id)}>
                <span className="font-semibold">{s.label}</span>
                <span className="mt-1 block text-sm text-muted">{s.help}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend className="font-display text-lg font-semibold">Quel élément voulez-vous jouer ?</legend>
          <p className="mb-4 text-sm text-muted">L’élément de vos dégâts dépend d’une caractéristique (Feu = Intelligence…). Pas encore d’idée ? Aucun souci.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(ELEMENT_HELP) as (keyof typeof ELEMENT_HELP)[]).map((el) => (
              <button key={el} type="button" aria-pressed={element === el} onClick={() => setElement(el)}
                className={`rounded-xl border p-3 text-left ${element === el ? ELEMENT_CLASS[el] : 'border-line bg-surface hover:border-faint'}`}>
                <span className="font-semibold">{el}</span>
                <span className="block text-xs text-muted">{ELEMENT_HELP[el]}</span>
              </button>
            ))}
            <button type="button" aria-pressed={element === null} onClick={() => setElement(null)} className={choice(element === null)}>
              <span className="font-semibold">Je ne sais pas encore</span>
            </button>
          </div>
        </fieldset>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={15} /> Retour</Button>
        {step < steps.length - 1
          ? <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext}>Continuer <ArrowRight size={15} /></Button>
          : <Button variant="primary" onClick={finish}><Check size={15} /> Créer mon personnage</Button>}
      </div>
    </div>
  );
}
