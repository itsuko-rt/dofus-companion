// Renders the brand SVGs (public/brand) into favicons, app icons and the social preview image.
// node scripts/make-icons.ts   (uses sharp, installed with Next.js)
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { BRAND } from '../src/brand.ts';

const full = readFileSync('public/brand/logo.svg');
const small = readFileSync('public/brand/logo-small.svg');
const png = (svg: Buffer, size: number) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const sizes = [16, 32, 48, 96, 180, 192, 512];
const out: Record<number, Buffer> = {};
for (const s of sizes) {
  out[s] = await png(s <= 48 ? small : full, s); // the detailed egg turns to mush below 48 px
  writeFileSync(`public/favicon-${s}x${s}.png`, out[s]);
}
writeFileSync('public/apple-touch-icon.png', out[180]);
// maskable icon: the mark inside the 80 % safe zone on the brand background
writeFileSync('public/icon-maskable-512.png', await sharp({ create: { width: 512, height: 512, channels: 4, background: '#15110d' } })
  .composite([{ input: await png(full, 380), gravity: 'center' }]).png().toBuffer());

// favicon.ico = PNG-compressed entries (16, 32, 48), supported by every current browser
const ico = [16, 32, 48];
const header = Buffer.alloc(6 + 16 * ico.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(ico.length, 4);
let offset = header.length;
ico.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(out[s].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += out[s].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...ico.map((s) => out[s])]));

// social preview 1200×630: night background, egg, name and tagline (system sans-serif: rendered server-side)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><radialGradient id="g" cx="30%" cy="45%" r="80%"><stop offset="0" stop-color="#3a2a17"/><stop offset="1" stop-color="#15110d"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="520" y="290" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="56" fill="#ffe2a6">${esc(BRAND.name.toUpperCase())}</text>
  <text x="522" y="360" font-family="Arial, sans-serif" font-size="32" fill="#f4ecdc">Quêtes, succès, Dofus et builds</text>
  <text x="522" y="404" font-family="Arial, sans-serif" font-size="32" fill="#f4ecdc">pour progresser dans DOFUS</text>
  <text x="522" y="520" font-family="Arial, sans-serif" font-size="22" fill="#c2b296">Site de fan gratuit · non affilié à Ankama</text>
</svg>`);
writeFileSync('public/og-image.png', await sharp(og).composite([{ input: await png(full, 400), left: 80, top: 115 }]).png({ compressionLevel: 9 }).toBuffer());
console.log('icons and social image written to public/');
