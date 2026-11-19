import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';
const ads = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const https = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
// Content-Security-Policy (docs/AUDIT_SECURITE.md §headers). Third parties, each for one feature:
//  - cdn.jsdelivr.net: Tesseract worker, wasm core and French model, only when the scanner is used;
//  - static.cloudflareinsights.com / cloudflareinsights.com: Web Analytics, only with NEXT_PUBLIC_CF_BEACON_TOKEN;
//  - AdSense loads from many Google hosts that change over time, so with ads on, https: is allowed for
//    scripts, frames and images (Google's own CSP guidance).
// 'unsafe-inline' scripts: Next.js inline bootstrap without nonces (pages are statically rendered).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://static.cloudflareinsights.com${dev ? " 'unsafe-eval'" : ''}${ads ? ' https:' : ''}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${ads ? ' https:' : ''}`,
  "font-src 'self'",
  // data: — Tesseract's wasm core is inlined as a data: URL that it fetches
  `connect-src 'self' data: https://cdn.jsdelivr.net https://cloudflareinsights.com${dev ? ' ws:' : ''}${ads ? ' https:' : ''}`,
  `frame-src ${ads ? 'https:' : "'none'"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const config: NextConfig = {
  // Type checking runs through `npm run typecheck` (TypeScript 7), not inside next build.
  typescript: { ignoreBuildErrors: true },
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // only once the site is served over https (a wrong HSTS would lock browsers out for a year)
        ...(https && !dev ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
      ],
    }];
  },
  // Old URLs keep working after the redesign (docs/AUDIT_UX.md §3.1).
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
