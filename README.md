# Atlas des Douze

Compagnon de progression Dofus : quêtes, personnage et équipement, calculés depuis les données officielles du jeu.
Site de fan, non affilié à Ankama. Le nom « Atlas des Douze » reste à vérifier côté marques déposées (INPI, EUIPO).

```sh
npm install
npm run import       # une fois : construit data/game-<version>.sqlite (≈ 8 Go de mémoire, voir plus bas)
npm run dev          # http://localhost:3000
```

| Page | Contenu |
|---|---|
| `/` | Accueil. Au premier passage, création guidée du personnage (classe, niveau, style de jeu, élément) ; ensuite, tableau de bord : progression, régions conseillées, prochaines étapes |
| `/progression/quetes` | Les régions triées par niveau, avec la progression de chacune ; quêtes annexes à part (Almanax, avis de recherche, îles saisonnières…) |
| `/progression/quetes/[région]` | Chaînes de quêtes lues de haut en bas, fiche de quête en langage simple, chaîne complète des prérequis |
| `/personnage` | Plusieurs personnages locaux : profil, alignement, abonnement |
| `/personnage/builds` | Builds communautaires de Dofus Fashionista, filtrés par patch et par niveau, avec objets et stats recalculés à partir de nos données ; comparaison de deux builds |
| `/personnage/sorts/[classe]` | Les 44 sorts de la classe et leurs effets en français |

Les anciennes adresses (`/quetes`, `/classes/…`) redirigent vers les nouvelles. La progression est enregistrée dans le navigateur (`localStorage`) : il n'y a pas encore de comptes.

Documents : [docs/RAPPORT_ARCHITECTURE.md](docs/RAPPORT_ARCHITECTURE.md) (sources, architecture) · [docs/AUDIT_UX.md](docs/AUDIT_UX.md) (audit et direction de la refonte).

## Sources de données

| Données | Source |
|---|---|
| Quêtes, succès, donjons, sorts, effets, traductions | [dofus-sqlite](https://github.com/ledouxm/dofus-sqlite), release de la version du jeu |
| Objets et panoplies | [dofusdude/dofus3-main](https://github.com/dofusdude/dofus3-main), release de la même version. Le JSON de dofus-sqlite arrondit les identifiants Unity 64 bits, ce qui casse le lien entre objets et effets |
| Builds communautaires | API publique en lecture seule de [Dofus Fashionista](https://dofusfashionista.gg/api/v1/), mise en cache une heure côté serveur (`/api/builds`) |

La provenance de chaque jeu de données est enregistrée dans la table `data_source` de la base.

## Développement

```sh
npm test             # tests unitaires + tests sur les vraies données (ignorés sans import)
npm run typecheck
npm run import -- --tag v6.0_3.7.14.18   # réimporte une version précise
```

Prérequis : Node 24 ou plus récent (utilise `node:sqlite` et l'exécution native de TypeScript). L'import charge des fichiers de 100 à 200 Mo : il réserve 8 Go de mémoire.

| Dossier | Rôle |
|---|---|
| `src/` | Moteur pur, testé : conditions (`criteria.ts`, `codes.ts`), graphe (`graph.ts`, `views.ts`), parcours (`regions.ts`), effets (`effects.ts`), sorts (`spells.ts`), stats de build (`stats.ts`), lecture de la base (`load.ts`) |
| `scripts/import.ts` | Import, puis rapport de contrôle `data/report-<version>.json` |
| `app/` | Routes Next.js (pages statiques, sauf `/api/builds`) |
| `components/ui.tsx` | Composants partagés (bouton, carte, statut, tiroir, glossaire). Les couleurs sont des jetons dans `app/globals.css` |
| `components/quests`, `character`, `builds` | Interface par section |

Codes de condition : leur sens, leur catégorie et leurs sources sont dans `src/codes.ts`. Un code non documenté donne l'état « À vérifier en jeu », jamais une supposition. `node scripts/profile-codes.ts` liste les codes présents : à relancer après un patch.
