// Keeps CHANGELOG.md in step with the git history: one entry per commit (date and time, SHA with a link, the commit
// message, added / modified / removed / renamed files, and the fixes and tests the message mentions). Run by the
// « Update changelog » workflow after each push to main, and by hand: `node scripts/changelog.ts [--check]`.
// Entries already in the file are kept as they are (edits survive); only commits missing from it are added, so a
// push of several commits, a merge or a re-run never makes duplicates. Nothing is invented: details the commit does
// not give are left out. Authors and e-mails are never written.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'CHANGELOG.md';
const BOT = /^docs\(changelog\):/; // the workflow's own commits are not logged (no loop, no noise)
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** https://github.com/<owner>/<repo>, from the Actions environment or the origin remote (credentials stripped). */
export function repoUrl(env: Record<string, string | undefined> = process.env, remote = (() => { try { return git('remote', 'get-url', 'origin').trim(); } catch { return ''; } })()): string | null {
  if (env.GITHUB_REPOSITORY) return `${env.GITHUB_SERVER_URL ?? 'https://github.com'}/${env.GITHUB_REPOSITORY}`;
  const m = /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remote);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}

export interface Commit { sha: string; date: string; subject: string; body: string; parents: string[]; files: FileChange[] }
export interface FileChange { status: 'A' | 'M' | 'D' | 'R'; path: string; from?: string }

/** Every commit reachable from `rev`, oldest first. */
export function readCommits(rev = 'HEAD'): Commit[] {
  const out = git('log', '--reverse', '--format=%H%x1f%cI%x1f%P%x1f%B%x1e', rev);
  return out.split('\x1e').map((r) => r.replace(/^\n/, '')).filter(Boolean).map((r) => {
    const [sha, date, parents, message] = r.split('\x1f');
    const lines = message.trimEnd().split('\n');
    const commit: Commit = {
      sha, date, subject: lines[0].trim(), parents: parents.trim() ? parents.trim().split(' ') : [],
      body: cleanBody(lines.slice(1)),
      files: [],
    };
    if (commit.parents.length <= 1) commit.files = fileChanges(sha);
    return commit;
  });
}

/** The message body without trailers (Co-Authored-By, Signed-off-by…): they carry names and e-mail addresses. */
export const cleanBody = (lines: string[]) => lines.filter((l) => !/^[A-Za-z-]+-by: /i.test(l) && !/<[^>\s]+@[^>\s]+>/.test(l)).join('\n').trim();

function fileChanges(sha: string): FileChange[] {
  const out = git('show', '--format=', '--name-status', '-M', '--no-color', '-z', sha);
  const parts = out.split('\0').filter((p) => p !== '');
  const files: FileChange[] = [];
  for (let i = 0; i < parts.length;) {
    const s = parts[i++];
    if (s.startsWith('R')) { const from = parts[i++], to = parts[i++]; files.push({ status: 'R', path: to, from }); }
    else if (s.startsWith('C')) { i++; files.push({ status: 'A', path: parts[i++] }); }
    else files.push({ status: (s[0] === 'A' || s[0] === 'D' ? s[0] : 'M') as FileChange['status'], path: parts[i++] });
  }
  return files;
}

const code = (p: string) => `\`${p.replace(/`/g, "'")}\``;
const escape = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One Markdown entry. The SHA and date sit in a marker comment, used to find and order entries. */
export function render(c: Commit, url: string | null): string {
  const short = c.sha.slice(0, 7);
  const time = c.date.replace('T', ' ').replace(/(:\d\d)([+-]\d\d:\d\d|Z)$/, '$1 $2').replace(/ Z$/, ' UTC');
  const lines = [`<!-- entry sha=${c.sha} date=${c.date} -->`, `### ${escape(c.subject)}`, ''];
  lines.push(`${url ? `[\`${short}\`](${url}/commit/${c.sha})` : `\`${short}\``} · ${time}${c.parents.length > 1 ? ' · merge commit' : ''}`, '');
  // a message line starting with # would become a heading
  if (c.body) lines.push(...c.body.split('\n').map((l) => escape(l).replace(/^#/, '\\#')), '');
  if (c.parents.length > 1) lines.push('_Merge commit: its changes are listed under the commits it merged._', '');
  const group = (label: string, list: string[]) => {
    if (!list.length) return;
    if (list.length <= 12) lines.push(`**${label} (${list.length}):** ${list.join(', ')}`, '');
    else lines.push(`<details><summary><strong>${label} (${list.length})</strong></summary>`, '', ...list.map((f) => `- ${f}`), '', '</details>', '');
  };
  group('Added', c.files.filter((f) => f.status === 'A').map((f) => code(f.path)));
  group('Modified', c.files.filter((f) => f.status === 'M').map((f) => code(f.path)));
  group('Removed', c.files.filter((f) => f.status === 'D').map((f) => code(f.path)));
  group('Renamed', c.files.filter((f) => f.status === 'R').map((f) => `${code(f.from!)} → ${code(f.path)}`));
  // only what the message itself says: lines that name a fix, or tests and their results
  const said = (re: RegExp) => c.body.split('\n').map((l) => l.replace(/^\s*[-*]\s*/, '').trim()).filter((l) => l && re.test(l));
  const fixes = [c.subject, ...said(/\bfix(es|ed)?\b|\bbug\b/i)].filter((l, i) => i > 0 || /^fix\b|\bfix(es|ed)?\b/i.test(l));
  const tests = said(/\b(tests?|e2e|typecheck|unit|passed|playwright|audit)\b/i);
  if (fixes.length) lines.push('**Bugs fixed (from the commit message):**', ...fixes.map((l) => `- ${escape(l)}`), '');
  if (tests.length) lines.push('**Tests (from the commit message):**', ...tests.map((l) => `- ${escape(l)}`), '');
  lines.push('<!-- /entry -->');
  return lines.join('\n');
}

const HEADER = `# Changelog

Every commit of Atlas des Douze, newest first. Each entry gives the commit's date and time, its SHA (linked to GitHub),
its message, the files it added, modified, removed or renamed, and the fixes and tests its message mentions.

- **Updated automatically** after each push to \`main\` by the « Update changelog » workflow
  (\`.github/workflows/update-changelog.yml\`, script \`scripts/changelog.ts\`).
- Entries for commits made before the workflow existed were reconstructed from the git history on 2026-11-25, with the
  same script. Details a commit does not record (tests run, for example) are not invented: they are simply absent.
- An entry, once written, is never rewritten by the script: corrections made by hand are kept.
- The project overview, for readers new to the project, is in [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).

<!-- entries: generated below, keep this line -->
`;

interface Block { sha: string; date: string; text: string }
export function parseBlocks(text: string): Block[] {
  const re = /<!-- entry sha=([0-9a-f]{40}) date=(\S+) -->[\s\S]*?<!-- \/entry -->/g;
  return [...text.matchAll(re)].map((m) => ({ sha: m[1], date: m[2], text: m[0] }));
}

/** The whole file: the header (as it is in the file, if present), then the entries grouped by day, newest first. */
export function assemble(existing: string, blocks: Block[]): string {
  const marker = '<!-- entries: generated below, keep this line -->';
  const head = existing.includes(marker) ? existing.slice(0, existing.indexOf(marker) + marker.length) + '\n' : HEADER;
  const sorted = [...blocks].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || b.sha.localeCompare(a.sha));
  const out: string[] = [];
  let day = '';
  for (const b of sorted) {
    const d = b.date.slice(0, 10); // the commit's own calendar day, as its time is shown
    if (d !== day) { out.push(`\n## ${d}\n`); day = d; }
    out.push(b.text, '');
  }
  return head + out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** Adds the missing commits. Returns the SHAs added. */
export function update(commits: Commit[], existing: string, url: string | null): { text: string; added: string[] } {
  const blocks = parseBlocks(existing);
  const known = new Set(blocks.map((b) => b.sha));
  const fresh = commits.filter((c) => !known.has(c.sha) && !BOT.test(c.subject));
  for (const c of fresh) blocks.push({ sha: c.sha, date: c.date, text: render(c, url) });
  return { text: fresh.length || !existing ? assemble(existing, blocks) : existing, added: fresh.map((c) => c.sha) };
}

if (import.meta.main) {
  const check = process.argv.includes('--check');
  const existing = existsSync(FILE) ? readFileSync(FILE, 'utf8') : '';
  const { text, added } = update(readCommits('HEAD'), existing, repoUrl());
  if (check) {
    console.log(added.length ? `${added.length} commit(s) missing from ${FILE}` : `${FILE} is up to date`);
    process.exit(added.length ? 1 : 0);
  }
  if (text !== existing) writeFileSync(FILE, text);
  console.log(added.length ? `${FILE}: ${added.length} entr${added.length > 1 ? 'ies' : 'y'} added (${added.map((s) => s.slice(0, 7)).join(', ')})` : `${FILE}: nothing to add`);
}
