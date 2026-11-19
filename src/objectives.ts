// Quest objectives in French, from the game's templates (QuestObjectiveTypeData):
// "Ramener à #1 : x#3 #2" with parameters 0/1/2 = #1/#2/#3.

export type Ref = 'npc' | 'item' | 'monster' | 'subarea' | 'text' | 'count' | 'none';

/** What each placeholder of each objective type points to (types 0–17 of 3.7.14.18). */
export const OBJECTIVE_REFS: Record<number, [Ref, Ref, Ref]> = {
  0: ['text', 'none', 'none'],          // #1 (free text)
  1: ['npc', 'none', 'none'],           // Aller voir #1
  2: ['npc', 'item', 'count'],          // Montrer à #1 : #3 #2
  3: ['npc', 'item', 'count'],          // Ramener à #1 : x#3 #2
  4: ['text', 'none', 'none'],          // Découvrir la carte : #1
  5: ['subarea', 'none', 'none'],       // Découvrir la zone #1
  6: ['monster', 'count', 'none'],      // Vaincre x#2 #1 en un seul combat
  7: ['monster', 'none', 'none'],       // Monstre à vaincre : #1
  8: ['item', 'none', 'none'],          // Utiliser : #1
  9: ['npc', 'none', 'none'],           // Retourner voir #1
  10: ['text', 'none', 'none'],         // Escorter #1 #2
  11: ['none', 'none', 'none'],         // Vaincre un joueur en défi #1
  12: ['npc', 'monster', 'count'],      // Rapporter #3 âme de #2 à #1.
  13: ['monster', 'none', 'none'],      // Eliminer #1.
  14: ['monster', 'count', 'none'],     // Vaincre x#2 #1
  15: ['none', 'none', 'none'],         // Gagner un combat Krosmaster
  16: ['monster', 'count', 'none'],     // Vaincre x#2 #1 sur la carte #3 en un seul combat (#3 = map id)
  17: ['item', 'count', 'none'],        // Fabriquer #2 #1 et fermer l'interface
};

export interface ObjectiveLookups {
  template: (typeId: number) => string | undefined;
  npc: (id: number) => string | undefined;
  item: (id: number) => string | undefined;
  monster: (id: number) => string | undefined;
  subarea: (id: number) => string | undefined;
  text: (id: number) => string | undefined;
}

export function renderObjective(typeId: number, params: number[], L: ObjectiveLookups): string {
  const t = L.template(typeId);
  const refs = OBJECTIVE_REFS[typeId];
  if (!t || !refs) return `Objectif (type ${typeId})`;
  const show = (i: number): string => {
    const v = params[i] ?? 0;
    switch (refs[i]) {
      case 'npc': return L.npc(v) ?? `PNJ n°${v}`;
      case 'item': return L.item(v) ?? `objet n°${v}`;
      case 'monster': return L.monster(v) ?? `monstre n°${v}`;
      case 'subarea': return L.subarea(v) ?? `zone n°${v}`;
      case 'text': return L.text(v) ?? '';
      case 'count': return String(v);
      default: return typeId === 16 && i === 2 ? 'une carte précise' : '';
    }
  };
  return t.replace(/#([123])/g, (_, d) => show(Number(d) - 1)).replace(/\s+/g, ' ').replace(/\s([.,:])/g, '$1').trim();
}
