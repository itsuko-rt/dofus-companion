'use client';
// Class card: official portrait (local copy) on its class colour, roles as diamonds.
import { SUPPORTED_BREEDS } from '../breeds';
import { Diamond } from '../ui';

type Breed = (typeof SUPPORTED_BREEDS)[number];

export default function ClassCard({ breed, selected, compact }: { breed: Breed; selected?: boolean; compact?: boolean }) {
  return (
    <span className={`group relative flex overflow-hidden rounded-xl border-2 text-left transition duration-200 hover:-translate-y-0.5 ${selected ? 'border-[#ffe2a6] shadow-[0_0_0_3px_rgba(255,226,166,0.25)]' : 'border-black/40 hover:border-[#ffe2a6]/60'}`}
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${breed.hue} 55%, #1e1914), #1e1914 70%)` }}>
      <img src={breed.art.portrait} alt="" className={`${compact ? 'h-24 w-24' : 'h-36 w-32 sm:w-36'} shrink-0 object-cover object-top transition duration-300 group-hover:scale-105`}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
        <span className="title-hero text-xl text-white">{breed.name}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-[#ffe2a6]">{breed.title}</span>
        {!compact && <span className="text-xs text-white/75">{breed.blurb}</span>}
        <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-white/80">
          {breed.roles.map((r) => (
            <span key={r} className="inline-flex items-center gap-1"><Diamond color={breed.hue} size={9} />{r}</span>
          ))}
        </span>
      </span>
    </span>
  );
}
