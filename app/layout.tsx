import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dofus Companion',
  description: 'Progression Dofus calculée depuis les données officielles du jeu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="h-dvh antialiased">{children}</body>
    </html>
  );
}
