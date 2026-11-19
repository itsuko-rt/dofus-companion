# Atlas des Douze

Compagnon de progression Dofus : quêtes, personnage et équipement, calculés depuis les données officielles du jeu.
Site de fan, non affilié à Ankama. Le nom « Atlas des Douze » reste à vérifier côté marques déposées (INPI, EUIPO).

```sh
npm install
npm run import       # une fois : construit data/game-<version>.sqlite (≈ 8 Go de mémoire, voir plus bas)
npm run assets       # une fois : illustrations officielles dans public/ankama/ (© Ankama, non versionnées ; facultatif)
npm run dev          # http://localhost:3000
```

| Page | Contenu |
|---|---|
| `/` | Accueil. Au premier passage, création guidée du personnage (classe, niveau, style de jeu, élément) ; ensuite, tableau de bord : progression, régions conseillées, prochaines étapes |
| `/progression/quetes` · `/progression/quetes/[région]` | Suivi des quêtes : régions par groupes repliables, filtres (niveau, classe, statut, terminées, recherche), tableau de progression, graphe des chaînes (clic : fiche ; clic droit : terminée ; Maj/Ctrl + clic droit : avec les prérequis ; Ctrl+Z : annuler) |
| `/personnage` | Plusieurs personnages : profil, alignement, abonnement, sauvegarde (export / import JSON) |
| `/builds` | Builds communautaires de Dofus Fashionista (top + récents) : filtres, tris, équipement par emplacement, stats recalculées, sorts conseillés, comparaison, enregistrement dans le personnage |
| `/personnage/sorts/[classe]` | Les 44 sorts de la classe et leurs effets en français |
| `/progression/succes` | Suivi des succès : tableau de bord, objectifs un par un (déduits des conditions officielles ou cochés), récompenses, guides, confirmation, provenance |
| `/progression/scan` | Scan de progression : capture d'une fenêtre Dofus, OCR dans le navigateur, vérification puis enregistrement, historique avec annulation |
| `/progression/dofus` | Les 34 Dofus et la quête ou le succès qui les donne |
| `/equipement` | Encyclopédie des objets équipables |
| `/guides`, `/guides/quetes/[région]`, `/guides/dofus/[dofus]` | Guides publics générés au build depuis les données du jeu (ordre des quêtes, chaîne de chaque Dofus) |
| `/confidentialite` · `/mentions-legales` · `/a-propos` | Pages légales et présentation |
| `/compte` | Compte du site (pas un compte Ankama) : personnages et progression synchronisés |

Les anciennes adresses (`/quetes`, `/classes/…`) redirigent vers les nouvelles. Sans compte, la progression reste dans le navigateur. Avec un compte, elle est enregistrée dans `data/app.sqlite`, une base séparée de celle du jeu : l'import ne la touche jamais. Le lien de réinitialisation du mot de passe est écrit dans le journal du serveur tant qu'aucun fournisseur d'e-mail n'est configuré.

Documents : [docs/LANCEMENT_PUBLIC.md](docs/LANCEMENT_PUBLIC.md) (mise en ligne : SEO, hébergement, publicité, démarches) · [docs/RAPPORT_REFONTE_VISUELLE.md](docs/RAPPORT_REFONTE_VISUELLE.md) (refonte visuelle, illustrations) · [docs/RAPPORT_SUCCES_SCAN.md](docs/RAPPORT_SUCCES_SCAN.md) (succès, scan, API) · [docs/RAPPORT_SUIVI_QUETES.md](docs/RAPPORT_SUIVI_QUETES.md) (refonte du suivi des quêtes) · [docs/RAPPORT_DEVELOPPEMENT.md](docs/RAPPORT_DEVELOPPEMENT.md) · [docs/RAPPORT_ARCHITECTURE.md](docs/RAPPORT_ARCHITECTURE.md) (sources, architecture) · [docs/AUDIT_UX.md](docs/AUDIT_UX.md) (audit et direction de la refonte).

## Sources de données

| Données | Source |
|---|---|
| Quêtes, succès, donjons, sorts, effets, traductions | [dofus-sqlite](https://github.com/ledouxm/dofus-sqlite), release de la version du jeu |
| Objets et panoplies | [dofusdude/dofus3-main](https://github.com/dofusdude/dofus3-main), release de la même version. Le JSON de dofus-sqlite arrondit les identifiants Unity 64 bits, ce qui casse le lien entre objets et effets |
| Tutoriels de quêtes | Sitemap public de [Dofus Pour Les Noobs](https://www.dofuspourlesnoobs.com/) : lien quand le titre de la page est identique au nom de la quête (le contenu n'est jamais copié) |
| Builds communautaires | API publique en lecture seule de [Dofus Fashionista](https://dofusfashionista.gg/api/v1/), mise en cache une heure côté serveur (`/api/builds`) |

La provenance de chaque jeu de données est enregistrée dans la table `data_source` de la base.

## Développement

```sh
npm test             # tests unitaires + tests sur les vraies données (ignorés sans import)
npm run typecheck
npm run import -- --tag v6.0_3.7.14.18   # réimporte une version précise
npm run build && npm start               # serveur de production (Node requis : routes API et comptes)
node scripts/smoke.ts http://localhost:3000   # test de bout en bout d'un serveur lancé
node scripts/check-links.ts http://localhost:3000   # liens cassés, canoniques, descriptions, JSON-LD (pages du sitemap)
node scripts/make-icons.ts                    # favicons, icônes et image de partage depuis public/brand/*.svg
node scripts/layout-report.ts                 # largeur des chaînes de quêtes par région
```

`APP_DB_PATH` permet de changer l'emplacement de la base des comptes (par défaut `data/app.sqlite`). Pensez à la sauvegarder.

Prérequis : Node 24 ou plus récent (utilise `node:sqlite` et l'exécution native de TypeScript). L'import charge des fichiers de 100 à 200 Mo : il réserve 8 Go de mémoire.

| Dossier | Rôle |
|---|---|
| `src/` | Moteur pur, testé : conditions (`criteria.ts`, `codes.ts`), graphe (`graph.ts`, `views.ts`), disposition des chaînes (`layout.ts`), parcours (`regions.ts`), effets (`effects.ts`), sorts (`spells.ts`), stats de build (`stats.ts`), lecture de la base (`load.ts`) |
| `scripts/import.ts` | Import, puis rapport de contrôle `data/report-<version>.json` |
| `app/` | Routes Next.js (pages statiques, sauf `/api/builds`) |
| `components/ui.tsx` | Composants partagés (bouton, carte, statut, tiroir, glossaire). Les couleurs sont des jetons dans `app/globals.css` |
| `components/quests`, `character`, `builds` | Interface par section |

Codes de condition : leur sens, leur catégorie et leurs sources sont dans `src/codes.ts`. Un code non documenté donne l'état « À vérifier en jeu », jamais une supposition. `node scripts/profile-codes.ts` liste les codes présents : à relancer après un patch.
