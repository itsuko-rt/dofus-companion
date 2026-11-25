---
type: adr
status: accepted
date: 2026-11-25
---
# ADR-0010 Changelog written by a workflow on main

## Context
The owner wants a friend to follow the project and see every update pushed to GitHub, without anyone having to ask for it. The history so far lived in commit messages, the vault's session summaries and `docs/` reports. None of these is one chronological list on GitHub.

## Decision
1. **`CHANGELOG.md`** at the repository root: one entry per commit, newest first. Each entry has:
   - the date and time, and the SHA linked to GitHub;
   - the message;
   - the files added, modified, removed or renamed;
   - the fixes and tests **the message itself** mentions.
   
   Authors, e-mail addresses and trailers are never written.
2. **One script for everything**, `scripts/changelog.ts` (unit tested in `tests/changelog.test.ts`).
   - It adds the commits whose SHA is not in the file yet, and never rewrites an existing entry, so hand edits survive.
   - The 67 commits made before it existed were reconstructed with it on 2026-11-25.
3. **A GitHub Actions workflow on pushes to `main`**, `.github/workflows/update-changelog.yml`:
   - it runs the script and commits `CHANGELOG.md` back to `main` as `github-actions[bot]`;
   - it has only the `contents: write` permission;
   - runs are serialised (`concurrency`), and a push made in the meantime is retried up to 3 times.
   - **No loop:** pushes made with `GITHUB_TOKEN` do not start workflows; the job also skips its own commits (actor and `docs(changelog):` message) and pushes that change only `CHANGELOG.md`; the script never logs its own commits.
4. **`docs/PROJECT_OVERVIEW.md`** is the entry point for readers who do not use Obsidian. It summarises the project in two levels and links to the vault notes, which stay the detailed source. No copy.

## Alternatives considered
- **A changelog written by hand, or by Claude Code at the end of each session.** It misses pushes made outside a session, and depends on someone remembering.
- **A full rebuild of the file from git on each run.** It would drop entries whose commits leave `main`'s history (a squash merge), and lose hand edits.
- **GitHub releases or a separate « docs » branch.** Harder to find for a reader, and they would need more permissions.

## Consequences
- `main` gets small bot commits (`docs(changelog): update for <sha> [skip ci]`). If `main` is ever protected against direct pushes, the workflow needs an exception, or must open pull requests instead.
- Commits of other branches appear once they are merged into `main`.
- The changelog is only as detailed as the commit messages. Good messages now matter, and `CLAUDE.md` says so.
- **Tested locally** with a simulation of a remote, a developer and the workflow's own commands:
  - several commits in one push;
  - a re-run with nothing new;
  - the bot's commit not logged;
  - a concurrent push retried;
  - no duplicates.
  
  **Not yet run on GitHub itself:** it will run on the first push to `main` after the merge.
