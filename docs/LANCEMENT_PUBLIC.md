# Mise en ligne publique : marque, SEO, hébergement, monétisation

*2026-11-19. Point de sauvegarde : tag git `checkpoint-before-public-launch`. Légende : ✅ fait et testé · ⚠️ limite · ⛔ demande ton action.*

## 1. Marque et icônes ✅

- **Logo : l'œuf d'émeraude** fourni (`brand/emerald-egg-master.png`, 1254 px) : un œuf d'émeraude facetté, un soleil crème au centre, un anneau doré sur un fond vert profond. Il a remplacé l'œuf doré du premier jet (comparaison : `docs/comparaison-favicon.png`).
- **Version simplifiée** (`brand/emerald-egg-small.svg`) pour **16 px seulement** : même anneau, même œuf, même soleil, sans rochers, feuilles ni facettes, qui deviennent du bruit à cette taille. À partir de 32 px, c'est l'illustration fournie, réduite.
- **Fichiers générés** par `node scripts/make-icons.ts`, avec sharp, déjà installé avec Next :
  - `favicon.ico` (16, 32 et 48 px réunis dans un seul fichier, 5,6 Ko contre 157 Ko pour celui du paquet, qui en contenait six) ;
  - `favicon-16x16`, `32`, `48`, `96` et `192`, `favicon-512x512.png` ;
  - `apple-touch-icon.png` (180 px, sur fond opaque pour qu'iOS n'affiche pas de coins noirs) ;
  - `icon-maskable-512.png` : version adaptée aux icônes d'applications Android ;
  - `og-image.png` (1200 × 630) : l'image affichée quand on partage un lien sur les réseaux sociaux.
- **Intégration** : les icônes et le partage social sont déclarés dans les métadonnées de la page, avec un manifeste (`/manifest.webmanifest`) et la couleur d'interface `#15110d`.
- **Déclarations** : seulement `favicon.ico`, les PNG de 16 et 32 px et l'icône Apple. Les tailles 192 et 512 sont dans le manifeste. L'ancien SVG doré a été supprimé.

## 2. Audit SEO et corrections

| Point | Avant | Après |
|---|---|---|
| Framework et rendu | Next.js 16, App Router. Pages statiques, sauf `/api/*`. Les outils (carte des quêtes, succès, builds) se remplissent dans le navigateur. | Inchangé, plus **des pages de guides entièrement générées au build** ✅ |
| Titres | Uniques mais courts (« Quêtes ») | Titres descriptifs par page ✅ |
| Meta descriptions | Une seule, partout | **Unique par page**, construite à partir des vraies données ✅ |
| URL canoniques | Aucune | Sur chaque page ✅ |
| Open Graph et Twitter | Aucun | Sur chaque page, avec l'image 1200 × 630 ✅ |
| `sitemap.xml` | Absent | **138 URL**, uniquement des pages utiles ✅ |
| `robots.txt` | Absent | Seule l'API `/api/` est bloquée. Les pages personnelles (compte, profil) sont en `noindex` : les bloquer aussi dans `robots.txt` empêcherait les moteurs de lire ce `noindex` ✅ |
| URL lisibles | `/progression/quetes/19`, `/personnage/sorts/9` | `/progression/quetes/incarnam`, `/personnage/sorts/cra`. **Les anciennes URL redirigent de façon permanente (308)** ✅ |
| Contenu visible par les moteurs | Les outils affichent « Chargement… » à un robot qui n'exécute pas le JavaScript | Guides lisibles sans JavaScript : `/guides`, `/guides/quetes`, **45 pages de région**, `/guides/dofus` et **34 pages de Dofus** ✅ |
| HTML sémantique | Une `div` principale | `<main>` avec lien d'évitement, `<article>`, fil d'Ariane `<nav>`, un seul `<h1>`, tableaux avec légende et en-têtes ✅ |
| Données structurées | Aucune | `WebSite` et `Organization` sur tout le site, `BreadcrumbList` sur les guides et les pages légales ✅ |
| Images | — | `alt` renseigné, ou vide quand l'image est décorative. Dimensions fixées pour les icônes des Dofus, chargement différé ✅ |

**Choix volontaires** :
- **URL en français**, comme le site : `/guides/quetes/incarnam` plutôt que `/quests/incarnam`.
- **Pas de type `Article` ni `FAQPage`** : nos guides sont des pages de données, pas des articles rédigés ni de vraies questions-réponses. Ce serait de la manipulation.
- **Pas de pages « Meilleurs builds Crâ par niveau »** : leur contenu ne serait que la liste des builds de Fashionista, ce qui fait une page dupliquée et peu utile. À faire quand il y aura des commentaires originaux.
- **Pas de pages par catégorie de succès** pour l'instant : 134 catégories, beaucoup presque vides.

**Validation** :
- ✅ JSON-LD analysé et contrôlé sur les pages rendues.
- ✅ Sitemap et robots lus depuis le serveur de production.
- ⛔ Les outils de Google (test des résultats enrichis, Search Console) demandent une URL publique : à passer après la mise en ligne.

## 3. Moteurs IA (GEO)

Ce qui a été fait, sans aucune promesse de classement :
- **Pages lisibles sans JavaScript**, avec des faits précis et vérifiables. Exemple : « Incarnam compte 24 quêtes (niveaux 2 à 10), 4 chaînes… ».
- **Sources citées** sur chaque guide (fichiers du jeu, version 3.7.14.18) et sur `/a-propos`.
- **Liens internes** entre les pages : guide de région → quête → carte interactive ; Dofus → chaque étape → guide de sa région.
- **Vocabulaire constant** : quête, succès, chaîne, prérequis, Dofus.
- **Aucune règle qui bloque les robots IA** dans `robots.txt`.
- **Pas de `llms.txt` ni de balise « GEO »** : rien ne prouve qu'ils aient un effet.
- **Aucun contenu généré en masse.** Les phrases sont des modèles fixes autour de chiffres réels. Aucun contenu de Dofus Pour Les Noobs n'est copié : on y fait seulement des liens.

## 4. Hébergement Cloudflare : rapport de compatibilité

Faits vérifiés dans la documentation officielle le 2026-11-19 :
- Next.js 16 tourne sur Workers via `@opennextjs/cloudflare`. Cloudflare recommande désormais aussi **vinext**, encore en bêta.
- Le plan Free offre 100 000 requêtes par jour et **10 ms de CPU par requête**.
- D1 Free : 500 Mo par base, 5 millions de lignes lues et 100 000 écrites par jour.
- Fichiers statiques : 20 000 au maximum par version, 25 Mio par fichier.
- Workers Builds (déploiement depuis GitHub) : 3 000 minutes par mois, avec des URL d'aperçu par branche.

| Élément de l'application | Sur Workers (Free) | Pourquoi |
|---|---|---|
| Pages statiques, guides, icônes | ✅ | Fichiers statiques |
| `/api/graph`, `/api/achievements/objectives` | ✅ | Générées au build (statiques) |
| `/api/quests/[id]`, `/api/achievements`, `/api/items/search` | ❌ en l'état | Elles lisent `data/game-*.sqlite` avec **`node:sqlite`**, qui n'est qu'un **module vide** sur Workers. Il faut passer par D1 : la base fait 12 Mo, l'import est possible. |
| Comptes (`/api/auth`, `/api/characters`) | ❌ en l'état | `node:sqlite`, et surtout **scrypt : 102 ms de CPU par mot de passe** (mesuré), soit **10 fois la limite du plan Free**. L'inscription et la connexion échoueraient. Il faut Workers Paid (5 $/mois, 30 s de CPU), ou garder les comptes ailleurs. |
| `/api/builds` (Fashionista) | ✅ probable | Un simple `fetch` avec cache ; non testé sur Workers |
| Scan OCR | ✅ | Entièrement dans le navigateur |

**Conclusion : je n'ai pas migré.** Passer sur Workers demande de réécrire toute la couche de données en asynchrone pour D1, et de payer Workers pour les comptes. Le faire « à l'aveugle » aurait cassé les comptes. Deux voies :

### Voie A, recommandée maintenant : gratuit côté Cloudflare, code inchangé
1. Faire tourner l'application Node (`npm run build && npm start`) sur une machine allumée en permanence : un petit serveur loué (VPS, quelques euros par mois) ou un PC à toi.
2. **Cloudflare Tunnel** (`cloudflared`) relie cette machine à Cloudflare sans ouvrir de port. Cloudflare fournit gratuitement le DNS, le HTTPS, le cache des fichiers statiques, la protection DDoS et Web Analytics.
   ⚠️ La gratuité de Tunnel vient de ma connaissance, non revérifiée aujourd'hui.
3. Sauvegarder `data/app.sqlite` (les comptes). Par exemple, une copie quotidienne vers **R2**, gratuit jusqu'à 10 Go.

### Voie B, plus tard : tout sur Cloudflare
1. `npx @opennextjs/cloudflare` (ou vinext), `wrangler.jsonc` avec `nodejs_compat`.
2. Comptes vers D1 : les migrations sont **déjà prêtes** dans `migrations/0001_app.sql` et `0002_app.sql`, générées par `node scripts/export-d1-migrations.ts`, puis `wrangler d1 migrations apply`.
3. Données du jeu vers D1 : `sqlite3 data/game-*.sqlite .dump`, en retirant `BEGIN`/`COMMIT`, puis `wrangler d1 execute --remote --file`. Ou alors, exporter en JSON statique au build.
4. Réécrire `src/load.ts` et `src/server/*` en asynchrone, sur l'API de D1.
5. **Workers Paid à 5 $/mois** pour les comptes, ou un hachage moins coûteux. Je ne le recommande pas : ce serait affaiblir la sécurité.

**Variables d'environnement** : listées dans `.env.example`. Aucun secret dans le dépôt, et `.env*.local` est ignoré par git.

## 5. Publicité et monétisation

| | AdSense | Ezoic | NitroPay | Carbon Ads |
|---|---|---|---|---|
| Acceptation | Avoir 18 ans ou plus, contenu original de qualité, règles du programme | Contenu original | Revue manuelle (5 à 7 jours ouvrés) | Sur invitation, audience développeurs |
| Trafic minimum | Aucun annoncé | **250 000 utilisateurs mensuels** (depuis le 19/02/2026) | Aucun annoncé | 10 000 pages vues par mois |
| Sites de jeu | Généraliste | Tous | **Spécialisé jeux vidéo** | Inadapté |
| Revenus | eCPM, 80 % au site | Non publié | Non publié | ~1,50 à 2,30 $ CPM |
| Seuil de paiement | 70 €, SEPA | 20 $ | Aucun minimum, Net 7 | 20 $ (PayPal) |
| Consentement UE | **CMP certifiée TCF obligatoire** (EEE/RU depuis le 16/01/2024, Suisse depuis le 31/07/2024) | Non vérifié | CMP IAB fournie | — |

Sources : support.google.com/adsense (9724, 1709871, 13554116), support.ezoic.com, nitropay.com/faq, carbonads.net/faq.

**Recommandation** : AdSense d'abord, avec **sa propre CMP certifiée et gratuite** (AdSense, puis Confidentialité et messages). C'est plus sûr qu'une bannière maison, qui ne serait pas certifiée. Puis tester NitroPay quand il y aura du trafic, puisqu'il est spécialisé dans les jeux.

⚠️ **Risque pour l'acceptation** : les règles de Google interdisent les annonces à côté de contenus sous droits d'auteur utilisés sans autorisation. Les illustrations d'Ankama (scènes de classes, portraits, icônes des Dofus) sont donc un risque. À décider :
- les retirer des pages qui portent de la publicité ;
- ou obtenir l'accord d'Ankama.

**Ce qui est prêt** ✅ :
- `components/AdSlot.tsx` **n'affiche rien** tant que `NEXT_PUBLIC_ADSENSE_CLIENT` et l'identifiant de l'emplacement ne sont pas renseignés. Les comptes premium ne voient jamais de publicité.
- Emplacements prévus : l'accueil et les guides de région, entre deux blocs de lecture. **Jamais dans la carte des quêtes, le builder ou à côté d'un bouton.**
- Mention « Publicité » visible, hauteur réservée pour que la page ne saute pas au chargement.
- `/ads.txt` généré automatiquement ; il répond « introuvable » tant qu'AdSense n'est pas configuré.

**Gratuit et Premium** ✅ (architecture seulement, aucun paiement) :
- `src/plans.ts` : `free` (tous les outils, publicité possible) et `premium` (sans publicité, comparaisons avancées, plus de personnages, statistiques, synchronisation prioritaire).
- Fonction `hasFeature(plan, fonction)`, testée.
- Colonne `users.plan` (migration 2, `free` par défaut), renvoyée par `/api/auth/me`.
- Plus tard, un paiement (Stripe Billing, Lemon Squeezy, Paddle…) passera simplement `plan` à `premium` via un webhook signé. Rien d'autre ne change.

## 6. Mesure d'audience

| | Cloudflare Web Analytics | Google Analytics 4 | Plausible / Umami |
|---|---|---|---|
| Coût | Gratuit | Gratuit | Payant, ou gratuit en auto-hébergé |
| Données personnelles | Cloudflare dit ne pas en collecter | Cookies et identifiants, **consentement obligatoire** dans l'UE | Sans cookie |
| Ce qu'on mesure | Pages vues, visites, pages populaires, provenance, performances | Tout, y compris les conversions | Pages, provenance, objectifs |

**Choix** : Cloudflare Web Analytics, activé par `NEXT_PUBLIC_CF_BEACON_TOKEN` et documenté dans la page de confidentialité. Avec lui, on suit les visiteurs, les pages vues, les guides et les régions les plus vus, et la part venant des moteurs de recherche. Ce qui reste à faire :
- ⚠️ « Sans cookie » n'est pas écrit noir sur blanc dans la documentation lue : à confirmer.
- Les **visiteurs qui reviennent** et le **taux d'inscription** demanderaient de suivre des personnes. Je ne l'ai pas fait. Le nombre d'inscrits se lit directement dans la base (`SELECT COUNT(*) FROM users`).

## 7. Vie privée et consentement ✅

- `/confidentialite` :
  - données collectées, base légale, durées de conservation ;
  - tableau des cookies et du stockage ;
  - services tiers contactés ;
  - droits RGPD (accès, export, suppression, CNIL) ;
  - bouton « Gérer mes choix », qui ouvre la CMP de Google si elle est active, et sinon dit honnêtement qu'il n'y a rien à accepter.
- `/mentions-legales` (éditeur, hébergeur, propriété intellectuelle) et `/a-propos` (rôle du site, sources, gratuité).
- Liens dans un pied de page présent partout.
- **Correction trouvée en rédigeant la politique** : les tentatives de connexion échouées étaient conservées indéfiniment. Elles sont maintenant supprimées après 15 minutes, comme annoncé.
- Aucune bannière de cookies affichée aujourd'hui : **le site n'utilise que des éléments strictement nécessaires**, donc il n'y a pas de consentement à demander. La CMP de Google prendra le relais quand la publicité sera activée.

## 8. Performance

Mesuré en production sur l'accueil : 858 Ko transférés, dont 278 Ko d'illustrations et 71 Ko de polices, chargement en ~1 s en local.
- Les guides sont de simples pages HTML générées au build. Hors images de classe, il n'y a pas de JavaScript lourd sur ces pages.
- Hauteur réservée pour les emplacements publicitaires, dimensions fixées pour les icônes des Dofus.
- À faire : convertir les scènes de classe en WebP (≈ −60 %) et passer Lighthouse sur l'URL publique.

## 9. ⛔ Ce qu'il te reste à faire (comptes et démarches)

1. **Nom de domaine** : à acheter, chez Cloudflare Registrar ou ailleurs, puis à renseigner dans `NEXT_PUBLIC_SITE_URL`.
2. **Compte Cloudflare** (gratuit) : ajouter le domaine, puis créer le tunnel (voie A) ou le Worker (voie B).
3. **Machine Node** pour la voie A, avec une sauvegarde quotidienne de `data/app.sqlite`.
4. **Mentions légales** (obligatoires en France) : définir sur le serveur `LEGAL_PUBLISHER`, `LEGAL_CONTACT` et `LEGAL_HOST`. Ces informations ne sont pas dans le code, pour que tes données personnelles ne soient pas publiées sur GitHub.
5. **Fournisseur d'e-mail** pour la réinitialisation des mots de passe (toujours en attente).
6. **Google Search Console** : vérifier le domaine et soumettre `sitemap.xml`. Bing Webmaster Tools, idem.
7. **AdSense**, une fois le site en ligne avec du trafic :
   - créer le compte (tu dois avoir 18 ans ou plus) ;
   - configurer la CMP dans « Confidentialité et messages » ;
   - renseigner `NEXT_PUBLIC_ADSENSE_CLIENT` et les identifiants d'emplacements ;
   - régler la question des illustrations d'Ankama (section 5).
8. **Ankama** : vérifier leurs conditions pour les sites de fans (illustrations, nom DOFUS). Fashionista : prévenir ses mainteneurs.
9. **Marque** : vérifier « Atlas des Douze » auprès de l'INPI et de l'EUIPO.

## 10. Déployer, pas à pas (voie A)

Sur la machine qui hébergera le site, avec Node 24 ou plus récent :

```sh
git clone https://github.com/itsuko-rt/dofus-companion.git && cd dofus-companion
npm ci
npm run import          # données du jeu (≈ 8 Go de mémoire pendant l'import)
npm run assets          # illustrations (facultatif, voir §5 sur la publicité)
cp .env.example .env.local   # puis remplir NEXT_PUBLIC_SITE_URL, LEGAL_*, éventuellement CF_BEACON
npm run build
npm start               # écoute sur le port 3000 ; à lancer comme service (systemd, pm2…)
```

Puis, côté Cloudflare (gratuit) :
1. Tableau de bord → Zero Trust → Networks → Tunnels → **Create a tunnel** (type cloudflared). Installer `cloudflared` sur la machine avec la commande affichée. Le jeton est donné par Cloudflare dans ton navigateur : ne le colle jamais dans le projet.
2. **Public hostname** : ton domaine, vers `http://localhost:3000`.
3. Web Analytics : ajouter le site, copier le jeton dans `NEXT_PUBLIC_CF_BEACON_TOKEN`, puis refaire `npm run build`.
4. Vérifier :
   - `https://ton-domaine/robots.txt` et `/sitemap.xml` répondent ;
   - le test de fumée passe : `node scripts/smoke.ts https://ton-domaine` (il crée un compte de test `smoke…@example.com`, à supprimer ensuite).

Pour les aperçus par branche et le tout-Cloudflare, voir la voie B (§4).
