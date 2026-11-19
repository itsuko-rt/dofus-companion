import type { NextConfig } from 'next';

const config: NextConfig = {
  // Type checking runs through `npm run typecheck` (TypeScript 7), not inside next build.
  typescript: { ignoreBuildErrors: true },
};
export default config;
