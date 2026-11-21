'use client';
// Odds of getting a drop over N fights, from a rate per fight: exact probability, nothing estimated.
import { useState } from 'react';
import { Dices } from 'lucide-react';
import { dropOdds } from '../../src/encyclopedia-shared.ts';

const pct = (x: number) => `${(x * 100).toLocaleString('fr-FR', { maximumFractionDigits: x < 0.01 ? 2 : 1 })} %`;

export default function DropOdds({ rate: initial, label }: { rate: number; label?: string }) {
  const [rate, setRate] = useState(String(initial));
  const [fights, setFights] = useState('100');
  const r = Number(rate.replace(',', '.'));
  const n = Number(fights);
  const valid = Number.isFinite(r) && r >= 0 && r <= 100 && Number.isInteger(n) && n >= 0 && n <= 100000;
  const o = valid ? dropOdds(r, n) : null;
  return (
    <section className="rounded-xl border border-line/80 bg-surface/60 p-4 text-sm">
      <h2 className="flex items-center gap-2 font-display text-base"><Dices size={16} className="text-accent" aria-hidden /> Chances d’obtenir l’objet</h2>
      {label && <p className="mt-0.5 text-xs text-muted">{label}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Taux par combat (%)
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-invalid={!valid}
            className="mt-1 w-full rounded-md border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent" />
        </label>
        <label className="text-xs text-muted">Combats
          <input inputMode="numeric" value={fights} onChange={(e) => setFights(e.target.value)} aria-invalid={!valid}
            className="mt-1 w-full rounded-md border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent" />
        </label>
      </div>
      {!o ? <p className="mt-3 text-xs text-check" role="alert">Un taux entre 0 et 100, et un nombre entier de combats (100 000 au plus).</p> : (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2" aria-live="polite">
          <div><dt className="text-[11px] uppercase tracking-wider text-faint">Au moins un</dt><dd className="font-display text-lg text-accent">{pct(o.atLeastOne)}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider text-faint">En moyenne</dt><dd className="font-display text-lg">{o.expected.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</dd></div>
          <div className="col-span-2 text-xs text-muted">
            {o.for50 == null ? 'Taux nul : aucune chance.' : <>1 chance sur 2 vers <b className="text-text">{o.for50}</b> combats · 9 sur 10 vers <b className="text-text">{o.for90}</b> · 99 sur 100 vers <b className="text-text">{o.for99}</b>.</>}
          </div>
        </dl>
      )}
      <p className="mt-3 text-[11px] leading-snug text-faint">Calcul exact pour des combats indépendants, un monstre, un personnage. Entrez votre taux réel si vous le connaissez : la prospection et les bonus ne sont pas appliqués ici.</p>
    </section>
  );
}
