import type { Metadata } from 'next';
import Nav from '../components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dofus Companion',
  description: 'Progression Dofus calculée depuis les données officielles du jeu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex h-dvh flex-col antialiased">
        <Nav />
        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
