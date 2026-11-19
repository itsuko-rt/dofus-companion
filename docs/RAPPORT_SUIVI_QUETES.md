# Refonte du suivi des quêtes (inspirée de N1ark)

*2026-11-19. Point de sauvegarde avant la refonte : tag git `checkpoint-before-tracker`.*

## Ce que j'ai repris de N1ark

J'ai étudié [dofus.n1ark.com](https://dofus.n1ark.com/) dans le navigateur, avec son aide intégrée. Le dépôt GitHub ne contient qu'un README minimal ; c'est une application Svelte.

Repris :
- un écran unique avec un menu latéral ;
- les commandes à la souris : clic pour les détails, clic droit pour « terminée », Maj ou Ctrl + clic droit pour terminer avec les prérequis ;
- « cacher les tâches finies » ;
- le filtre par niveau et le repli des catégories ;
- les profils indépendants et la sauvegarde exportable.

Différence volontaire : N1ark montre le monde entier sur une seule toile. Ici, on affiche une région à la fois, comme demandé (« d'abord la région »), mais sans recharger la page.

## 1. Ce qui a changé

| Avant | Après |
|---|---|
| Deux pages : grille de régions, puis carte d'une région | **Un seul écran de suivi** : régions à gauche, filtres et progression en haut, graphe au centre, fiche à droite. Changer de région ne recharge pas les données |
| Un seul graphe par région, parfois très large (Astrub : 4 600 px, Frigost : 11 000 px) | **Chaque chaîne de quêtes dans son propre cadre repliable**, cadres rangés par niveau. Les quêtes indépendantes sont regroupées. Les quêtes nombreuses débloquées par une même quête sont rangées **en grille** (par exemple les quêtes de classe d'Astrub). Astrub passe à 1 540 px, Frigost à 5 060 px |
| Nœuds de 248 × 72 | **Nœuds compacts de 204 × 54** : statut, nom, niveau, badge Dofus, prérequis d'une autre région |
| Sélection : simple contour | **La quête choisie, ses prérequis et ses suites restent visibles, le reste s'estompe** |
| Terminer une quête : bouton dans la fiche | + **clic droit**, **Maj ou Ctrl + clic droit** (avec les prérequis), **annuler** (bandeau ou Ctrl+Z) |
| Pas de filtres sur la carte | **Barre de filtres** : recherche dans toutes les régions, niveau, classe, statut, « masquer les terminées », « jusqu'à mon niveau » |
| — | **Tableau de progression** compact : quêtes, terminées, disponibles, en cours, verrouillées, % (hors annexes), plus la progression de la région |
| « Je l'ai commencée » sans effet visuel | Statut **En cours** visible sur le graphe (bleu, icône minuteur) |
| — | **Sauvegarde** : export et import JSON de tous les personnages (page Personnages) |

**Groupes du menu latéral :**
- Régions ;
- Dimensions divines ;
- Alignement ;
- Quêtes spéciales ;
- Annexes et événements (Almanax, avis de recherche, îles saisonnières, Temporis).

Les catégories viennent des données du jeu. Le classement en groupes est documenté dans `src/regions.ts`, car le jeu ne le fournit pas.

## 2. Bugs corrigés

1. Le **balisage du jeu** s'affichait dans les textes : `{{ui,…::localisation d'objectif}}` dans 20 étapes de quête et 67 sorts. Il est maintenant nettoyé (`cleanGameText`, testé).
2. Les **chaînes très larges** obligeaient à dézoomer jusqu'à rendre le texte illisible : voir le tableau ci-dessus.
3. **Ouvrir une quête d'une autre région rechargeait toute la page.** Le passage se fait maintenant par la navigation de l'application.
4. **Les retours sur une action étaient incohérents** : un clic dans la fiche et un clic droit sur le graphe ne passaient pas par le même code. Les deux utilisent maintenant le même chemin, avec annulation.

## 3. Nouvelles fonctionnalités

- Écran unique de suivi, menu latéral repliable (un tiroir sur mobile) et sélecteur de profil.
- Graphe : cadres de chaînes repliables (l'état est mémorisé par région), mise en évidence des prérequis et des suites, minicarte, zoom, bouton « tout afficher », recentrage sur une quête trouvée par la recherche.
- Clic droit, Maj ou Ctrl + clic droit, annulation.
- Fiche : niveau, région, **succès liés**, bouton **« Terminer avec ses prérequis »**, bouton **« Lire le guide complet »** (uniquement s'il existe un lien DPLN au titre identique, jamais inventé).
- Filtres et tableau de progression. Les préférences (filtres, groupes repliés) sont gardées dans le navigateur.
- Sauvegarde et restauration JSON, validées à l'import. Un fichier qui ne vient pas de ce site est refusé.
- Vérification des données : `validateGraph` détecte les références vers une quête inconnue et les cycles de prérequis. Sur les vraies données, il n'y a **aucune référence manquante et aucun cycle** (test).

## 4. Limites restantes

- **Frigost (5 060 px) et Vulkania (4 300 px)** restent larges : une quête de Frigost exige 29 autres quêtes, sur plusieurs branches réelles. L'écran s'ouvre donc sur le début de la chaîne, à une taille lisible, et la minicarte permet de se déplacer. Les flèches vers ces quêtes à nombreux prérequis sont estompées tant qu'on ne les sélectionne pas.
- **Ordre des prérequis au choix** : avec Maj + clic droit, si une quête accepte « l'une ou l'autre » et qu'aucune n'est faite, **seule la première** est marquée. Ces choix sont souvent exclusifs en jeu, donc je n'en marque jamais plusieurs.
- **Almanax** : les 390 quêtes sont dans « Annexes et événements ». Il n'y a pas de calendrier jour par jour comme chez N1ark : nos données ne lient pas chaque quête à une date.
- Le graphe n'est pas utilisable au clavier nœud par nœud. Au clavier, on passe par la recherche, la fiche et la liste des prérequis.
- Les régions affichent au plus ~230 quêtes. Le rendu complet reste fluide (disposition < 50 ms), donc je n'ai pas activé le rendu partiel : il faussait le cadrage initial.

## 5. Comment tester

```sh
npm test                                   # 48 tests (dont disposition, prérequis, validation sur les vraies données)
npm run typecheck
node scripts/layout-report.ts              # largeur des chaînes par région
npm run dev                                # puis http://localhost:3000/progression/quetes
```

Dans l'application :
1. Faites un clic droit sur une quête : elle passe en vert. Ctrl+Z : elle revient.
2. Faites Maj + clic droit sur une quête en bas d'une chaîne : toute la chaîne au-dessus est terminée, et le bandeau indique le nombre de prérequis.
3. Cochez « Masquer les terminées » : les cadres se réorganisent. Choisissez le statut « Disponibles » : le reste s'estompe.
4. Cliquez le titre d'un cadre pour le replier. L'état est conservé après rechargement.
5. Recherchez « frigost » et cliquez un résultat : la région change et la quête est centrée et ouverte.
6. Allez dans Personnages, puis Sauvegarde : exportez, puis réimportez le fichier.
7. Changez de profil dans le menu latéral : la progression affichée change.

**Vérifié pour de vrai** : chacun de ces 7 points dans le navigateur, le mobile (375 px, tiroir des régions), le build de production, le test de fumée **22/22** et aucune erreur dans la console.
