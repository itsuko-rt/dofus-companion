// Meaning of Ankama criterion codes. Every entry is backed by at least one source:
//  - dodumap: https://github.com/dofusdude/dodumap/blob/main/condition_interpretations.go
//    (checked by its authors against the decompiled client factory)
//  - dofusdb: https://api.dofusdb.fr/criterion/<expr>?lang=fr (readable rendering), sampled 2026-11-19
// A code missing from this table is "non documenté": shown raw, evaluated as unknown.
import type { Atom } from './criteria.ts';

export type CodeKind =
  | 'progress'  // derived from what the character has done (quests, achievements)
  | 'profile'   // character sheet: class, alignment, professions, subscription, server type
  | 'objective' // an in-game action counted by an achievement objective (kills, challenges…)
  | 'context'   // momentary situation: map, inventory, calendar, server event
  | 'server';   // server-only predicate; the client treats it as always true

// 'inferred' = no source documents it; meaning deduced from how the data uses it. Listed in the import report.
export interface CodeInfo { fr: string; kind: CodeKind; evaluated: boolean; sources: ('dodumap' | 'dofusdb' | 'inferred')[] }

const c = (fr: string, kind: CodeKind, evaluated: boolean, ...sources: CodeInfo['sources']): CodeInfo =>
  ({ fr, kind, evaluated, sources });

export const CODES: Record<string, CodeInfo> = {
  PL: c('Niveau du personnage', 'progress', true, 'dodumap', 'dofusdb'),
  Qf: c('Quête terminée', 'progress', true, 'dodumap', 'dofusdb'),
  Qa: c('Quête en cours', 'progress', true, 'dodumap', 'dofusdb'),
  QF: c('Quête terminée (nombre de fois)', 'progress', true, 'dofusdb'),
  QQ: c('Nombre de quêtes terminées', 'progress', true, 'dofusdb'),
  OA: c('Succès obtenu', 'progress', true, 'dodumap', 'dofusdb'),
  Oa: c('Points de succès', 'progress', true, 'dodumap', 'dofusdb'),
  // Qc could be computed from the graph; kept unevaluated to avoid recursive status for 70 uses.
  Qc: c('Quête disponible', 'progress', false, 'dodumap', 'dofusdb'),
  Qo: c("Objectif de quête (= en cours, > terminé)", 'progress', false, 'dodumap', 'dofusdb'),

  PG: c('Classe', 'profile', true, 'dodumap', 'dofusdb'),
  Ps: c('Alignement (1 Bonta, 2 Brâkmar)', 'profile', true, 'dodumap', 'dofusdb'),
  Pa: c("Niveau d'alignement", 'profile', true, 'dodumap', 'dofusdb'),
  Pr: c("Ordre d'alignement", 'profile', true, 'dofusdb'),
  PZ: c('Abonné', 'profile', true, 'dodumap', 'dofusdb'),
  SC: c('Type de serveur', 'profile', true, 'dodumap', 'dofusdb'),
  Pj: c('Niveau de métier', 'profile', true, 'dodumap', 'dofusdb'),
  PJ: c('Métier appris / niveau de métier', 'profile', true, 'dodumap', 'dofusdb'),
  Pz: c('Mode restreint du compte', 'profile', false, 'dodumap', 'dofusdb'),

  Ef: c('Challenge réussi sur un monstre', 'objective', false, 'dofusdb'),
  EH: c('Challenge réussi', 'objective', false, 'dofusdb'),
  EA: c('Challenges contre des groupes de plus haut niveau', 'objective', false, 'dofusdb'),
  Ea: c('Challenges en donjon contre des groupes de plus haut niveau', 'objective', false, 'dofusdb'),
  EB: c('Naissances de montures', 'objective', false, 'dofusdb'),
  EI: c('Objet consommé', 'objective', false, 'dofusdb'),
  ES: c('Sous-zone visitée', 'objective', false, 'dofusdb'),
  EM: c('Monstre tué', 'objective', false, 'dodumap', 'dofusdb'),
  EC: c('Objets confectionnés', 'objective', false, 'dofusdb'),
  Eu: c('Runes obtenues par brisage', 'objective', false, 'dofusdb'),
  HD: c('Objet obtenu', 'objective', false, 'dofusdb'),

  PO: c('Objet possédé (E/X : équipé / non équipé)', 'context', false, 'dodumap', 'dofusdb'),
  DD: c("Objet reçu il y a N jours", 'context', false, 'dodumap', 'dofusdb'),
  DH: c("Objet reçu il y a N heures", 'context', false, 'dodumap'),
  Pm: c('Position sur une carte', 'context', false, 'dodumap', 'dofusdb'),
  Ad: c("Jour de l'Almanax", 'context', false, 'dodumap', 'dofusdb'),
  WE: c('Évènement actif sur le serveur', 'context', false, 'dodumap', 'dofusdb'),
  ST: c('Saison active sur le serveur', 'context', false, 'dodumap', 'dofusdb'),
  HA: c('Altération possédée', 'context', false, 'dodumap', 'dofusdb'),

  Sc: c('Condition côté serveur', 'server', true, 'dodumap'),
  Sv: c('Condition côté serveur', 'server', true, 'dodumap'),
  // BT=1 is the only condition of 34 chain-start quests (e.g. Incarnam level 2) and DofusDB renders it as
  // empty, like Sc/Sv. Treating it as restrictive would lock the very first quests of the game.
  BT: c('Condition non documentée, supposée toujours vraie (hypothèse)', 'server', true, 'inferred'),
};

export const INFERRED = Object.entries(CODES).filter(([, i]) => i.sources.includes('inferred')).map(([k]) => k);

/** French text for the "what's missing" list: `Succès obtenu (OA=586)`. */
export function describe(a: Atom): string {
  return `${CODES[a.code]?.fr ?? 'Condition non documentée'} (${a.code}${a.op}${a.value})`;
}

export const EVALUATED =new Set(Object.entries(CODES).filter(([, i]) => i.evaluated).map(([k]) => k));
