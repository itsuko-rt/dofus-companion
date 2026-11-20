// Checks the Obsidian vault in knowledge/: every [[link]] (and #heading) resolves, note names are unique,
// repository paths written as `code` exist, required notes are present, and nothing looks like a secret.
//   node scripts/check-knowledge.ts        (exit code 1 on any problem)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = 'knowledge';
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (f === '.obsidian' || f === '.trash') continue;
    if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.md')) files.push(p);
  }
};
walk(ROOT);

const problems: string[] = [];
const byName = new Map<string, string>();
for (const f of files) {
  const n = basename(f, '.md');
  if (byName.has(n)) problems.push(`duplicate note name "${n}": ${byName.get(n)} and ${f}`);
  byName.set(n, f);
}
const slug = (h: string) => h.trim().toLowerCase();
const headings = (f: string) => new Set([...readFileSync(f, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));

const REPO_PATH = /`((?:docs|src|scripts|app|components|tests|e2e|migrations|public)\/[^`\s*<>]+?)`/g;
const SECRET = /(ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|password\s*[:=]\s*\S{6,}|@(?!example\.com)[a-z0-9-]+\.(?:com|fr|es|net|org)\b)/i;
const templates = new Set(files.filter((f) => f.includes(`${ROOT}${process.platform === 'win32' ? '\\' : '/'}Templates`)));

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (!templates.has(f)) {
    // links inside `code spans` are examples, not links
    for (const m of text.replace(/`[^`\n]*`/g, '').matchAll(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]/g)) {
      const target = byName.get(m[1].trim());
      if (!target) { problems.push(`${f}: broken link [[${m[1]}]]`); continue; }
      if (m[2] && !headings(target).has(slug(m[2]))) problems.push(`${f}: missing heading [[${m[1]}#${m[2]}]]`);
    }
  }
  for (const m of text.matchAll(REPO_PATH)) {
    const p = m[1].replace(/[.,;:)]+$/, '');
    if (!existsSync(p)) problems.push(`${f}: repository path not found ${p}`);
  }
  for (const line of text.split('\n')) if (SECRET.test(line) && !/example\.com|template|\{\{/.test(line)) problems.push(`${f}: looks like a secret or personal data: ${line.trim().slice(0, 80)}`);
}

const REQUIRED = ['README.md', '00 - Dashboard/Home.md', '00 - Dashboard/Current Status.md', '10 - Claude Code/Operating Instructions.md',
  '10 - Claude Code/Project Context.md', 'Templates/Development Session.md', '.obsidian/app.json'];
for (const r of REQUIRED) if (!existsSync(join(ROOT, r))) problems.push(`missing ${r}`);
if (!readFileSync('CLAUDE.md', 'utf8').includes('knowledge/10 - Claude Code/Operating Instructions.md')) problems.push('CLAUDE.md does not point to the vault');

console.log(`${files.length} notes, ${byName.size} unique names`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('knowledge base OK');
