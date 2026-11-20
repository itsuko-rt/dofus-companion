import type { Metadata, Viewport } from 'next';
import { Roboto, Rowdies } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import Nav from '../components/Nav';
import JsonLd from '../components/JsonLd';
import { BRAND } from '../src/brand.ts';
import { SITE_URL } from '../src/site.ts';
import './globals.css';

// Self-hosted at build time by next/font: no request to Google from the browser.
// Rowdies (display) and Roboto (text): the official site's pairing, both under the SIL Open Font License.
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto', display: 'swap' });
const rowdies = Rowdies({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-rowdies', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} · quêtes, succès et builds DOFUS`, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      // one entry per size: .ico for older browsers, PNG for the tab; 192/512 live in the manifest
      { url: '/favicon.svg', type: 'image/svg+xml' }, // small-size emblem, sharp at any tab size (scripts/make-icons.ts)
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website', locale: 'fr_FR', siteName: BRAND.name, url: '/',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${BRAND.name} : quêtes, succès, Dofus et builds pour DOFUS` }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
};

export const viewport: Viewport = { themeColor: '#15110d', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${roboto.variable} ${rowdies.variable}`}>
      <body className="flex h-dvh flex-col font-sans antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Aller au contenu</a>
        <Nav />
        <main id="contenu" className="min-h-0 flex-1">{children}</main>
        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-0.5 border-t border-black/40 bg-surface px-3 py-1 text-[11px] text-faint">
          <span className="hidden sm:inline">{BRAND.disclaimer}</span>
          <Link href="/guides" className="hover:text-text">Guides</Link>
          <Link href="/a-propos" className="hover:text-text">À propos</Link>
          <Link href="/confidentialite" className="hover:text-text">Confidentialité et cookies</Link>
          <Link href="/mentions-legales" className="hover:text-text">Mentions légales</Link>
        </footer>
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: SITE_URL, name: BRAND.name, inLanguage: 'fr-FR', description: BRAND.tagline, publisher: { '@id': `${SITE_URL}/#org` } },
            { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: BRAND.name, url: SITE_URL, logo: `${SITE_URL}/favicon-512x512.png` },
          ],
        }} />
        {/* Cloudflare Web Analytics: no cookie, loaded only when a token is configured */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <Script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN })} strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
