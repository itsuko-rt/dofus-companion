// One generic icon per profession (lucide), so the journal reads at a glance without official artwork.
import { Axe, Beef, FlaskConical, Fish, Footprints, Gem, Hammer, Package, PawPrint, Pickaxe, Scissors, Shovel, Sparkles, Wheat, Wrench } from 'lucide-react';

const BY_NAME: Record<string, typeof Axe> = {
  'Bûcheron': Axe, 'Mineur': Pickaxe, 'Paysan': Wheat, 'Pêcheur': Fish, 'Alchimiste': FlaskConical,
  'Bijoutier': Gem, 'Cordonnier': Footprints, 'Tailleur': Scissors, 'Forgeron': Hammer, 'Sculpteur': Shovel,
  'Façonneur': Package, 'Bricoleur': Wrench, 'Chasseur': Beef, 'Éleveur': PawPrint,
};
export const jobIcon = (name: string) => BY_NAME[name] ?? (/mage$/.test(name) ? Sparkles : Package);

export const KIND_LABEL: Record<string, string> = {
  gathering: 'Récolte', crafting: 'Artisanat', forgemagus: 'Forgemagie', other: 'Autres',
};

/** Local copy of an item icon (scripts/fetch-assets.ts); hides itself when it was not downloaded. */
export function ItemIcon({ iconId, size = 28 }: { iconId: number | null; size?: number }) {
  if (iconId == null) return <span style={{ width: size, height: size }} className="inline-block shrink-0" aria-hidden />;
  return (
    <img src={`/ankama/items/${iconId}.png`} alt="" width={size} height={size} loading="lazy" className="shrink-0"
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
  );
}
