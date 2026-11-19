import type { Metadata } from 'next';
import { Roboto, Rowdies } from 'next/font/google';
import Nav from '../components/Nav';
import { BRAND } from '../src/brand.ts';
import './globals.css';

// Self-hosted at build time by next/font: no request to Google from the browser.
// Rowdies (display) and Roboto (text): the official site's pairing, both under the SIL Open Font License.
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto', display: 'swap' });
const rowdies = Rowdies({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-rowdies', display: 'swap' });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${roboto.variable} ${rowdies.variable}`}>
      <body className="flex h-dvh flex-col font-sans antialiased">
        <Nav />
        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
