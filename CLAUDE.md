# Atlas des Douze — instructions for Claude Code

DOFUS 3 companion (Next.js 16, React 19, TypeScript 7, `node:sqlite`). The project's memory is the Obsidian vault in `knowledge/`.

## Before a task (targeted reading, never the whole vault)
1. Read `knowledge/10 - Claude Code/Project Context.md` and `knowledge/03 - DEVELOPMENT STATUS.md`. The vault's entry point is `knowledge/00 - PROJECT DASHBOARD.md`.
2. Use the task → notes table in `knowledge/10 - Claude Code/Operating Instructions.md` to read only the relevant notes (architecture, feature, game research).
3. Check `knowledge/09 - Development Memory/Architecture Decision Records/` and `Bug History/` for the area you touch, and the *Known limitations* section of `03 - DEVELOPMENT STATUS`, and `knowledge/04 - TECHNICAL DEBT.md`.
4. For game facts, reuse the research notes and `knowledge/06 - Research and Sources/` (labels in `Verification Status`) before searching again.

## During and after significant work
Significant means a new feature, a data source, a schema, API or security change, a new dependency, or a removed feature. For that work, in this order:
1. Update the technical notes it touches in `knowledge/` (architecture, API, database, integrations, sources).
2. Update `docs/PROJECT_OVERVIEW.md`, the page for readers new to the project: feature and phase status, branches, test results, limitations. Both of its levels (non-technical, technical) must stay true.
3. Update the vault's dashboards: `00 - PROJECT DASHBOARD`, `03 - DEVELOPMENT STATUS`, `01 - PROJECT ROADMAP`, `04 - TECHNICAL DEBT`, and `05 - DOCUMENTATION INDEX` for new notes.
4. Record real decisions as a new ADR (never rewrite an old one; supersede it), and new limitations where they belong.
5. Run `node scripts/check-knowledge.ts` after editing the vault (links, paths, secrets).
6. End with a session summary in `knowledge/09 - Development Memory/Session Summaries/` (template `knowledge/Templates/Development Session.md`).
7. Check that what the documentation says matches the code and the last test run. Status marks: built and tested; built, not verified for real; planned; blocked; rejected. Never a progress percentage that was not measured.

Skip all of this for trivial changes (typos, small refactors, a style tweak).

`CHANGELOG.md` is written by the « Update changelog » workflow after each push to `main` (`scripts/changelog.ts`, ADR-0010). Do not add entries by hand. The changelog is only as good as the commit messages, so write them for a reader:
- a clear subject;
- then what was added, changed, removed and fixed;
- the tests run, with their results.

`node scripts/changelog.ts --check` says whether commits are missing from it.

## Memory discipline
- Keep apart: implemented and tested, planned, research finding, assumption, decision, known limitation.
- Never write that something works unless it was run and tested.
- Label research VERIFIED, COMMUNITY, UNVERIFIED, OUTDATED or HYPOTHESIS. Community advice is never presented as game mechanics.
- No secrets, tokens, passwords, real user data or private screenshots in `knowledge/` or anywhere in Git.

## Hard rules for the code
- Game data comes from the game files (`npm run import`). Never invent data: unknown means shown as unknown.
- Link community sites (DPLN, Fashionista, DofusDB, Dofus Maps); never copy or scrape them.
- Never interact with the game client.
- Commit or push only when the owner asks. The owner's e-mail stays private.
- The Windows game companion lives in `companion/` (Electron, its own `package.json`; `npm start` there, `npx electron . --self-test` to check it against a running DOFUS; `--self-test-read <image> <list>` and `--self-test-ui` need no game). It shares pure logic with the site by importing `src/*.ts`. It only reads the DOFUS window title and pixels; the site applies progress (ADR-0009 in `knowledge/09 - Development Memory/Architecture Decision Records/`).
- Checks: `npm run typecheck`, `npm test`; E2E with `npx playwright test` against `next start -p 3100`.
- Write files containing backslashes with the editor tools, not shell heredocs (see Lessons Learned in the vault).
