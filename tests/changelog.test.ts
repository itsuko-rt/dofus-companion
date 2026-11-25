import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanBody, parseBlocks, repoUrl, update, type Commit } from '../scripts/changelog.ts';

const URL = 'https://github.com/owner/repo';
const sha = (n: number) => n.toString(16).padStart(40, 'a');
const commit = (n: number, o: Partial<Commit> = {}): Commit => ({
  sha: sha(n), date: `2026-11-${String(20 + Math.floor(n / 10)).padStart(2, '0')}T1${n % 10}:00:00+01:00`, subject: `Change ${n}`, body: '', parents: [sha(n - 1)],
  files: [{ status: 'M', path: 'src/a.ts' }], ...o,
});

test('changelog: one entry per commit, newest first, grouped by day, with a link to the commit', () => {
  const { text, added } = update([commit(1), commit(2), commit(12)], '', URL);
  assert.equal(added.length, 3);
  assert.deepEqual(parseBlocks(text).map((b) => b.sha), [sha(12), sha(2), sha(1)]);
  assert.match(text, /## 2026-11-21[\s\S]*## 2026-11-20/);
  assert.ok(text.includes(`[\`${sha(12).slice(0, 7)}\`](${URL}/commit/${sha(12)})`));
});

test('changelog: a second run, or a push that repeats known commits, adds nothing; a push of several commits adds them all once', () => {
  const first = update([commit(1), commit(2)], '', URL).text;
  assert.deepEqual(update([commit(1), commit(2)], first, URL), { text: first, added: [] });
  const next = update([commit(1), commit(2), commit(3), commit(4), commit(5)], first, URL);
  assert.deepEqual(next.added, [sha(3), sha(4), sha(5)]);
  assert.equal(parseBlocks(next.text).length, 5);
});

test('changelog: an entry edited by hand is kept; the workflow\'s own commits are never logged (no loop)', () => {
  const first = update([commit(1)], '', URL).text.replace('### Change 1', '### Change 1 (wording fixed by hand)');
  const next = update([commit(1), commit(2), commit(3, { subject: 'docs(changelog): update for abc1234 [skip ci]' })], first, URL);
  assert.ok(next.text.includes('wording fixed by hand'));
  assert.deepEqual(next.added, [sha(2)]);
});

test('changelog: added, modified, removed and renamed files; a merge lists none; fixes and tests only as the message says', () => {
  const { text } = update([
    commit(1, { files: [{ status: 'A', path: 'new.ts' }, { status: 'D', path: 'old.ts' }, { status: 'R', path: 'b.md', from: 'a.md' }, { status: 'M', path: 'x.ts' }] }),
    commit(2, { parents: [sha(1), sha(9)], subject: 'Merge branch x', files: [] }),
    commit(3, { subject: 'Fix the login throttle', body: '- Tests: 12/12 unit\n- other note' }),
  ], '', URL);
  assert.match(text, /\*\*Added \(1\):\*\* `new\.ts`/);
  assert.match(text, /\*\*Removed \(1\):\*\* `old\.ts`/);
  assert.match(text, /\*\*Renamed \(1\):\*\* `a\.md` → `b\.md`/);
  assert.match(text, /merge commit[\s\S]*Merge commit: its changes are listed under the commits it merged/);
  assert.match(text, /Bugs fixed \(from the commit message\):\*\*\n- Fix the login throttle/);
  assert.match(text, /Tests \(from the commit message\):\*\*\n- Tests: 12\/12 unit/);
  // a commit that says nothing about tests gets no tests section
  assert.equal(text.split('Tests (from the commit message)').length, 2);
});

test('changelog: no names, e-mails or tokens are written', () => {
  assert.equal(cleanBody(['Did a thing', '', 'Co-Authored-By: Someone <someone@example.com>', 'Signed-off-by: X <x@example.org>']), 'Did a thing');
  assert.equal(repoUrl({}, 'https://x-access-token:SECRET@github.com/owner/repo.git'), URL);
  assert.equal(repoUrl({}, 'git@github.com:owner/repo.git'), URL);
  assert.equal(repoUrl({ GITHUB_REPOSITORY: 'owner/repo', GITHUB_SERVER_URL: 'https://github.com' }, ''), URL);
  const { text } = update([commit(1, { body: 'see <b>this</b>' })], '', URL);
  assert.ok(!text.includes('<b>'));
});
