import type { NextConfig } from 'next';

const config: NextConfig = {
  // Type checking runs through `npm run typecheck` (TypeScript 7), not inside next build.
  typescript: { ignoreBuildErrors: true },
  // Old URLs keep working after the redesign (docs/AUDIT_UX.md §3.1).
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
  async redirects() {
    return [
      { source: '/quetes', destination: '/progression/quetes', permanent: true },
      { source: '/classes', destination: '/personnage/sorts', permanent: true },
      { source: '/classes/:id', destination: '/personnage/sorts/:id', permanent: true },
      { source: '/progression', destination: '/progression/quetes', permanent: false },
      { source: '/personnage/builds', destination: '/builds', permanent: true },
    ];
  },
};
export default config;
