---
type: session
date: 2026-11-25
---
# 2026-11-25 Project overview and automatic changelog

## What changed
- **`docs/PROJECT_OVERVIEW.md`:** the project for someone new to it.
  - Part 1 is non-technical: purpose, what works, what is in progress, what is not possible and why.
  - Part 2 is technical: architecture, stack, databases, data sources, the companion's flow, status, branches, roadmap, limits, tests and security, decisions.
  - Three Mermaid diagrams. Status marks instead of percentages.
  - It links to the vault notes instead of copying them. So docs/ARCHITECTURE.md and docs/ROADMAP.md, suggested by the owner, were **not** created: they would have duplicated [[02 - PROJECT ARCHITECTURE]] and [[01 - PROJECT ROADMAP]], which the overview links to.
- **`CHANGELOG.md`:** all 67 commits reconstructed from git, by `scripts/changelog.ts`. Each entry has the date and time, the linked SHA, the message, the file changes, and the fixes and tests the message mentions. No authors and no e-mail addresses.
- **`.github/workflows/update-changelog.yml`:** adds new commits after each push to `main` ([[ADR-0010 Changelog written by a workflow on main]]).
- **`CLAUDE.md`:** the documentation steps after significant work, now including the overview, and a rule on commit messages. README: links to the overview and the changelog. Vault: dashboard, ADR list, documentation index, [[Operating Instructions]].

## Why
The owner wants a friend to understand the project and follow every update on GitHub, without asking for it each time.

## Files affected
- **New:**
  - `docs/PROJECT_OVERVIEW.md`, `CHANGELOG.md`;
  - `scripts/changelog.ts`, `tests/changelog.test.ts`;
  - `.github/workflows/update-changelog.yml`;
  - [[ADR-0010 Changelog written by a workflow on main]].
- **Changed:**
  - `CLAUDE.md`, `README.md`;
  - [[00 - PROJECT DASHBOARD]], [[Architecture Decision Records]], [[05 - DOCUMENTATION INDEX]], [[Operating Instructions]].

## Tests performed and results
- **`tests/changelog.test.ts`, 5/5.** It covers:
  - order and grouping, links;
  - no duplicates on re-run;
  - several commits in one push;
  - hand edits kept, the bot's commits skipped;
  - file groups, merges;
  - fixes and tests only from the message;
  - no trailers, e-mail addresses or tokens.
- **The script on the real history:** 67 entries. A second run adds nothing.
- **The workflow logic, simulated locally:** a bare remote, a developer and a CI clone running the workflow's own commit step. Results:
  - 3 commits in one push → 3 entries;
  - a re-run adds nothing;
  - the bot's commit is not logged;
  - a concurrent push is retried successfully;
  - no duplicates.
  
  **Bug found and fixed:** the « changed? » check used `git diff`, which does not see a new, untracked `CHANGELOG.md`.
- **Links:** every relative link and heading anchor in `docs/PROJECT_OVERVIEW.md`, `README.md`, `CHANGELOG.md` and `CLAUDE.md` resolves (own checker, 0 broken).
  - The 67 commit links all point to commits on branches already pushed to GitHub; one was opened in a browser.
  - The other external links (5 sites) were not re-checked: this shell had no outbound HTTP.
- **Mermaid:** the 3 diagrams of the overview parse and render with Mermaid 11.4.1, in a browser.
- **Privacy:** no e-mail address, token or key in the new files. No in-game character name, and not the companion's pairing code, anywhere in the repository. `node scripts/check-knowledge.ts` passes.
- **Typecheck** clean; `npm test` **137/137**. E2E not rerun: no site code changed.

## Remaining issues
- **The workflow has not run on GitHub yet.** It runs on the first push to `main` after the branches are merged.
- If `main` gets branch protection, the bot's push needs an exception.
- The GitHub Actions are pinned to major versions (`@v4`), not to commit SHAs.

## Next recommended actions
1. **Owner:** review and push docs/project-documentation, then merge in the order given in the overview.
2. After the first push to `main`, check the « Update changelog » run in the repository's Actions tab.
