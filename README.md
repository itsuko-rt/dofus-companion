# Dofus Companion

Données officielles, graphe de dépendances calculé et carte des quêtes interactive (`/quetes`).

```sh
npm run import       # une fois, pour construire la base
npm run dev          # http://localhost:3000/quetes
```

La carte propose deux vues : une région (les quêtes de la catégorie et leurs prérequis directs venus d'ailleurs, en grisé) ou une quête centrée (toute sa chaîne de prérequis et ce qu'elle débloque).
Le profil (niveau, classe, alignement, abonnement) et la progression cochée sont enregistrés dans le navigateur (`localStorage`). Il n'y a pas encore de comptes.
Architecture et choix : [docs/RAPPORT_ARCHITECTURE.md](docs/RAPPORT_ARCHITECTURE.md).

Prérequis : Node ≥ 24 (utilise `node:sqlite` et l'exécution native de TypeScript, aucune dépendance d'exécution).

```sh
npm install          # TypeScript pour le typecheck uniquement
npm run import       # télécharge la dernière release dofus-sqlite → data/game-<version>.sqlite + data/report-<version>.json
npm test             # tests unitaires + tests sur les vraies données (ignorés si l'import n'a pas tourné)
npm run typecheck
```

`npm run import -- --tag v6.0_3.7.14.18` réimporte une version précise.

| Fichier | Rôle |
|---|---|
| `src/criteria.ts` | Parseur et évaluateur (3 états : vrai / faux / inconnu) du langage de critères Ankama (`PL>29&(Qf=272\|Qf=273)`) |
| `src/graph.ts` | Nœuds (quête, succès, donjon, porte OU), arêtes `requires` / `any_of` / `excludes` / `in_dungeon`, `status()`, `unlockedBy()` |
| `src/load.ts` | Recharge le graphe depuis la base importée |
| `src/views.ts` | Sous-graphes affichés : vue région, vue centrée |
| `app/api/graph/route.ts` | Sert le graphe en JSON, généré une seule fois au build |
| `components/` | Carte (React Flow + dagre), panneau de détail, profil et progression locale |
| `scripts/import.ts` | Import de la couche A (officielle) + rapport de contrôle |

Le sens des codes de critère, leur catégorie et leurs sources (dodumap, rendu `/criterion` de DofusDB) sont dans `src/codes.ts`.

- **Évalués :**
  - progression : `PL`, `Qf`, `Qa`, `QF`, `QQ`, `OA`, `Oa` ;
  - fiche du personnage : `PG`, `Ps`, `Pa`, `Pr`, `PZ`, `SC`, `Pj`, `PJ` ;
  - côté serveur, traités comme vrais à la manière du client : `Sc`, `Sv`.
- **Documentés mais non évaluables** (objectifs de succès, inventaire, carte, Almanax, évènements) : affichés avec leur libellé.
- **Non documentés :** état « inconnu », affichés tels quels, jamais devinés. Ils sont listés dans le rapport d'import.

`node scripts/profile-codes.ts` montre, pour chaque code, ses opérateurs et les tables d'ID que ses valeurs touchent. À relancer quand un patch ajoute des codes.
