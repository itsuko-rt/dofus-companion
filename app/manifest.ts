import type { MetadataRoute } from 'next';
import { BRAND } from '../src/brand.ts';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.tagline,
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#15110d',
    theme_color: '#15110d',
    icons: [
      { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
