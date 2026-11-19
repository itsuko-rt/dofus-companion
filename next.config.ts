import type { NextConfig } from 'next';

const config: NextConfig = {
  // Type checking runs through `npm run typecheck` (TypeScript 7), not inside next build.
  typescript: { ignoreBuildErrors: true },
  // Old URLs keep working after the redesign (docs/AUDIT_UX.md §3.1).
  async redirects() {
    return [
      { source: '/quetes', destination: '/progression/quetes', permanent: true },
      { source: '/classes', destination: '/personnage/sorts', permanent: true },
      { source: '/classes/:id', destination: '/personnage/sorts/:id', permanent: true },
      { source: '/progression', destination: '/progression/quetes', permanent: false },
    ];
  },
};
export default config;
