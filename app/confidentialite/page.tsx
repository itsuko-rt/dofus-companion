import type { Metadata } from 'next';
import Breadcrumbs from '../../components/Breadcrumbs';
import ConsentButton from '../../components/ConsentButton';
import { Card, PageHero } from '../../components/ui';
import { BRAND } from '../../src/brand.ts';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Confidentialité et cookies', path: '/confidentialite',
  description: `Quelles données ${BRAND.name} enregistre, pourquoi, combien de temps, et comment gérer les cookies.`,
});

const ROWS: [string, string, string, string][] = [
  ['adz_session (cookie)', 'Garder votre session ouverte après connexion', 'Strictement nécessaire', '30 jours'],
  ['dofus-companion:* (stockage du navigateur)', 'Vos personnages, votre progression et vos préférences d’affichage, sur votre appareil', 'Strictement nécessaire (fonction demandée)', 'Jusqu’à suppression'],
];

export default function Page() {
  const ads = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const analytics = !!process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-account)" kicker={BRAND.name} title="Confidentialité et cookies" />
      <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 text-sm leading-relaxed text-muted">
        <Breadcrumbs trail={[['Accueil', '/'], ['Confidentialité et cookies', '/confidentialite']]} />
        <p className="text-xs text-faint">Dernière mise à jour : 19 novembre 2026.</p>

        <section>
          <h2 className="mb-1 font-display text-base text-text">En résumé</h2>
          <p>Le site s’utilise sans compte : votre progression reste alors dans votre navigateur. Si vous créez un compte, nous enregistrons votre adresse e-mail, une empreinte de votre mot de passe (jamais le mot de passe lui-même) et vos personnages, pour les retrouver sur vos autres appareils. Rien n’est vendu ni partagé à des fins commerciales.</p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base text-text">Données enregistrées avec un compte</h2>
          <ul className="list-disc pl-5">
            <li><b className="text-text">Adresse e-mail</b> : identifiant de connexion et envoi du lien de réinitialisation du mot de passe.</li>
            <li><b className="text-text">Mot de passe</b> : seule une empreinte (scrypt) est conservée.</li>
            <li><b className="text-text">Personnages</b> : nom, classe, niveau, quêtes et succès cochés, builds enregistrés, notes, historique des modifications.</li>
            <li><b className="text-text">Sessions</b> : une empreinte du jeton de connexion et ses dates de création et d’expiration, 30 jours au plus ; supprimée à la déconnexion.</li>
            <li><b className="text-text">Réinitialisation du mot de passe</b> : une empreinte du lien, valable 60 minutes, supprimée dès qu’il a servi ou expiré.</li>
            <li><b className="text-text">Sécurité</b> : pour bloquer les essais successifs, chaque tentative de connexion échouée, création de compte ou demande de lien est enregistrée sous forme d’empreinte (adresse e-mail et/ou adresse IP rendues illisibles), avec sa date ; supprimée au bout d’une heure.</li>
          </ul>
          <p className="mt-2">Base légale : exécution du service que vous demandez. Vous pouvez supprimer vos personnages à tout moment, et votre compte entier depuis la page <a className="underline" href="/compte">Mon compte</a> : l’adresse e-mail, les sessions et les personnages sont alors effacés de la base immédiatement (les sauvegardes éventuelles de l’hébergeur suivent leur propre cycle).</p>
          <p className="mt-2"><b className="text-text">Hébergement</b> : comme tout serveur web, l’hébergeur indiqué dans les <a className="underline" href="/mentions-legales">mentions légales</a> reçoit l’adresse IP et la page demandée à chaque visite, pour acheminer la requête et protéger le site.</p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base text-text">Ce qui ne quitte jamais votre appareil</h2>
          <p>Les captures d’écran utilisées par le scanner de progression sont lues dans votre navigateur et ne sont envoyées nulle part. Le modèle de lecture (environ 2 Mo) est téléchargé une fois depuis le service de Tesseract.js (jsDelivr) ; ce téléchargement transmet, comme toute requête web, votre adresse IP à ce service.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-base text-text">Cookies et stockage</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-surface-2 uppercase tracking-wide text-faint"><tr><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Rôle</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Durée</th></tr></thead>
              <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-line">{r.map((c, i) => <td key={i} className="px-3 py-2">{c}</td>)}</tr>)}</tbody>
            </table>
          </Card>
          <p className="mt-2">Ces éléments sont nécessaires au fonctionnement demandé : ils ne requièrent pas de consentement.</p>
          <p className="mt-2"><b className="text-text">Mesure d’audience</b> : {analytics
            ? 'Cloudflare Web Analytics compte les pages vues de façon agrégée, sans cookie publicitaire ni profil individuel.'
            : 'aucune pour le moment.'}</p>
          <p className="mt-2"><b className="text-text">Publicité</b> : {ads
            ? 'des annonces Google AdSense peuvent s’afficher sur les pages de guides et l’accueil. Dans l’Espace économique européen, au Royaume-Uni et en Suisse, votre choix est recueilli par la plateforme de consentement certifiée de Google avant toute publicité personnalisée.'
            : 'aucune publicité n’est active. Si elle l’est un jour, votre consentement sera demandé avant tout cookie publicitaire, et cette page sera mise à jour.'}</p>
          <div className="mt-3"><ConsentButton /></div>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base text-text">Services tiers contactés</h2>
          <ul className="list-disc pl-5">
            <li><b className="text-text">Dofus Fashionista</b> : les builds de la communauté sont récupérés par notre serveur ; votre navigateur ne les contacte pas.</li>
            <li><b className="text-text">Dofus Pour Les Noobs</b> : uniquement si vous cliquez sur un lien de tutoriel.</li>
            <li><b className="text-text">Tesseract.js / jsDelivr</b> : uniquement si vous utilisez le scanner.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base text-text">Vos droits</h2>
          <p>Conformément au RGPD, vous pouvez accéder à vos données et les rectifier (page Personnages), les exporter (bouton « Exporter » de la page Personnages) et supprimer votre compte (page Mon compte). Pour toute autre demande, écrivez-nous (voir les mentions légales). Vous pouvez aussi adresser une réclamation à l’autorité de protection des données de votre pays : l’AEPD en Espagne (aepd.es), la CNIL en France (cnil.fr).</p>
        </section>
      </article>
    </div>
  );
}
