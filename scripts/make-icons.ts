// Builds every favicon, app icon and the social preview from the Emerald Egg sources in brand/:
//  - brand/emerald-egg-master.png (supplied artwork, 1254 px) for 32 px and up;
//  - brand/emerald-egg-small.svg (same design without rocks, leaves and facets) for 16 px,
//    where the full artwork blurs into a green blob.
// node scripts/make-icons.ts   (uses sharp, installed with Next.js)
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { BRAND } from '../src/brand.ts';

const master = readFileSync('brand/emerald-egg-master.png');
const small = readFileSync('brand/emerald-egg-small.svg');
const BG = '#15110d'; // site background, also the manifest colours

const fromMaster = (size: number) => sharp(master).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
const icon = (size: number) => (size <= 16 ? sharp(small, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer() : fromMaster(size));
/** Mark centred on an opaque square: iOS and Android masks would turn transparent corners black. */
const onBackground = async (size: number, scale: number) => sharp({ create: { width: size, height: size, channels: 4, background: BG } })
  .composite([{ input: await fromMaster(Math.round(size * scale)), gravity: 'center' }]).png({ compressionLevel: 9, effort: 10 }).toBuffer();

const out: Record<number, Buffer> = {};
for (const s of [16, 32, 48, 96, 192, 512]) {
  out[s] = await icon(s);
  writeFileSync(`public/favicon-${s}x${s}.png`, out[s]);
}
rmSync('public/favicon-180x180.png', { force: true }); // same file as apple-touch-icon.png: not declared twice
writeFileSync('public/apple-touch-icon.png', await onBackground(180, 0.86));
writeFileSync('public/icon-maskable-512.png', await onBackground(512, 0.76)); // inside the 80 % safe zone

// favicon.ico: PNG entries 16 (simplified), 32 and 48 (bigger entries only add weight)
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

// social preview 1200×630: night background, the egg, name and tagline (system fonts: rendered server-side)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><radialGradient id="g" cx="27%" cy="50%" r="75%"><stop offset="0" stop-color="#1f3a14"/><stop offset="1" stop-color="#15110d"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="530" y="290" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="56" fill="#ffe2a6">${esc(BRAND.name.toUpperCase())}</text>
  <text x="532" y="360" font-family="Arial, sans-serif" font-size="32" fill="#f4ecdc">Quêtes, succès, Dofus et builds</text>
  <text x="532" y="404" font-family="Arial, sans-serif" font-size="32" fill="#f4ecdc">pour progresser dans DOFUS</text>
  <text x="532" y="520" font-family="Arial, sans-serif" font-size="22" fill="#c2b296">Site de fan gratuit · non affilié à Ankama</text>
</svg>`);
writeFileSync('public/og-image.png', await sharp(og).composite([{ input: await fromMaster(420), left: 70, top: 105 }]).png({ compressionLevel: 9, effort: 10 }).toBuffer());
console.log('icons and social image written to public/');
