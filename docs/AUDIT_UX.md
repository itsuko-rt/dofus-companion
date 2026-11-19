# Audit UX/UI et proposition de refonte

*Rédigé le 2026-11-19, sur la base du code au commit `62aaffd`. Aucune modification n'a encore été faite : ce document attend validation.*
Légende : ✅ vérifié (requête réelle, lecture du code) · ⚠️ à confirmer.

---

## 0. En bref

1. **On ne refait pas l'application.** Le moteur (données, conditions, graphe, sorts) est solide et testé (24 tests). Le problème est la présentation : la carte des quêtes affiche un graphe technique au lieu d'un parcours, et rien ne guide un nouveau joueur.
2. **Builds : on s'appuie sur Fashionista sans le refaire.** Son API publique renvoie, pour chaque build partagé, la **liste exacte des objets**, les caractéristiques, les parchemins et les exos ✅. On peut donc afficher de vrais équipements et recalculer leurs stats avec nos propres données d'objets. Pour l'optimisation, on renvoie vers Fashionista, Dofus Creator ou Dofus Builds.
3. **La carte des quêtes devient un parcours :**
   - une vue « Monde » en cartes de régions triées par niveau, avec une progression pour chacune ;
   - des **chaînes de quêtes lues de haut en bas**, comme chez N1ark ;
   - une fiche de quête en langage simple ;
   - un panneau « Vos prochaines étapes ».
4. **Point d'attention sur le nom :** les noms en *Kros-* sont proches de marques d'Ankama (Krosmoz, Krosmaster, Krosmaga), et « Dofus » est aussi une marque d'Ankama. Je propose de privilégier un nom tiré de l'univers sans reprendre un nom de produit : **« Atlas des Douze »** (`atlasdesdouze.fr` est libre ✅).

---

## 1. Comparatif des quatre outils de build

| | **Dofus Fashionista** | **Dofus Creator** | **DofusBook** | **Dofus Builds** |
|---|---|---|---|---|
| Site | [dofusfashionista.gg](https://dofusfashionista.gg/) | [dofuscreator.com](https://dofuscreator.com/) | [dofusbook.net](https://dofusbook.net/) | [dofusbuilds.com](https://dofusbuilds.com/) |
| Point fort | **Optimisation automatique** : un solveur (programmation linéaire, PuLP/CBC) choisit l'équipement selon tes objectifs de stats | Création et comparaison de projets, version mobile hors ligne. Contient aussi un outil « Fashionista » d'optimisation automatique (depuis la v1.20, janvier 2023) | Bibliothèque de stuffs historique (plus de 10 ans) : dossiers, atelier de craft, simulation de dégâts, apparences (Skinator) | Calculateur gratuit : points de caractéristiques et parchemins, dégâts des sorts, résistances, bonus de panoplies, forgemagie, plan de craft, mode équipe, « Auto-Builder », builds publics |
| Dofus 3 | ✅ (aussi bêta, Dofus 2, Rétro, Touch) | ✅ | ✅ | ✅ |
| API publique | ✅ **Oui, en lecture seule, sans authentification, CORS ouvert** : builds partagés, tier-list par classe, schéma d'import | ❌ aucune trouvée | ❌ aucune trouvée, site protégé par Cloudflare | ❌ aucune trouvée |
| Import / export | ✅ Format `fashionista-build` documenté (JSON Schema), import par lien `/import/build/?data=…` | Partage par lien de projet | Partage par lien | Partage par lien, export |
| Open source | ✅ LGPL-3.0 ([DofusFashionistaVanced](https://github.com/Trameur/DofusFashionistaVanced)) | ❌ | ❌ | ❌ |
| Règles d'accès automatisé | robots.txt : `search=yes, ai-train=no, use=reference` | non vérifié | robots.txt bloque seulement `/admin/` | robots.txt : `Allow: /` |
| Prix des objets | ❌ | ❌ | ❌ | ❌ |
| **Rôle dans notre projet** | **Source des builds recommandés** (API) et moteur d'optimisation (lien sortant) | Lien sortant « Optimiser / créer dans Dofus Creator » | Lien sortant « Voir sur DofusBook » | Lien sortant « Simuler les dégâts dans Dofus Builds » |

**Ce qu'on vérifie concrètement :** un build partagé Fashionista, par exemple « Ocra full inte 200 », renvoie `items: [23272, 18663, …]` (14 ID d'objets), `characteristics: {intelligence: 398, agility: 3}`, `scrolls`, `exos: {ap: true, mp: true}` et un `back_url` vers sa page ✅. L'élément se déduit des caractéristiques (ici Intelligence, donc Feu) : c'est une donnée, pas une supposition.

**Ce que personne ne fournit :** des prix fiables. Il n'existe ni API d'hôtel de vente, ni source ouverte. On n'affichera donc pas de budget en kamas tant qu'on n'a pas de source. On affichera plutôt « prix non disponible » qu'un chiffre inventé.

---

## 2. Audit de l'application actuelle

### Architecture (ce qu'on garde)

| Couche | État | Verdict |
|---|---|---|
| Moteur `src/` : conditions, graphe, vues, effets, sorts | TypeScript pur, testé | **Garder tel quel** |
| Import `scripts/import.ts` | Base SQLite par version du jeu, plus un rapport de contrôle | Garder ; ajouter les objets et les récompenses |
| Routes : `/quetes`, `/classes`, `/classes/[id]`, `/api/graph` | Statiques, build propre | Garder les URL et ajouter des redirections si on les renomme |
| `useCharacter` (localStorage) | Un seul personnage | Étendre : plusieurs personnages, style de jeu, élément |
| UI : `QuestMap.tsx` (~400 lignes), `FlowCanvas`, `SpellGuide`, `Nav` | Classes Tailwind écrites en dur, pas de jetons de design, styles de bouton et de champ recopiés d'un fichier à l'autre | **À restructurer** : système de design plus composants partagés |

### Problèmes visuels (UI)

| # | Problème | Où |
|---|---|---|
| 1 | **Texte illisible** : des nœuds de 220 px cadrés à ~60 % de zoom donnent du texte affiché autour de 8 px | Carte |
| 2 | Graphe orienté **de gauche à droite** : les longues chaînes deviennent des lignes très fines et laissent beaucoup de vide vertical | Carte |
| 3 | Une région mélange toutes ses chaînes sans les grouper. On ne voit pas où une histoire commence | Carte |
| 4 | Le panneau de détail **rétrécit la carte** au lieu de s'afficher par-dessus | Carte |
| 5 | Le formulaire de profil (5 champs) est **coincé dans l'en-tête de la carte** | Carte |
| 6 | Pas de jetons de couleur (gris et ambre bruts), police système, aucune icône : l'ensemble fait « outil d'administration » | Partout |
| 7 | Statut indiqué **seulement par la couleur** (pastille), textes de 10 à 11 px, gris secondaire en limite de contraste AA | Accessibilité |
| 8 | Sur téléphone, la carte est inutilisable (bandeau de 40 % de hauteur, canvas minuscule) | Mobile |
| 9 | La page des sorts affiche des états techniques internes (« État Paume Explosive Sobre ») et des effets apparemment doublés (branches Sobre/Saoul sans leur condition) | Sorts |

### Problèmes d'expérience (UX)

| # | Problème | Effet pour un nouveau joueur |
|---|---|---|
| 1 | **Aucun point d'entrée** : on arrive directement sur un graphe d'Incarnam | « Par où je commence ? » |
| 2 | Jargon : « Incertaine », « Condition brute », « Vue centrée », « Débloque ou modifie » | Incompréhensible |
| 3 | Liste de 44 régions **sans ordre de niveau** | Impossible de savoir où aller |
| 4 | Aucune progression par région, pas de « prochaines étapes » | Pas de sentiment d'avancer |
| 5 | Pas de création de personnage guidée (classe, niveau, style) | Le profil reste vide, donc beaucoup de quêtes « incertaines » |
| 6 | La page Classes est une encyclopédie, pas un outil qui dit « voici ton équipement » | Ne répond pas au vrai besoin |
| 7 | L'Almanax est exclu sans explication ; « En cours » n'est pas expliqué | Confusion |

---

## 3. Direction proposée

### 3.1 Navigation

Le brief propose 8 entrées. J'en recommande **4 au départ**, et les autres apparaissent quand elles existent vraiment : un lien vers une page vide fait plus de tort qu'un menu court.

| Entrée | Contenu | Aujourd'hui |
|---|---|---|
| **Accueil** | Fiche du personnage, progression globale, « Vos prochaines étapes », reprendre où on s'est arrêté | nouveau |
| **Progression** | Onglets : Quêtes (carte) · Succès · Dofus | Quêtes existe ; Succès et Dofus plus tard |
| **Personnage** | Onglets : Profil (plusieurs personnages) · **Builds** · Sorts | Sorts existe ; le reste est nouveau |
| **Équipement** | Encyclopédie des objets et panoplies | une fois les objets importés |

Les URL actuelles (`/quetes`, `/classes/9`) restent valides grâce à des redirections.

### 3.2 Identité visuelle

**Couleurs (jetons CSS `@theme`, thème sombre premium) :**

| Jeton | Valeur | Usage |
|---|---|---|
| `bg` | `#0B0E13` | fond |
| `surface` / `surface-2` | `#131821` / `#1A212C` | cartes, panneaux |
| `border` | `#253041` | contours discrets |
| `text` / `muted` | `#E7EAF0` / `#9AA4B2` | texte (contraste AA vérifié à l'implémentation) |
| `accent` | `#E9B44C` (or) | action principale, « disponible » |
| `done` | `#3FB57A` | terminé |
| `locked` | `#5B6575` | verrouillé |
| `check` | `#8B7CF6` | « À vérifier en jeu » (remplace « Incertaine ») |
| Éléments | Feu `#F26B3A` · Eau `#3BA4F5` · Terre `#B7884B` · Air `#45C986` · Neutre `#A0A8B4` | partout où un élément apparaît |

**Typographie :** *Sora* pour les titres (géométrique, une touche « jeu » sans tomber dans le médiéval) et *Inter* pour le texte. Les deux sont auto-hébergées avec `next/font`, donc aucune requête externe. Tailles minimales : 14 px pour le texte, 12 px pour les métadonnées.

**Icônes :** `lucide-react` pour l'interface (une seule dépendance, chaque icône se charge à la demande). Pour les sorts, objets et monstres, on peut utiliser les vraies images du jeu, présentes dans les archives de dofus-sqlite. ⚠️ Ce sont des visuels Ankama : c'est toléré pour un site de fan non commercial, mais ça reste un risque (voir §6).

**Composants partagés** (remplacent les classes recopiées) : `Button` (principal / secondaire / discret), `Card`, `StatusPill` (icône + texte, jamais la couleur seule), `ElementTag`, `ProgressBar`, `Drawer`, `Tooltip` + `Term` (glossaire : PA, PM, PO, Succès, Alignement…), `Stepper` (accueil guidé), `EmptyState`.

### 3.3 Carte des quêtes, version parcours

**a) Entrée « Monde » (nouvelle) :** une grille de cartes de régions **triées par niveau conseillé**, la médiane des niveaux de leurs quêtes (calculée depuis les données ✅). Chaque carte affiche :
- le nom et la tranche de niveaux, par exemple « Incarnam · niv. 1–10 » ;
- une barre de progression « 3 / 24 quêtes » et un badge « 5 disponibles » ;
- une mise en avant **« Recommandé pour vous »** si la tranche contient ton niveau et qu'il y a des quêtes disponibles.

Une vue « graphe global » façon N1ark pourra venir plus tard, en option pour les joueurs confirmés.

**b) Vue région :**
- **Groupée par chaîne** : chaque histoire (une composante connexe du graphe) devient une colonne lue **de haut en bas**, titrée par sa première quête et sa tranche de niveaux. Les quêtes isolées vont dans une liste « Quêtes indépendantes ».
- **Nœuds lisibles** : environ 260×72 px, texte de 14 px, pictogramme de statut (✓ terminée, ▶ disponible, 🔒 verrouillée, ? à vérifier). Le zoom ne descend jamais sous le seuil de lisibilité : on fait défiler plutôt que tout faire tenir.
- **Prérequis venus d'une autre région** : une étiquette cliquable « Requiert : *Destination Astrub* (Astrub) » au lieu d'un nœud grisé.
- **Liens** plus épais, en vert quand la quête source est terminée : on voit le chemin parcouru.

**c) Fiche quête :** un tiroir qui s'affiche par-dessus la carte, sans la rétrécir. Le texte est en langage simple :
- « **Pour la débloquer :** terminez *Décime-moi des bouftous*. »
- « **Ensuite, vous pourrez faire :** *Leçon d'humilité*. »
- « Le niveau 8 est conseillé, mais il n'est pas obligatoire. »

On y trouve un gros bouton « J'ai terminé cette quête », et la condition technique reste repliée dans « Détails techniques ».

**d) « Vos prochaines étapes »** (accueil et carte) :
- les quêtes **disponibles** dans ta tranche de niveau ;
- les quêtes **presque débloquées**, à qui il ne manque qu'une condition, avec laquelle.

**e) Types de contenu, en distinguant ce que disent les données et ce qui demande un travail éditorial :**

| Type | Source |
|---|---|
| Donjon | `isDungeonQuest` (344 quêtes) ✅ |
| Almanax, Avis de recherche, Événements, Temple, Alignement | catégories du jeu ✅ |
| Succès liés | conditions `OA` ✅ |
| Quêtes des Dofus | récompenses de quête, **à importer** |
| **Progression principale ou optionnelle** | ❌ **cette notion n'existe pas dans le jeu.** Ce sera une « route » rédigée et sourcée (couche C du rapport), affichée séparément des vrais prérequis |

### 3.4 Personnage et builds (priorité : l'équipement)

**Accueil guidé au premier lancement, en 4 écrans :** classe (cartes Crâ / Pandawa) → niveau → style de jeu (PvM solo, PvM groupe, PvP) → élément (avec une option « je ne sais pas encore »). On arrive ensuite sur l'Accueil, avec ses prochaines étapes. Il sera possible de créer plusieurs personnages.

**Onglet Builds :**
1. **Builds recommandés** : les builds partagés Fashionista filtrés par classe et par tranche de niveau, en ne gardant que ceux à jour (`solved_patch` = patch actuel, 3.7), triés par popularité. L'élément est **déduit des caractéristiques** du build. Le style PvM/PvP n'est filtrable que si le build a des tags : sinon on ne l'invente pas.
2. **Fiche build** :
   - les 14 emplacements d'équipement, rendus avec **nos** données d'objets (import d'`itemsdata` et des panoplies à ajouter) ;
   - les bonus de panoplie actifs ;
   - les **stats totales recalculées** (PA, PM, PO, caractéristiques, dommages, résistances) : c'est de l'addition, pas de l'optimisation ;
   - les sorts de l'élément du build ;
   - des boutons « Ouvrir dans Fashionista » (`back_url`), « Optimiser dans Fashionista » et « Simuler dans Dofus Builds ».
3. **Comparer** deux builds côte à côte, avec la différence de stats.
4. **Sauvegarder / partager** : enregistrement local et export au format `fashionista-build`, déjà documenté, donc importable directement dans Fashionista.
5. **Budget** : non affiché tant qu'aucune source de prix fiable n'existe (voir §1).

Les sorts restent accessibles dans « Personnage → Sorts ». On corrige leur page : masquer les états internes et regrouper les effets des branches Sobre/Saoul sous leur condition.

### 3.5 Pour les débutants

- Accueil guidé (§3.4) et panneau « prochaines étapes » (§3.3 d).
- Glossaire en infobulles, par exemple : **PA** = Points d'Action, ce qui limite le nombre de sorts par tour.
- Des phrases plutôt que des codes, partout où c'est possible.
- Les filtres avancés (catégories, vue graphe, condition brute) restent présents, mais repliés.

---

## 4. Le nom

| Nom | `.com` | `.fr` | Avis |
|---|---|---|---|
| Krosma | **enregistré** | libre | ⚠️ Très proche des marques Ankama *Krosmaster* et *Krosmaga* |
| KrosPath | libre | non vérifié | ⚠️ Même famille *Kros-*, peut être confondu avec un produit Ankama |
| KrosGuide | libre | non vérifié | ⚠️ idem |
| Krosmos | libre | non vérifié | ⚠️ Quasi homonyme du *Krosmoz* d'Ankama |
| Dofus Atlas | **enregistré** | libre | ⚠️ Contient la marque *Dofus* (courant chez les sites de fans, mais à éviter pour un nom propre) |
| Adventia | **enregistré** | non vérifié | Générique, aucun lien avec Dofus |
| **Atlas des Douze** | non vérifié | **libre** | ✅ Référence au « Monde des Douze » de l'univers sans reprendre un nom de produit, et dit ce que fait l'outil. ⚠️ Absence de marque déposée non vérifiée |

Vérification faite via les registres officiels (RDAP Verisign pour le `.com`, AFNIC pour le `.fr`). **La recherche de marques déposées (INPI, EUIPO) n'est pas faite.** Elle est indispensable avant de choisir. Le nom actuel reste en place tant qu'on n'a pas validé le nouveau.

---

## 5. Plan de mise en œuvre (après validation)

| Étape | Contenu | Critère de fin |
|---|---|---|
| 1. Système de design | Jetons de couleur, polices, composants partagés, `lucide-react` | Les pages existantes utilisent les composants, sans régression |
| 2. Navigation et Accueil | Nouvelle navigation, page Accueil, redirections des anciennes URL | Les anciennes URL fonctionnent toujours |
| 3. Carte des quêtes | Vue Monde, chaînes de haut en bas, tiroir de fiche, prochaines étapes | Un nouveau joueur trouve sa première quête en moins de 3 clics ; tests du moteur toujours verts |
| 4. Personnage | Accueil guidé, plusieurs personnages, style de jeu et élément | Parcours complet : création → prochaines étapes |
| 5. Builds | Import des objets et panoplies, builds Fashionista filtrés, fiche build avec stats, comparaison, export | Builds réels uniquement, chacun avec sa source et son patch |
| 6. Mobile et accessibilité | Mise en page responsive, contraste AA, navigation au clavier | Utilisable sur un écran de 375 px |

Chaque étape fera l'objet d'un commit séparé et d'une vérification dans le navigateur.

## 6. Risques

| Risque | Parade |
|---|---|
| Images du jeu (icônes) | Site non commercial, mention « non affilié à Ankama », retrait facile |
| Fashionista change ou limite son API | Cache serveur, liens de secours, et prévenir les mainteneurs avant la mise en ligne |
| Builds partagés de mauvaise qualité | Filtrer par patch et par popularité, afficher la source, ne jamais présenter un build comme « optimal » |
| Import des objets (`itemsdata` fait 99 Mo) | Même méthode que pour les sorts : lu une fois, filtré, puis relâché |
| Marque du nom choisi | Recherche INPI/EUIPO avant adoption |

## 7. Décisions à prendre

1. Navigation : **4 entrées au départ** (recommandé) ou les 8 du brief tout de suite ?
2. Direction visuelle (§3.2) : validée telle quelle ou à ajuster ?
3. Nom : on part sur **Atlas des Douze**, on garde un *Kros-* malgré le risque, ou on cherche encore ?
4. D'accord pour ajouter `lucide-react` et importer les données d'objets ?
5. Icônes du jeu (sorts, objets) : oui ou non, vu le risque de propriété intellectuelle ?

---

### Sources
[Dofus Fashionista](https://dofusfashionista.gg/) (API `/api/v1/`, schéma d'import, robots.txt) · [DofusFashionistaVanced](https://github.com/Trameur/DofusFashionistaVanced) · [Dofus Creator, notes de version](https://dofuscreator.com/notas-versao?lang=en) · [DofusBook](https://dofusbook.net/) · [JOL, DofusBook](https://dofus.jeuxonline.info/actualite/55254/dofusbook-jol-dofus-associent) · [Gamosaurus, guide DofusBook](https://www.gamosaurus.com/jeux/dofus/dofus-dofusbook-les-outils-pour-son-stuff-tips-et-astuces) · [Dofus Builds](https://dofusbuilds.com/) · [N1ark](https://dofus.n1ark.com/) (observé dans le navigateur) · RDAP [Verisign](https://rdap.verisign.com/) et [AFNIC](https://rdap.nic.fr/)
