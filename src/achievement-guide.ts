// Achievement journal guidance, shared by the page and its tests (no server code).
// - Families: the game's 15 root categories, grouped so a new player sees the main progression first.
//   Grouping is presentation only: every category and achievement of the game stays reachable.
// - Recommendations: computed from the character's real progress (objectives met, class quests, level), each with
//   the reason it is shown. Nothing is hidden because it is not class-specific.
import type { AchievementState } from './achievements.ts';

export type Family = 'main' | 'activities' | 'seasonal' | 'other';
export const FAMILIES: { id: Family; label: string }[] = [
  { id: 'main', label: 'Progression principale' },
  { id: 'activities', label: 'Activités' },
  { id: 'seasonal', label: 'Événements et serveurs à part' },
  { id: 'other', label: 'Autres' },
];
// game root category names (achievementcategoriesdata, 3.7.14.18) → family; an unknown future category lands in "other"
const FAMILY_OF: Record<string, Family> = {
  'Quêtes': 'main', 'Donjons': 'main', 'Exploration': 'main', 'Monstres': 'main', 'Général': 'main', 'Métiers': 'main',
  'Élevage': 'activities', 'Compagnons': 'activities', 'Guilde': 'activities', 'Kolizéum': 'activities',
  'Songes Infinis': 'activities', 'Anomalies Temporelles': 'activities', "La Source : L'Héritage des Dofus": 'activities',
  'Événements': 'seasonal', 'Temporis': 'seasonal',
};
export const familyOf = (rootName: string): Family => FAMILY_OF[rootName] ?? 'other';
/** Order inside the main family: what a new player meets first. */
const MAIN_ORDER = ['Quêtes', 'Exploration', 'Monstres', 'Donjons', 'Métiers', 'Général'];
export const rootOrder = (name: string) => { const i = MAIN_ORDER.indexOf(name); return i < 0 ? 99 : i; };

/** One-line explanations for newcomers, written from what the game's sub-categories contain (no invented mechanics). */
export const ROOT_HINT: Record<string, string> = {
  'Quêtes': 'Terminer des séries de quêtes, rangées par région ou par type.',
  'Exploration': 'Découvrir les zones du monde, région par région.',
  'Monstres': 'Vaincre des monstres précis, rangés par région.',
  'Donjons': 'Vaincre les donjons, rangés par tranche de niveaux.',
  'Métiers': 'Liés aux métiers de récolte et de fabrication.',
  'Général': 'Progression générale du personnage.',
  'Élevage': 'Élever des montures : Dragodindes, Muldos et Volkornes.',
  'Compagnons': 'Liés aux compagnons de combat.',
  'Guilde': 'À accomplir en guilde : missions et raids.',
  'Événements': 'Liés aux événements saisonniers : Nowel, Halouine, Pwâk, Vulkania.',
  'Temporis': 'Propres aux serveurs Temporis, saisonniers. Sur un serveur classique, vous pouvez les ignorer.',
};

/** What the card shows: the tracked state, plus "later" for an untouched achievement well above the character's level. */
export type DisplayState = 'obtained' | 'ready' | 'in_progress' | 'todo' | 'later';
export const LATER_MARGIN = 10;
export function displayState(state: AchievementState, level: number, charLevel: number, hasCharacter: boolean): DisplayState {
  if (state === 'not_started') return hasCharacter && level > charLevel + LATER_MARGIN ? 'later' : 'todo';
  return state;
}
export const DISPLAY: Record<DisplayState, { label: string; help: string }> = {
  obtained: { label: 'Obtenu', help: 'Vous l’avez marqué obtenu.' },
  ready: { label: 'À confirmer', help: 'Tous les objectifs sont remplis : confirmez-le.' },
  in_progress: { label: 'En cours', help: 'Une partie des objectifs est remplie.' },
  todo: { label: 'À faire', help: 'Aucun objectif rempli pour l’instant.' },
  later: { label: 'Plus tard', help: 'Niveau bien au-dessus du vôtre : il attendra.' },
};

export interface AchNode { id: number; label: string; level: number; points: number; category: number }
/** levelOnly: met objectives whose only condition is the character's level ("PL>49"): true for every character above it,
 *  so they say nothing about what the player has done (1,556 objectives in 3.7.14.18, mostly dungeon achievements). */
export interface AchProgress { state: AchievementState; met: number; total: number; objectives: string[]; levelOnly?: number }
export const isLevelOnly = (criterion: string) => /^PL[>=]\d+$/.test(criterion.trim());
export interface Rec { id: number; reason: string }
export interface Recommendations { ready: Rec[]; almost: Rec[]; forClass: Rec[]; forLevel: Rec[] }

/**
 * Recommendations for one character.
 * - ready: every objective met, not yet confirmed.
 * - almost: some objectives met by what the player did (finished quests, achievements, ticked boxes; a level condition
 *   alone does not count), within 20 levels above the character, outside Temporis and events, at most 2 per category.
 * - forClass: tied to the class by the data (class quests in their objectives) or named after it, not yet obtained.
 * - forLevel: untouched achievements of the main progression close to the character's level (−10 / +5),
 *   at most 3 per root category so one category does not fill the list.
 */
export function recommend(o: {
  nodes: AchNode[]; progress: Map<number, AchProgress>; level: number;
  classReasons: Map<number, string>; rootName: (category: number) => string;
}, limits = { ready: 6, almost: 6, forClass: 6, forLevel: 8 }): Recommendations {
  const byId = new Map(o.nodes.map((n) => [n.id, n]));
  const p = (id: number) => o.progress.get(id);
  const used = new Set<number>();
  const take = (recs: Rec[], n: number) => { const out = recs.filter((r) => !used.has(r.id)).slice(0, n); out.forEach((r) => used.add(r.id)); return out; };

  const ready = take(o.nodes.filter((n) => p(n.id)?.state === 'ready').sort((a, b) => a.level - b.level)
    .map((n) => ({ id: n.id, reason: 'Tous les objectifs sont remplis : il ne reste qu’à le confirmer.' })), limits.ready);

  const done = (pr: AchProgress) => pr.met - (pr.levelOnly ?? 0);
  const perCat = new Map<number, number>();
  const almost = take(o.nodes.filter((n) => {
    const pr = p(n.id);
    return pr?.state === 'in_progress' && done(pr) > 0 && n.level <= o.level + 20 && familyOf(o.rootName(n.category)) !== 'seasonal';
  })
    .sort((a, b) => ratio(p(b.id)!) - ratio(p(a.id)!) || done(p(b.id)!) - done(p(a.id)!) || a.level - b.level)
    .filter((n) => { const c = perCat.get(n.category) ?? 0; if (c >= 2) return false; perCat.set(n.category, c + 1); return true; })
    .map((n) => {
      const pr = p(n.id)!;
      const ticked = pr.objectives.filter((s) => s === 'confirmed').length;
      const deduced = done(pr) - ticked;
      const how = [deduced && `${deduced} déduit${deduced > 1 ? 's' : ''} de vos quêtes et succès`, ticked && `${ticked} coché${ticked > 1 ? 's' : ''}`].filter(Boolean).join(', ');
      return { id: n.id, reason: `${pr.met} objectif${pr.met > 1 ? 's' : ''} sur ${pr.total} rempli${pr.met > 1 ? 's' : ''} (${how}${pr.levelOnly ? `, ${pr.levelOnly} par votre niveau` : ''}).` };
    }), limits.almost);

  const forClass = take([...o.classReasons].filter(([id]) => byId.has(id) && p(id)?.state !== 'obtained')
    .sort((a, b) => byId.get(a[0])!.level - byId.get(b[0])!.level)
    .map(([id, reason]) => ({ id, reason })), limits.forClass);

  const lo = Math.max(1, o.level - 10), hi = Math.max(15, o.level + 5);
  const perRoot = new Map<string, number>();
  const forLevel = take(o.nodes.filter((n) => p(n.id)?.state === 'not_started' && n.level >= lo && n.level <= hi && familyOf(o.rootName(n.category)) === 'main')
    .sort((a, b) => Math.abs(a.level - o.level) - Math.abs(b.level - o.level) || b.points - a.points || a.label.localeCompare(b.label, 'fr'))
    .filter((n) => {
      const r = o.rootName(n.category);
      const c = perRoot.get(r) ?? 0;
      if (c >= 3) return false;
      perRoot.set(r, c + 1);
      return true;
    })
    .map((n) => ({ id: n.id, reason: `Niveau ${n.level}, proche du vôtre (${o.level}) · ${o.rootName(n.category)}.` })), limits.forLevel);

  return { ready, almost, forClass, forLevel };
}
const ratio = (p: AchProgress) => (p.total ? p.met / p.total : 0);
