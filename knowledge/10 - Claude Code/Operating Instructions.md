# Operating instructions for Claude Code

The repository's `CLAUDE.md` points here. These rules apply to every task in this repository.

## Workflow
Research → Verification → Knowledge base → Specification → Implementation → Tests → Documentation update.

## Before development (targeted, never the whole vault)
1. Read [[Project Context]] (short) and [[Current Status]].
2. Read only the notes for the area the task touches:

| Task touches | Read |
|---|---|
| Quests, achievements, conditions | [[Architecture]], [[Data Pipeline]], [[Quests]], [[Achievements]] |
| Accounts, sessions, API | [[Authentication]], [[API Documentation]], [[Security Overview]] |
| Scanner | [[Character Sync OCR]] |
| Builds, equipment, classes | [[Builds and Progression]], [[Cra]] / [[Pandawa]], [[Integrations]] |
| Professions | [[Professions]] and the profession's note |
| UI | [[Visual Identity]], [[UI UX Guidelines]], [[Components]] |
| Deployment, privacy | [[Infrastructure]], [[GDPR and Privacy]], [[Release Checklist]] |
| Game facts or sources | [[Official Sources]], [[Community Sources]], [[Verification Status]] |

3. Check [[Architecture Decision Records]] and [[Bug History]] for the same area.
4. If a feature has a spec in `01 - Project Management` or a feature note, follow it.

## During development
When the change is significant (new feature, new data source, schema or API change, security change, new dependency, removed feature):
- update the matching technical note;
- add an ADR for a real decision (never edit an old decision: supersede it);
- record new dependencies and integrations in [[Integrations]];
- record new game-data sources in [[Official Sources]] or [[Community Sources]], with their labels;
- update the status in [[Current Status]], [[Feature Backlog]] or [[Product Roadmap]], and new limits in [[Current Status#Known limitations]].

Skip all of this for trivial changes (typos, small refactors, a style tweak).

## After development
For significant work, add a session summary in `09 - Development Memory/Session Summaries/` named `YYYY-MM-DD <topic>.md`, from [[Development Session]]. It covers what changed and why, files affected, tests and results, remaining issues, and next steps.

## Memory discipline
- Keep apart: **implemented** (code exists, tested), **planned**, **research finding**, **assumption**, **decision**, **known limitation**.
- Never mark something as working without having run it and its tests. Write what was checked.
- Never present COMMUNITY or UNVERIFIED information as official game mechanics.
- When sources disagree, keep both and say so.
- No secrets, tokens, passwords, real user data or private screenshots in the vault.

## Plugins
The vault works with core Obsidian only. Assessment (2026-11-20):

| Plugin | Value here | Decision |
|---|---|---|
| Dataview | Could list notes by `verification` or `status` from the frontmatter | **Optional.** Frontmatter is already Dataview-compatible; nothing depends on it |
| Templater | Dynamic templates | **Not needed.** The core *Templates* plugin covers our plain templates |
| Excalidraw | Diagrams | **Not needed now.** Architecture diagrams are Mermaid blocks, which Obsidian and GitHub render natively |
| Obsidian Git | Commit from Obsidian | **Not recommended.** The vault is in the project repo, and commits are made with the rest of the code |

Community plugins are third-party code: install them only from Obsidian's own plugin browser, and only when a need appears.
