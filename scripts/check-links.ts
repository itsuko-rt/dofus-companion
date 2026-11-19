// Broken-link and SEO check of a running server: every sitemap URL, then every internal link found
// on those pages. node scripts/check-links.ts http://localhost:3000
// The sitemap holds absolute public URLs (NEXT_PUBLIC_SITE_URL); they are re-rooted on the tested server.
const BASE = process.argv[2] ?? 'http://localhost:3000';
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const problems: string[] = [];
const seen = new Map<string, number>();
const status = async (path: string) => {
  if (!seen.has(path)) seen.set(path, (await fetch(`${BASE}${path}`, { redirect: 'manual' })).status);
  return seen.get(path)!;
};
const canonicals = new Set<string>();
for (const p of pages) {
  const r = await fetch(`${BASE}${p}`);
  if (r.status !== 200) { problems.push(`sitemap ${p} → ${r.status}`); continue; }
  const html = await r.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) problems.push(`${p}: no canonical`);
  else if (new URL(canonical).pathname !== p) problems.push(`${p}: canonical points to ${canonical}`);
  if (canonical && canonicals.has(canonical)) problems.push(`${p}: duplicate canonical`);
  if (canonical) canonicals.add(canonical);
  if (!/<meta name="description" content="[^"]{50,}/.test(html)) problems.push(`${p}: description missing or short`);
  if ((html.match(/<h1[\s>]/g) ?? []).length > 1) problems.push(`${p}: several h1`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { problems.push(`${p}: invalid JSON-LD`); }
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const link = m[1];
    if (link.startsWith('/_next') || /\.(png|ico|svg|webmanifest|css|js)$/.test(link)) continue;
    const s = await status(link);
    if (s >= 400) problems.push(`${p} → broken link ${link} (${s})`);
  }
}
console.log(`${pages.length} sitemap pages, ${seen.size} distinct internal links checked`);
console.log(problems.length ? problems.join('\n') : 'no problem found');
process.exit(problems.length ? 1 : 0);
