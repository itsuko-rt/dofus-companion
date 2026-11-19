import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import Nav from '../components/Nav';
import { BRAND } from '../src/brand.ts';
import './globals.css';

// Self-hosted at build time by next/font: no request to Google from the browser.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable}`}>
      <body className="flex h-dvh flex-col font-sans antialiased">
        <Nav />
        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
