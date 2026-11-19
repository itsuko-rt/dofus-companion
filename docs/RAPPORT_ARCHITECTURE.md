# Dofus Companion — Audit, sources et architecture

*Rédigé le 2026-11-19. Version du jeu en ligne vérifiée : **3.7.14.18** (bêta : 3.8.1.2).*
Légende : ✅ vérifié par moi (requête réelle) · ⚠️ à confirmer · ❌ indisponible / interdit.

---

## 0. Résumé (à lire en premier)

1. **Les vrais prérequis de quêtes existent dans les fichiers du jeu.** Chaque quête (1 984 au total) a un champ `startCriterion`, une expression booléenne du type `PL>129&(Qf=272|Qf=273)&Qa!496`. 1 423 quêtes référencent une autre quête terminée (`Qf`). On n'a **pas besoin de scraper un guide** pour le graphe : on le *calcule* depuis les données officielles. ✅
2. **Source principale recommandée : [dofus-sqlite](https://github.com/ledouxm/dofus-sqlite)**, qui publie une release par version du jeu (vérification chaque heure) : un `dofus.sqlite` complet + un JSON par table + des images. Dernière release : `v6.0_3.7.14.18` du 2026-11-17. ✅
3. **Fashionista est open source (LGPL-3.0)** ([DofusFashionistaVanced](https://github.com/Trameur/DofusFashionistaVanced)). Il a une **API publique en lecture seule** (builds partagés, tier-list par classe) et un **format d'import documenté** (`fashionista-build`). ✅ En revanche, **le solveur n'est pas exposé par l'API** : pour optimiser, soit on renvoie l'utilisateur sur Fashionista, soit on héberge nous-mêmes le solveur (Python + PuLP/CBC, la licence le permet).
4. **N1ark garde la progression dans le navigateur** (localStorage, compressée en LZString/base64) et propose un export/import d'IDs de quêtes. Importer un export N1ark est donc **techniquement faisable**, sans synchronisation directe. ✅ (le format exact reste ⚠️ à confirmer avec un vrai export)
5. **Ce qu'on ne fait pas :** scraper DofusBook (protégé par Cloudflare), Dofus pour les Noobs (CGU art. 4.2 : pas de reproduction sans accord écrit), ni Fashionista ou N1ark au-delà de leur API ou de leurs exports (leur robots.txt dit `use=reference`). On fait des **liens** vers ces sites.

---

## 1. Audit de l'environnement

| Élément | État |
|---|---|
| Dépôt existant | Aucun : dossier vide, pas de repo git. Rien à écraser. |
| Node / npm | v26.13.1 / 11.20.0 ✅ |
| Python | 3.12.10 ✅ |
| Git | 2.56 ✅ |
| pnpm, Docker, PostgreSQL, sqlite3 CLI, gh | ❌ non installés |

Conséquence : on démarre sans Docker. Une base SQLite (fichier) suffit pour la phase 1, PostgreSQL arrive avec les comptes utilisateurs.

---

## 2. Comparatif des sources

| Source | Données | API publique | Téléchargeable | Open source / licence | MAJ | Automatisable | Usage prévu |
|---|---|---|---|---|---|---|---|
| **dofus-sqlite** | Quêtes, étapes, objectifs, récompenses, succès, donjons, objets, panoplies, sorts, monstres, PNJ, cartes, i18n, images | Non (releases GitHub) | ✅ SQLite + JSON + PNG | Code sans licence déclarée ⚠️ ; les données appartiennent à Ankama | Vérifie chaque heure, une release par patch | ✅ `releases/latest` + `changelog.json` | **Source de vérité** pour les données du jeu |
| **dofusdude** (doduapi, dofus3-main) | Encyclopédie (objets, panoplies, montures, almanax), multilingue | ✅ `api.dofusdu.de` (OpenAPI, SDK TS) — renvoie bien 3.7.14.18 | ✅ releases | GPL-3.0 (API), MIT (docs) | À chaque patch | ✅ | Contre-vérification des objets, images |
| **DDC** (Dofus Batteries Included) | Export JSON du client Unity | ✅ API Swagger | ✅ `data.zip` | MIT | ⚠️ dernier push juin 2025 | ✅ | Plan B si dofus-sqlite s'arrête |
| **DofusDB** (`api.dofusdb.fr`) | Même données du jeu (1 984 quêtes, `startCriterion` inclus), noms FR/EN/ES/DE/PT | ✅ répond (format Feathers `$limit/$skip`) | Via l'API | Non | Suit les patchs | Techniquement oui | ⚠️ Le robots.txt bloque les robots IA. Contre-vérification ponctuelle seulement, idéalement avec l'accord de l'auteur |
| **OpenDofusDB** (openddb.dev) | Encyclopédie | `api.openddb.dev` (images seulement constatées) | — | — | — | — | Aucun : il est lui-même « propulsé par dofus-sqlite » |
| **Dofus Fashionista** | Optimiseur d'équipement (programmation linéaire), 4 938 builds partagés (dofus3), tier-list par classe | ✅ `/api/v1/` lecture seule, CORS ouvert, sans auth | Builds via l'API | ✅ LGPL-3.0 (Python/Django, PuLP + CBC) | Actif (push 2026-11-18) | ✅ | **Moteur de builds** (liens, import, puis éventuellement solveur auto-hébergé) |
| **Dofus Creator** | Création et comparaison de builds | ❌ aucune trouvée | ❌ | Non | — | ❌ | Lien sortant uniquement |
| **DofusBook** | Builds communautaires | ❌ aucune trouvée ; protégé par Cloudflare | ❌ | Non | — | ❌ | Lien sortant uniquement |
| **DofusLab** | Simulateur d'équipement | ⚠️ non étudié | — | Repo public, licence non déclarée | Actif (oct. 2026) | — | Inspiration UI |
| **Dofus pour les Noobs** | Guides de quêtes rédigés, tutoriels Dofus | ❌ | ❌ | Non — CGU : reproduction interdite sans accord écrit | — | ❌ | Lien « voir la soluce » par quête |
| **N1ark** (Dofus Quests) | Graphe de quêtes (cytoscape + elk), suivi local | ❌ | Export utilisateur (base64) | Non | — | Import de l'export de l'utilisateur | Import de progression + inspiration du graphe |

**Infos manquantes partout :** les itinéraires « recommandés » (ordre conseillé), les soluces pas à pas, les builds « par tranche de niveau » validés pour la version actuelle. Ce sont des **données communautaires** : on doit les saisir et les sourcer nous-mêmes (couche C), jamais les inventer.

---

## 3. Ce que contiennent vraiment les données de quêtes (vérifié sur 3.7.14.18)

```json
{"id": 211, "levelMin": 30, "categoryId": 55, "isDungeonQuest": 0,
 "stepIds": [390], "startCriterion": "Qf=209",
 "startPosition": [{"mapId": 3845, "npcId": 893}]}
```

| Table | Lignes | Champs utiles |
|---|---|---|
| QuestData | 1 984 | `levelMin/Max`, `categoryId`, `isDungeonQuest` (344), `repeatType`, `startCriterion`, `startPosition` (map + PNJ), `stepIds` |
| QuestStepData | 2 233 | `optimalLevel`, `objectiveIds`, `rewardsIds`, `dialogId` |
| AchievementData | 2 777 | `categoryId`, `level`, `points`, `objectiveIds`, `rewardIds` |
| AchievementObjectiveData | 8 936 | `criterion` (même langage : `Qf=`, `PL>`, `OA=`…) |
| DungeonData | 187 | `optimalPlayerLevel`, `minLevel`, `bosses`, `achievements`, `requiredObjects` (clés), `entranceMapId` |
| BreedData | 19 | Crâ = id 9, Pandawa = id 12 ; 22 sorts chacun (`breedSpellsId`) |

**Les codes les plus fréquents dans `startCriterion` :** `PL` (niveau, 1 524 fois), `Qf` (quête terminée, 1 423), `Qa` (quête active, 813), `Ad` (390), `Pr`, `Ps`/`Pa` (alignement), `Sc`, `Qo` (objectif), `Pm` (carte), `Qc`, `BT`, `OA`, `DD`…
Seul le sens de `PL`, `Qf`, `Qa`, `Qo` et `Pm` se déduit sans ambiguïté des exemples. **Pour les autres codes, le sens reste à confirmer ⚠️** en recoupant avec le code client ou des quêtes connues. Tant qu'un code n'est pas confirmé, il s'affiche comme « condition non interprétée » et ne bloque rien en silence.

**Trois cas que le graphe doit gérer (vus dans les vraies données) :**
- **ET** : `Ps=2&Pa=55&PL>129&…`, toutes les conditions sont requises.
- **OU** : `(Qf=272|Qf=273|Qf=274)`, une seule suffit. Ce n'est pas une chaîne linéaire.
- **Exclusion** : `Qa!495&Qa!496&Qa!497…`, une quête au choix parmi un groupe. Ce n'est pas un prérequis mais une **exclusivité**.

---

## 4. Architecture des données

### Les cinq couches (séparées physiquement)

```
A. game_*        ← données officielles, réimportées à chaque patch, jamais modifiées à la main
B. community_*   ← infos sourcées (lien soluce DPLN, build Fashionista, astuce), avec auteur et statut
C. route_*       ← progression recommandée (ordre conseillé, tranches de niveau) — distincte des prérequis
D. ugc_*         ← contenu créé par les utilisateurs (builds perso, notes)
E. user_*        ← personnages et progression
```

Chaque ligne de A, B et C porte sa **provenance** : `source_url`, `retrieved_at`, `game_version`, `source_updated_at`, `verification` (`official | verified | community | unverified`).

### Choix de base de données

- **Couche A : SQLite, en lecture seule, un fichier par version du jeu.** Le `dofus.sqlite` amont fait 386 Mo. Notre script d'import en extrait une base compacte (quêtes, succès, donjons, sorts, objets, panoplies, traductions FR/EN) avec les **ID officiels du jeu comme clés primaires**. Aucune donnée n'est dupliquée et la base tient dans un fichier versionné.
- **Couches B à E : PostgreSQL** dès qu'il y a des comptes (Neon, Supabase ou une instance locale). Avant ça, SQLite aussi.
- **Pas de FastAPI au départ.** Tout se fait en TypeScript : dofus-sqlite fournit des types générés (`kysely-codegen`). Python n'entre que si on héberge le solveur Fashionista (phase 5), comme **service séparé**.

### Schéma (extrait, couche A + E)

```sql
-- A. Officiel (clé = ID Ankama)
game_version(id TEXT PK, imported_at, source_release_url)
quest(id INT PK, name_fr, name_en, category_id, level_min, level_max,
      is_dungeon_quest, repeat_type, start_npc_id, start_map_id,
      start_criterion_raw TEXT, game_version)
quest_step(id INT PK, quest_id FK, optimal_level, ordinal)
quest_objective(id INT PK, step_id FK, type_id, params JSON)
achievement(id INT PK, category_id, name_fr, level, points)
achievement_objective(id INT PK, achievement_id FK, criterion_raw TEXT)
dungeon(id INT PK, name_fr, min_level, optimal_level, entrance_map_id)
dungeon_boss(dungeon_id, monster_id) ; dungeon_achievement(dungeon_id, achievement_id)
reward(id, owner_kind, owner_id, kind, ref_id, qty)   -- XP, kamas, objets, titres
subarea(id PK, area_id, name_fr) ; map(id PK, subarea_id, x, y)
breed(id PK, name_fr) ; spell(id PK, breed_id, name_fr) ; spell_level(spell_id, grade, required_level, ap_cost, range_min, range_max, cooldown, effects JSON)
item(id PK, type_id, level, set_id, effects JSON, conditions_raw) ; item_set(id PK, name_fr, bonuses JSON)

-- Graphe dérivé (recalculé à chaque import, jamais saisi à la main)
node(id TEXT PK,  -- 'quest:211', 'ach:51', 'dungeon:50', 'gate:or:…'
     kind, ref_id, label_fr, level_hint)
edge(from_node, to_node, kind)  -- 'requires' | 'any_of' | 'excludes' | 'unlocks'
condition(node_id, code, op, value, interpreted BOOL)  -- niveau, alignement, codes non confirmés

-- E. Utilisateur
character(id PK, user_id, name, breed_id, level, element, game_version)
character_progress(character_id, node_id, status, source, updated_at)
   -- status: done | in_progress ; source: manual | n1ark_import
character_build(character_id, fashionista_build JSON, fashionista_url)
```

`dofus` n'est pas une table à part : un Dofus est un **objet** (`item`) relié à sa quête ou à son succès par les récompenses (`reward`). Le « Dofus Planner » est donc une **vue du graphe** filtrée sur les nœuds dont une récompense est un Dofus.

### Mise à jour après un patch

1. Une tâche planifiée (GitHub Action) interroge `releases/latest` de dofus-sqlite.
2. Si la version a changé, elle télécharge les JSON utiles, réimporte la couche A et recalcule le graphe.
3. Elle produit un **diff** : quêtes ajoutées ou supprimées, `startCriterion` modifiés, nouveaux codes de critère inconnus.
4. Les entrées B et C rattachées à un nœud modifié passent en `needs_review`. Rien n'est écrasé en silence.

---

## 5. Moteur de dépendances (graphe)

```
startCriterion (texte)
   → parseur  → AST booléen (AND / OR / NOT / comparaisons)
   → compilateur → nœuds + arêtes :
        Qf=X            → edge requires(quest:X → cette quête)
        (A|B|C)         → nœud gate:or + edges any_of
        Qa!X            → edge excludes (groupe à choix)
        PL>N            → condition de niveau (pas une arête)
        code inconnu    → condition interpreted=false (affichée, non bloquante)
```

**Statut d'un nœud pour un personnage** (fonction pure, testable) :
`done` (coché) → `available` (l'AST s'évalue à vrai avec la progression et le niveau) → `locked` (faux ; on affiche *quelles* conditions manquent) → `excluded` (une quête du même groupe exclusif a été choisie).

Quand on coche un nœud, on réévalue seulement ses successeurs. Le graphe fait environ 5 000 nœuds, donc le calcul côté client est instantané.

**Visualisation :** [React Flow](https://reactflow.dev) avec mise en page calculée par **elkjs** (le même moteur de layout que N1ark). On n'affiche jamais les 5 000 nœuds d'un coup : on montre une **vue focalisée**, soit une chaîne de Dofus, soit une région, soit « ce qui est disponible maintenant » avec 2 niveaux d'ancêtres et de descendants. Si une vue globale devient nécessaire, Cytoscape ou Sigma (WebGL) tiennent mieux la charge ⚠️ à mesurer.

**Régions** (Incarnam, Astrub, Frigost…) : elles se dérivent de `startPosition.mapId → subarea → area` et de `categoryId`. L'**ordre conseillé** entre régions relève de la couche C (route) et n'entre jamais dans les arêtes `requires`.

---

## 6. Builder de personnage et modules Crâ / Pandawa

### Principe : on ne recrée pas Fashionista

| Phase | Ce qu'on fait | Dépendance |
|---|---|---|
| 1 | Afficher les **builds partagés Fashionista** pour Crâ et Pandawa via `/api/v1/shared-builds/` et `/tier-list/` (747 builds Crâ en dofus3). On les filtre par niveau et on **masque ou signale ceux dont `solved_patch` ≠ patch actuel**. On a vu un build Crâ « top » calé sur la 3.3 : le filtre est indispensable. | API publique |
| 2 | Bouton « Ouvrir / optimiser dans Fashionista » : on génère un `fashionista-build` (schéma JSON v1) et on fait un lien `/import/build/?data=<base64url>`. | Format d'import documenté |
| 3 | Affichage des stats d'un build : on recalcule PA, PM, résistances et caractéristiques depuis **nos** données objets (couche A). C'est de l'addition, pas de l'optimisation. | Interne |
| 5 (option) | Héberger le paquet `fashionistapulp` (PuLP + CBC) en service Python séparé pour optimiser chez nous. LGPL-3.0 : usage autorisé, modifications de la bibliothèque à republier. **Prévenir les mainteneurs d'abord.** | Auto-hébergé |

Pour Dofus Creator et DofusBook, on se limite à des liens sortants (aucune API).

### Modules de classe = données, pas code

```
class_module(breed_id)            -- 9 = Crâ, 12 = Pandawa ; ajouter une classe = ajouter des lignes
class_guide(breed_id, level_band, element, mode, content_md, sources[], game_version, verification)
class_mechanic(breed_id, key, explanation_md, related_spell_ids[], sources[])  -- ex. états du Pandawa
build_reference(breed_id, level_band, element, fashionista_id, solved_patch, tags)
```

- **Sorts, niveaux de déblocage, coûts en PA, portées, temps de relance et effets** : générés depuis la couche A (`spell`, `spell_level`). Rien n'est écrit à la main.
- **Conseils de jeu, forces et faiblesses** : couche B, rédigés à la main avec des sources, marqués `community`, et rattachés à une version du jeu.
- **Pandawa : vérifié dans les données 3.7.14.18 ✅.** Karcham (niv. 10) et Chamrak (niv. 120) sont les deux variantes d'un même emplacement et posent l'état « Porteur ». L'état **Saoul** est posé par 9 sorts (Ribote, Bombance, Picole, Alcoshu, Liqueur, Ébriété, Ivresse, Absinthe, Bistouille), l'état **Sobre** par 5 (Gueule de Bois, Bombance, Picole, Lait de Bambou, Prohibition). Le Tonneau apparaît dans Ébriété et Ivresse. Les données disent *quels* sorts posent quels états, mais pas *pourquoi* les jouer : cette partie reste un guide communautaire (couche B), à sourcer.
- Les tranches 1-20 … 200 sont un **filtre** (`level_band`), pas une structure de code.

---

## 7. Profils et suivi

- Plusieurs personnages par compte. La progression est stockée par `node_id` et non par quête, ce qui couvre quêtes, succès, donjons et Dofus avec une seule table.
- Cocher à la main déclenche une réévaluation locale du graphe.
- **Import N1ark** : l'utilisateur colle son export (base64 LZString), on décode, on mappe les IDs de quêtes (⚠️ à vérifier : ce sont *a priori* les ID Ankama) et on marque `source = n1ark_import`. Pas de synchronisation automatique.
- Sans compte en phase 1 : la progression reste dans le navigateur, avec export/import JSON. Les comptes arrivent en phase 4.

---

## 8. Stack recommandée

| Besoin | Choix | Pourquoi |
|---|---|---|
| Front + API | **Next.js (App Router) + TypeScript** | Une seule base de code, rendu serveur pour les pages encyclopédie |
| Style | **Tailwind CSS**, thème sombre | Demandé, rapide, pas de bibliothèque de composants lourde |
| Accès aux données | **Kysely + better-sqlite3** (puis Postgres) | Types générés depuis dofus-sqlite |
| Graphe | **React Flow + elkjs** | Interactif, clic sur un nœud, layout automatique |
| Import des données | Script TypeScript lancé par une GitHub Action | Pas de second langage |
| Tests | **Vitest** (parseur de critères, statuts du graphe, import) | Le cœur du projet est de la logique pure |
| Solveur | Plus tard : Python + PuLP (le code de Fashionista) | Seulement si les liens ne suffisent pas |
| Écartés pour l'instant | FastAPI, Docker, file de messages, cache Redis | Aucun besoin réel en phase 1 |

---

## 9. Feuille de route

| Phase | Contenu | Critère de fin |
|---|---|---|
| **1. Fondations des données** | Script d'import dofus-sqlite → `game.sqlite` (FR/EN) ; parseur `startCriterion` et compilateur de graphe ; rapport des codes de critère non interprétés | Tests verts ; 1 984 quêtes importées ; liste des codes inconnus produite |
| **2. Carte des quêtes** | Next.js, vue graphe focalisée (région, chaîne, disponible maintenant), fiche détail d'une quête, cases à cocher en local | On coche la quête X et ses successeurs deviennent disponibles |
| **3. Encyclopédie + modules Crâ/Pandawa** | Pages sorts générées, donjons, succès, Dofus Planner (vue du graphe) ; builds Fashionista filtrés par patch ; lien d'import | Fiches Crâ et Pandawa entièrement issues des données, sans texte inventé |
| **4. Comptes et progression** | Auth, Postgres, plusieurs personnages, import N1ark, tableau de bord | Progression persistée entre appareils |
| **5. Contenu communautaire et options** | Routes recommandées (couche C), guides sourcés, workflow de revue après patch ; solveur auto-hébergé si justifié | Chaque conseil a une source et une version |

---

## 10. Risques et limites

| Risque | Impact | Parade |
|---|---|---|
| **Propriété intellectuelle Ankama** : les données et images extraites du client appartiennent à Ankama. Leur extraction peut contrevenir au CLUF. | Élevé (blocage possible) | Site de fan non commercial, mention « non affilié à Ankama », pas de revente. ⚠️ Relire la politique Ankama sur les sites de fans avant la mise en ligne. |
| dofus-sqlite sans licence déclarée, maintenu par une seule personne | Moyen | On consomme ses *releases* sans copier son code ; plan B avec DDC (MIT) ou dofusdude. |
| Codes de critère au sens inconnu | Moyen | Affichés comme « non interprétés » plutôt que devinés, avec un rapport à chaque import. |
| Builds communautaires périmés | Moyen | Filtre `solved_patch`, badge de version, jamais présentés comme « optimaux ». |
| API Fashionista modifiée ou limitée | Moyen | Cache de 5 min côté serveur, liens de secours, contact avec les mainteneurs. |
| CGU des sites de guides (DPLN, N1ark, DofusDB) | Moyen | Liens seulement, pas de scraping, accord écrit si on veut plus. |
| Taille du graphe dans le navigateur | Faible | Vues focalisées, layout calculé à la demande. |
| Données manquantes : ordre conseillé, soluces, budget en kamas | Certain | Couche C saisie à la main ; budget plus tard (pas de source de prix fiable trouvée). |

---

## 11. Premier jalon proposé (en attente de ton accord)

**« Le graphe calculé » (phase 1, sans interface) :**
1. Initialiser le dépôt (Next.js + TS + Vitest).
2. `scripts/import.ts` : télécharger la release dofus-sqlite courante et construire `data/game-3.7.14.18.sqlite` avec quêtes, étapes, succès, objectifs, donjons et traductions FR.
3. `lib/criteria/` : parseur et évaluateur de `startCriterion`, testés sur les vrais exemples ci-dessus (ET, OU, exclusion).
4. `lib/graph/` : compilation en nœuds et arêtes, et fonction `status(node, progression, niveau)`.
5. Sortie : un rapport (nombre d'arêtes, codes inconnus, chaînes les plus longues), plus un test « cocher 209 rend 211 disponible au niveau 30 ».

C'est la base dont dépend tout le reste. L'interface vient ensuite.

---

### Sources consultées
- [ledouxm/dofus-sqlite](https://github.com/ledouxm/dofus-sqlite) (README, releases, JSON `questsdata`, `queststepsdata`, `achievementsdata`, `achievementobjectivesdata`, `dungeonsdata`, `breedsdata`)
- [Dofus-Batteries-Included/DDC](https://github.com/Dofus-Batteries-Included/DDC)
- [dofusdude](https://github.com/dofusdude) · [api.dofusdu.de](https://docs.dofusdu.de)
- [api.dofusdb.fr](https://api.dofusdb.fr/quests) · [dofusdb.fr/robots.txt](https://dofusdb.fr/robots.txt)
- [Trameur/DofusFashionistaVanced](https://github.com/Trameur/DofusFashionistaVanced) (`api_view.py`, `requirements.txt`) · [dofusfashionista.gg/api/v1](https://dofusfashionista.gg/api/v1/) · [schéma d'import](https://dofusfashionista.gg/api/v1/import/schema/1/)
- [dofus.n1ark.com](https://dofus.n1ark.com/) (bundle JS : stockage local, export/import)
- [dofuspourlesnoobs.com — CGU](https://www.dofuspourlesnoobs.com/cgu-dpln.html)
- [openddb.dev](https://openddb.dev/) · [dofuscreator.com](https://dofuscreator.com/) · [dofusbook.net](https://dofusbook.net/) (Cloudflare, non consultable) · [dofuslab](https://github.com/dofuslab/dofuslab)
