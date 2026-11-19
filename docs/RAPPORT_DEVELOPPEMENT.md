# Rapport de développement autonome

*Session du 2026-11-19. Commits `340e916` → `58211a8` (+ ce rapport). Données du jeu : 3.7.14.18.*
Légende : ✅ testé pour de vrai · ⚠️ limite connue · ⛔ bloqué (demande ton intervention).

## 1. État du projet

| | Avant cette session | Après |
|---|---|---|
| Quêtes | Carte par régions, chaînes, fiche avec conditions | + description, PNJ et zone de départ, objectifs, récompenses, **tutoriel DPLN**, quêtes débloquées après validation, badge Dofus ✅ |
| Succès | Utilisés seulement comme conditions | **Page dédiée** : catégories, recherche, points, cases « obtenu » ✅ |
| Dofus | — | **Page dédiée** : 34 Dofus, quête ou succès source, statut ✅ |
| Équipement | — | **Encyclopédie** : recherche, type, « portable à mon niveau », effets officiels ✅ |
| Builds | 20 builds Fashionista, filtre élément | **40 Crâ / 38 Pandawa** (22 / 19 à jour 3.7 au lieu de 2 / 1), tris, emplacements, sorts conseillés, **enregistrement dans le personnage**, build actuel ✅ |
| Personnages | Plusieurs personnages locaux | + notes, builds enregistrés, bilan ; **synchronisés avec le compte** ✅ |
| Comptes | — | **Inscription, connexion, déconnexion, mot de passe oublié**, sessions sécurisées ✅ |
| Nom | Écrit en dur | **Configurable** dans `src/brand.ts` ✅ |

## 2. UI / UX

- **Navigation** (9 sections demandées, sans surcharger le menu) : Accueil · Progression (onglets **Quêtes / Succès / Dofus**) · Builds · Équipement · Personnages · Compte. Les anciennes URL redirigent (`/quetes`, `/classes/*`, `/personnage/builds`).
- **Système de design** : jetons de couleur, avec en plus des **couleurs de classe** (Crâ vert, Pandawa ocre) et le **badge Dofus**. Les statuts sont toujours indiqués par une icône et un texte, jamais par la couleur seule. Les couleurs des éléments restent cohérentes partout.
- **Fiche de quête** : un vrai guide, dans cet ordre : texte de quête, « Pour commencer : parlez à *PNJ* (*zone*) », étapes et objectifs, récompenses, « Besoin d'aide pour cette quête ? » avec le lien vers le tutoriel. Après « J'ai terminé », un encadré affiche **« Nouvelles quêtes débloquées »**.
- **Rareté des objets** : non affichée. Les données de Dofus 3 n'en définissent pas, et je n'en ai pas inventé.

## 3. Tutoriels Dofus Pour Les Noobs

- **Méthode** : le sitemap public de DPLN (2 509 pages, autorisé par son `robots.txt`). Une quête reçoit un lien **uniquement si une page porte exactement le même titre**. Les titres ambigus sont ignorés plutôt que devinés (`src/guides.ts`, testé).
- **Résultat** : **1 390 quêtes sur 1 984** ont un lien. Échantillon vérifié : 5 sur 5 répondent 200 avec le bon titre.
- **Stockage** : table `external_guide` (site, URL, langue, statut `auto_title_match`, date de vérification), extensible à d'autres sites.
- **Sans lien** : la fiche affiche « Aucun tutoriel au titre identique n'a été trouvé ». Pas de lien vers la page d'accueil.
- ⚠️ Une page de même titre peut, en théorie, traiter d'autre chose. La fiche indique donc « lien trouvé automatiquement ». Une validation manuelle pourrait passer le statut à `verified`.
- Aucun contenu DPLN n'est copié : les CGU l'interdisent, on se contente de **lier**.

## 4. Character Builder

| Source | Résultat |
|---|---|
| **Dofus Fashionista** | API publique en lecture seule ✅ : tier-list et builds partagés récents. Chaque build fournit la liste exacte de ses objets. Le cache serveur d'une heure limite la charge sur leur site. |
| Dofus Creator, DofusBook, Dofus Builds | Pas d'API ; DofusBook est protégé par Cloudflare. → Liens sortants uniquement, sans contournement. |

- **Filtres** : classe, niveau, élément. **Tris** : meilleure correspondance, « j'aime », vues, mise à jour.
- **Affichés comme indisponibles**, plutôt qu'inventés : budget, prix, dégâts vérifiés, style de jeu (PvM/PvP), version autre que Dofus 3.
- ⚠️ Les stats sont indicatives : objets au jet maximal, panoplies, points et parchemins. Les montures ne sont pas comptées.

## 5. Comptes

- **Base séparée** `data/app.sqlite`, avec migrations numérotées. L'import des données du jeu ne la touche jamais.
- **Mots de passe** : hachage scrypt (`node:crypto`, aucune dépendance ajoutée), comparaison en temps constant.
- **Sessions** : jeton aléatoire de 256 bits, stocké **haché** (SHA-256), dans un cookie `HttpOnly`, `SameSite=Lax`, avec `Secure` en HTTPS. Durée : 30 jours.
- **Protections** :
  - contrôle de l'origine sur toutes les requêtes qui modifient des données (CSRF) ;
  - limite de 8 échecs de connexion par e-mail et adresse IP sur 15 minutes ;
  - temps de réponse identique, que le compte existe ou non ;
  - réponse identique à « mot de passe oublié » dans les deux cas ;
  - lien de réinitialisation à usage unique, valable 1 heure, qui déconnecte toutes les sessions.
- **Personnages** : toutes les requêtes sont filtrées par utilisateur, les données reçues sont validées, et une version plus récente enregistrée depuis un autre appareil est détectée (code 409). Les personnages locaux sont envoyés sur le compte à la connexion, puis chaque changement est enregistré automatiquement.
- ⛔ **E-mail** : aucun fournisseur SMTP n'est configuré. Le lien de réinitialisation est donc **écrit dans le journal du serveur** (`[password reset] …`). Pour envoyer de vrais e-mails, il faudra un service (Resend, Brevo, SMTP…) et ses identifiants.

## 6. Qualité technique

- **Bugs corrigés** :
  - élément d'un build faussé par les parchemins ;
  - îles saisonnières recommandées au niveau 1 ;
  - marqueur `[challenge,N]` visible dans les succès ;
  - liens de navigation sans nom accessible sur mobile ;
  - liaison objet → effet cassée dans le JSON de dofus-sqlite (corrigé en passant par dofusdude).
- **Nettoyage** : ancienne vue région supprimée (remplacée), nom centralisé dans `src/brand.ts`, modèle de personnage partagé entre navigateur et serveur (`src/character.ts`).
- **Performance mesurée** (build de production) :
  - graphe : 851 Ko → **131 Ko** compressé, 32 ms ;
  - fiche de quête : 5 ms ;
  - recherche d'objets : 12 ms ;
  - builds : 1 s au premier appel, puis **20 ms** grâce au cache.
  Je n'ai pas fait d'optimisation à l'aveugle : aucun goulet n'a été mesuré au-delà.
- **Sécurité HTTP** : `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy et Permissions-Policy sur toutes les réponses.
- **Dépendances ajoutées** : aucune. Les comptes reposent sur `node:crypto` et `node:sqlite`, déjà disponibles.

## 7. Tests

| Vérification | Résultat |
|---|---|
| Tests unitaires et d'intégration (`npm test`) | ✅ **40/40**, dont 7 sur les comptes : hachage, sessions, CSRF, limitation, isolation entre utilisateurs, réinitialisation, migrations |
| Typecheck (TypeScript 7, strict) | ✅ 0 erreur |
| Build de production | ✅ |
| Test de fumée de bout en bout sur `next start` (`node scripts/smoke.ts`) | ✅ **22/22** : 12 pages, redirections, en-têtes, API, parcours complet du compte |
| Navigateur : inscription par l'interface, envoi du personnage local, enregistrement d'un build vérifié en base | ✅ |
| Lint | ⚠️ Pas d'ESLint configuré (Next 16 a retiré `next lint`). Le typecheck strict tient lieu de garde-fou ; ajouter ESLint serait une dépendance de plus |

**Non vérifié** : l'envoi réel d'e-mails (bloqué, voir plus haut), le comportement sur un vrai hébergement HTTPS, et un test visuel complet sur mobile des nouvelles pages (Succès, Dofus, Équipement, Compte).

## 8. Ce qui demande ton intervention

1. ⛔ **Fournisseur d'e-mail** pour la réinitialisation du mot de passe.
2. ⛔ **Hébergement** : l'application a besoin d'un serveur Node (`next start`), pas d'un hébergement statique. Il faut aussi conserver `data/app.sqlite`, qui contient les comptes. À sauvegarder.
3. **Nom** : la recherche de marques déposées (INPI, EUIPO) pour « Atlas des Douze » n'est pas faite. Changer le nom = modifier `src/brand.ts`.
4. **GitHub** : le dépôt `itsuko-rt/dofus-companion` existe mais reste vide (la connexion Git avait échoué). Depuis ton terminal : `git push -u origin main`.
5. **Prévenir les mainteneurs de Fashionista** avant une mise en ligne publique : on utilise leur API, même avec un cache.
6. **Compte de test** créé en local (`ui-test@example.com`) et comptes `smoke…@example.com` : ils se trouvent dans `data/app.sqlite`, que tu peux supprimer sans risque en local.
