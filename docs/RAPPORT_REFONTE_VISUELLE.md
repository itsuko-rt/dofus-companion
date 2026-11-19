# Refonte visuelle « Monde des Douze »

*2026-11-19. Point de sauvegarde : tag git `checkpoint-before-redesign`.*

## 1. Ce que j'ai relevé sur dofus.com

Relevé sur `/es/mmorpg/descubrir` et sur les pages de classes `/fr/mmorpg/encyclopedie/classes/9-cra` et `12-pandawa`, avec les styles mesurés dans le navigateur. Les cookies non essentiels ont été refusés.

| Élément | Constat |
|---|---|
| Typographie | **Rowdies** (titres arrondis, en capitales) et **Roboto** (texte). Ce sont deux polices libres (SIL OFL), donc réutilisables légalement. |
| Couleurs | Sections de nuit chaudes (brun-noir texturé, sarcelle profonde, indigo) qui alternent avec des scènes illustrées. Boutons d'action **verts** (`#89b820`). Texte des encarts « papier » brun (`#5b360e`). |
| Composition | Bandeaux pleine largeur avec illustration à droite et texte à gauche, titres en capitales avec ombre portée. |
| Marqueurs | Rôles de classe en **losanges** colorés (Dégâts rouge, Entrave, Amélioration bleu…). |
| Navigation | Barre sombre, liens en capitales, bouton vert à droite. |

Je n'ai pas copié la structure des pages : j'en ai tiré un langage visuel, adapté à une application d'outils.

## 2. Principaux changements visuels

- **Palette** : nuit chaude (bruns, jamais de noir pur), or pour « disponible », vert pour les actions, et **une teinte par section** :
  - quêtes : sarcelle ;
  - succès : ambre ;
  - builds : indigo ;
  - personnages : couleur de la classe ;
  - scan : bleu profond ;
  - compte : prune.
- **Parchemin** : la classe `.parchment` redéfinit localement les mêmes jetons (texte, bordures, états). Les composants existants deviennent de l'encre sur papier sans être réécrits. Elle est utilisée pour le **journal des succès**, la **fiche de quête** (un parchemin qui glisse sur la carte) et les succès de l'accueil.
- **Texture** : grain de papier et vignettage chaud en CSS pur, sans image téléchargée.
- **Boutons principaux** verts, en Rowdies capitales, avec un bord inférieur « enfoncé ». Le blanc sur `#5a840c` atteint un contraste d'au moins 4,5:1, alors que le vert officiel `#89b820` n'y arrive pas avec du blanc.
- **Bandeaux de page** (`PageHero`) sur Succès, Dofus, Builds, Équipement, Personnage, Sorts, Scanner et Compte : couleur de section, scène de classe quand elle s'y prête, titre en capitales.
- **Accueil** : le personnage dans sa scène de classe, son portrait, deux jauges (quêtes, succès), puis « Objectifs du moment », les régions conseillées, des raccourcis à losange, les succès presque terminés et les derniers obtenus.
- **Classes** : cartes illustrées (portrait officiel, titre et **rôles officiels** en losanges) dans la création de personnage et dans « Classes et sorts ».
- **Dofus** : icône de chaque œuf, désaturée tant qu'il n'est pas obtenu.
- **Carte des quêtes** : même graphe et mêmes commandes. Nœuds légèrement en relief, titre dans la police d'affichage, fiche en parchemin.

## 3. Composants refaits ou créés

- **Refaits** :
  - `Nav` (barre, losange de marque, soulignement vert, puce du personnage avec portrait) ;
  - `ProgressionTabs` et `PersonnageTabs` (capitales, icônes, couleur de section) ;
  - `ui.tsx` : `Button`, `Card` (variante `paper`), `ProgressBar` (dégradé animé), `Drawer` (parchemin, entrée animée).
- **Nouveaux** :
  - `PageHero`, `Diamond`, `SECTION` (dans `ui.tsx`) ;
  - `ClassCard` ;
  - `useAchievementProgress`, sorti de la page Succès pour être partagé avec l'accueil.
- **Pages** : accueil, succès, Dofus, builds, équipement, personnage, sorts (index et classe), scanner, compte.

## 4. Illustrations et icônes

| Élément | Source | Fichiers |
|---|---|---|
| Scènes de classe (Crâ, Pandawa) | `static.ankama.com/…/breeds/assets/breeds/bg{id}.jpg` (pages de classes officielles) | 2 |
| Portraits de classe | `static.ankama.com/…/breeds/assets/avatar/{id}.jpg` | 2 |
| Icônes des Dofus | `api.dofusdu.de/dofus3/v1/img/item/{iconId}-128.png` (images du jeu) | 31 |

- Elles sont téléchargées par **`npm run assets`** dans `public/ankama/`, **exclu de git** : elles ne sont jamais publiées avec le code. Un `manifest.json` note la source et la date de chaque fichier.
- **Aucun lien direct** vers ces serveurs depuis le site.
- **Sans ces fichiers, l'application fonctionne** : les couleurs remplacent les images manquantes.
- ⚠️ **Propriété intellectuelle** : ces illustrations sont © Ankama. Leur usage ici est celui d'un site de fan, non affilié. J'ai gardé notre propre nom et notre marque (« Atlas des Douze »), sans logo DOFUS ni Ankama, ni rien qui puisse faire passer le site pour un produit officiel, et la mention de non-affiliation reste. Avant une mise en ligne publique, il faut vérifier les conditions d'Ankama pour les sites de fans. Leur **press kit** (lien en bas de dofus.com) est la source la plus sûre.

## 5. Performance

Je n'ai rien optimisé de plus : cette refonte **ajoute** du poids, et voici combien (mesuré en production) :
- accueil : **858 Ko** transférés au total ;
- illustrations : 278 Ko, dont 213 Ko pour la seule scène du Crâ ;
- polices : 71 Ko, hébergées par l'application elle-même (`next/font`), sans requête vers Google ;
- page chargée en ~1 s en local.

La texture est en CSS (0 octet d'image). Les icônes des Dofus sont chargées en différé. Gain possible : convertir les scènes en WebP (≈ −60 %).

## 6. Fonctionnalités vérifiées après la refonte

- `npm test` : **58 / 58**, typecheck 0 erreur, build de production OK, **test de fumée 23 / 23**.
- Navigateur, bureau :
  - accueil, carte des quêtes (graphe, fiche, lien direct vers une quête), succès (dépliage, objectifs, contraste sur parchemin) ;
  - Dofus (icônes), classes et sorts, builds, personnage, compte, scanner.
- Mobile (375 px) : accueil et succès, sans défilement horizontal.
- Aucune erreur dans la console en production.
- **Bug corrigé** : `/personnage/sorts` renvoyait une erreur 500. La carte de classe passait un gestionnaire d'événement depuis un composant serveur ; elle est maintenant un composant client.
- **Bug corrigé** : le sous-titre des sorts utilisait une classe CSS inexistante (`text-text0`).
- J'ai aussi supprimé mon personnage de test « Import test », que la synchronisation du compte avait rapatrié.

## 7. Limites restantes

- Seuls le Crâ et le Pandawa ont leurs illustrations. Les autres classes ne sont pas encore prises en charge par l'application.
- Pas d'icônes pour les autres objets (builds, équipement) : il faudrait télécharger ~21 000 icônes ou faire des liens directs, ce que tu as exclu. Le mieux serait de ne télécharger que celles qui sont affichées.
- Aucune illustration de monstres, de donjons ni de décors du monde : je n'ai pas trouvé de source officielle dont l'usage soit clairement permis. Je n'ai pas mis d'images génériques à la place.
- Animations volontairement sobres (entrées, survols, barres de progression), désactivées si le système demande de réduire les animations. Pas de transition entre les pages.
- Nouvelles pages non vérifiées sur tablette.
