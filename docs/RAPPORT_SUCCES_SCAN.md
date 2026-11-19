# Suivi des succès et scan de progression

*2026-11-19. Légende : ✅ testé pour de vrai · ⚠️ limite connue · ❌ impossible ou écarté.*

## 1. API officielles d'Ankama

- ❌ **Je n'ai trouvé aucune API officielle qui donne la progression personnelle** (quêtes, succès d'un personnage). `developer.ankama.com` n'existe pas (DNS). Les pages personnages de dofus.com refusent les requêtes automatiques (403). Je n'ai donc rien construit dessus et je n'ai rien contourné.
- **DofusDB** (`api.dofusdb.fr`) n'expose que des données de jeu, vérifié :
  - succès : 2 777 ;
  - objectifs : 8 936 ;
  - catégories : 134 ;
  - quêtes : 1 984.

  Format Feathers (`total / limit / skip`), 50 résultats au maximum par page (même avec `$limit=500`). Aucune documentation, aucune limite de débit publiée, aucune donnée de compte ou de personnage. Nous avons déjà ces données à jour, et mieux structurées, via l'import des fichiers du jeu. DofusDB n'apporte donc rien de plus pour l'instant.
- **Mazakiel « Progression Dofus »** (étudié, code non copié : le dépôt n'a pas de licence) :
  - données DofusDB téléchargées par lots de 50, avec cache disque ;
  - progression dans le stockage du navigateur, plus une synchronisation Firebase optionnelle ;
  - export JSON ;
  - « Que faire maintenant ? » : un score pondéré (objectif en cours, quêtes débloquées, Dofus, écart de niveau…) avec les raisons affichées.

  Repris ici : l'idée d'afficher **la raison** de chaque suggestion et de privilégier ce qui est presque fini.

## 2. Synchronisation en temps réel : possible ?

**Non, pas de façon automatique et sûre.** Sans API officielle, les seules voies « temps réel » seraient :
- lire la mémoire du client ;
- intercepter le trafic réseau ;
- injecter du code dans le jeu.

Ces trois techniques sont exactement celles qu'Ankama sanctionne. Je n'ai rien implémenté de ce genre.

Ce que dit Ankama (page lue dans le navigateur, *support.ankama.com, « Qu'est-ce qu'un bot ? »*) : un bot est un programme qui « automatise des actions en jeu ». C'est interdit, et la sanction est le bannissement définitif de tous les comptes. ⚠️ **La page ne dit rien des captures d'écran ni de l'OCR.** Notre approche n'automatise aucune action et ne touche pas au client. Elle se contente de lire une image que le joueur fournit lui-même : c'est la plus prudente possible. Ce n'est pas pour autant une autorisation écrite d'Ankama : à confirmer auprès de leur support avant une mise en ligne publique.

## 3. Ce qui est implémenté : le scan assisté (approches B et D)

Page **Progression, Scanner** (`/progression/scan`) :
1. Le joueur indique ce que montre sa capture : quêtes terminées, quêtes en cours, ou succès obtenus.
2. Il ajoute une ou plusieurs images de trois façons :
   - **« Capturer la fenêtre Dofus »** : le navigateur demande quelle fenêtre partager, une seule image est prise et le partage s'arrête aussitôt ;
   - choix de fichiers ;
   - **Ctrl+V** d'une capture (Win+Maj+S).
3. L'OCR (Tesseract.js, modèle français) tourne **dans le navigateur** : l'image n'est envoyée nulle part. Avant la lecture, l'image est agrandie, passée en gris et inversée si le fond est sombre. Cela fonctionne quelle que soit la résolution ou l'échelle d'interface.
4. Chaque ligne lue est comparée aux noms du jeu (`src/recognize.ts`, testé) :
   - correspondance exacte, puis approchée ;
   - colonnes « niv. 12 » et « 3/4 » ignorées ;
   - noms coupés sur deux lignes recollés ;
   - doublons entre captures comptés une fois ;
   - noms partagés par plusieurs éléments signalés ;
   - en dessous de 80 % de similarité, rien n'est proposé.
5. **Écran de vérification** :
   - pour chaque ligne : nom reconnu, texte lu, confiance en % ;
   - seuls les noms lus à 90 % ou plus, sans ambiguïté, sont pré-cochés ;
   - les **prérequis déduits** sont dans un encadré séparé, jamais pré-cochés ;
   - boutons « Enregistrer » et « Tout rejeter ».
6. Rien n'est enregistré sans confirmation. Chaque enregistrement entre dans l'**historique** avec sa source, et peut être **annulé**.

**Application Windows : pas nécessaire.** Le navigateur sait déjà capturer une fenêtre (`getDisplayMedia`) et faire tourner l'OCR localement (WebAssembly). Une application Tauri ou Electron n'apporterait qu'une capture « en un raccourci clavier », au prix d'un installeur, de mises à jour et d'un logiciel de plus qui tourne à côté du jeu. Elle se justifierait seulement si les joueurs trouvent l'étape du partage de fenêtre trop pénible.

## 4. L'OCR est-il fiable ?

**Mesuré, mais seulement sur des images synthétiques** ✅. On a dessiné de vraies listes de quêtes en texte clair sur fond sombre, avec une colonne de niveau, en deux polices, à 10, 12, 14 et 18 px, en PNG et en JPEG compressé. Le tout est passé par le vrai pipeline de la page.

| Mesure | Résultat |
|---|---|
| Noms retrouvés | **317 / 318** (99,7 %) |
| Mauvaises correspondances | **0** |
| Pré-cochés à tort | **0** (sur 265 pré-cochés) |
| Temps par capture | 0,4–0,7 s (après ~2 Mo de modèle au premier usage) |

Sur ce banc, le JPEG et la plus petite taille sont les cas les plus difficiles : moins de noms pré-cochés, car la confiance baisse, mais **aucune erreur**.

⚠️ **Je n'ai pas pu tester de vraies captures de Dofus** : je n'ai pas accès au jeu. La police du jeu, les icônes, les dégradés et la transparence peuvent dégrader ces chiffres. La prochaine étape indispensable : 10 à 20 vraies captures (fenêtre Quêtes, onglet terminées ; fenêtre Succès), à différentes résolutions. Avec elles, je pourrai mesurer, régler le prétraitement et ajouter un test sur ces images.

⚠️ L'OCR reconnaît un **nom**, pas un **état** : sur une capture, il ne voit pas une coche verte. C'est le joueur qui dit ce que montre la liste (« quêtes terminées », etc.).

## 5. Ce que fait maintenant le suivi des succès

- **Tableau de bord** :
  - total, obtenus, **à confirmer**, en cours, restants, %, points ;
  - progression de chacune des 15 grandes catégories ;
  - « Presque terminés » avec la raison (« 3/4 objectifs ») ;
  - « Derniers obtenus », d'après l'historique.
- **Liste** : catégories et sous-catégories, filtre par état, recherche dans les 2 777 succès.
- **Fiche d'un succès** : description, niveau, points, Dofus associé, **récompenses** (2 775 succès, nouvel import) et **guide DPLN** (334 succès, même règle que les quêtes : titre identique).
- **Objectifs suivis un par un** (8 936) :
  - **Déduit** : la condition officielle est vérifiée d'après les quêtes, succès et niveau du personnage. C'est le cas d'environ 4 800 objectifs dont la condition est une quête, un succès, un niveau ou des points ;
  - **Coché** : par le joueur ;
  - **À faire** ;
  - **À vérifier** : monstres tués, objets possédés… seul le jeu le sait.
  - Chaque objectif lié à une quête ou à un succès est un lien vers elle ou lui.
- **Un succès n'est jamais marqué obtenu tout seul.** Quand tous ses objectifs sont remplis, il passe en « Objectifs remplis : à confirmer » et le joueur valide d'un clic.
- **Provenance** de chaque élément obtenu : coché à la main, importé, capture d'écran confirmée, ou prérequis confirmé, avec la date. L'état « déduit » n'est jamais enregistré : il est recalculé.
- Tout est lié au **personnage sélectionné** et synchronisé avec le compte (validé côté serveur, 200 entrées d'historique au maximum).

## 6. Reconnu automatiquement ou à confirmer

| Information | Comment |
|---|---|
| Noms de quêtes et de succès visibles à l'écran | OCR, **puis confirmation** |
| Prérequis obligatoires des quêtes reconnues | **Déduits**, montrés à part, à cocher |
| Objectifs basés sur quêtes, succès, niveau, points | **Déduits** en continu |
| Objectifs de combat, d'objets, d'exploration | **À cocher** par le joueur |
| Succès dont tous les objectifs sont remplis | **À confirmer** par le joueur |
| Dofus obtenus | Déduits de la quête ou du succès qui les donne (page Dofus) |

## 7. Tests

- `npm test` : **58 / 58**. Nouveaux :
  - objectifs et états des succès (jamais « obtenu » sans confirmation) ;
  - correspondance OCR : bruit, colonnes, lignes coupées, doublons, noms partagés, faux positifs ;
  - validation de l'historique côté serveur.
- Typecheck : 0 erreur. Build de production : OK. **Test de fumée : 23 / 23** (avec la page Scanner, l'API des succès enrichie et l'index des objectifs).
- **Navigateur** :
  - cocher les objectifs, puis « à confirmer », confirmer, « Derniers obtenus » et provenance ;
  - scan d'une capture : 4 noms reconnus et pré-cochés, 5 prérequis déduits non cochés, enregistrement, annulation depuis l'historique ;
  - OCR en production ;
  - aucune erreur dans la console.
- Banc OCR synthétique : voir la section 4.

## 8. Ce qui reste à faire

1. **Vraies captures de Dofus** pour mesurer et régler l'OCR (bloquant pour annoncer une fiabilité).
2. **Confirmer auprès d'Ankama** que la lecture de captures fournies par le joueur est acceptable.
3. Le modèle OCR (~2 Mo) et le moteur sont chargés depuis le CDN de Tesseract au premier usage. Pour ne dépendre d'aucun tiers, on peut les héberger nous-mêmes (≈ 10 Mo dans `public/`).
4. Recommandations « Que faire maintenant ? » à étendre à l'accueil : succès presque finis et donjons à portée, avec un score à la Mazakiel.
5. Donjons et exploration : leurs succès sont suivis, mais il n'y a pas encore de vue dédiée.
6. Historique : seules les 8 dernières entrées sont visibles dans la page Scanner. Il faudrait une page complète.
