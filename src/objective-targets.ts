// Monsters and items named by quest objectives, read back from the objective texts the import renders from the game's
// templates (src/objectives.ts). Only those templates are parsed: free-text objectives ("Trouver le chef…") are ignored.
// The names are then matched exactly against the game's monster and item names; nothing is guessed from partial names.

const MONSTER = [
  /^Vaincre x\d+ (.+?) sur la carte .+ en un seul combat$/,  // template 16
  /^Vaincre x\d+ (.+?) en un seul combat$/,                  // template 6
  /^Vaincre x\d+ (.+)$/,                                     // template 14
  /^Monstre à vaincre : (.+)$/,                              // template 7
  /^Eliminer (.+)\.$/,                                       // template 13
  /^Rapporter \d+ âme de (.+) à .+\.$/,                      // template 12
];
const ITEM = [
  /^Ramener à .+? ?: x\d+ (.+)$/,                            // template 3
  /^Montrer à .+? ?: \d+ (.+)$/,                             // template 2
  /^Utiliser : (.+)$/,                                       // template 8
  /^Fabriquer \d+ (.+) et fermer l'interface$/,              // template 17
];

export function objectiveTargets(objective: string): { monster?: string; item?: string } {
  for (const re of MONSTER) { const m = objective.match(re); if (m) return { monster: m[1].trim() }; }
  for (const re of ITEM) { const m = objective.match(re); if (m) return { item: m[1].trim() }; }
  return {};
}
