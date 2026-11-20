# Obsidian setup report (2026-11-20)

Work done by Claude Code on branch docs/obsidian-setup. Session note: [[2026-11-20 Obsidian setup]].

## 1. What was already installed
- **Obsidian 1.15.1** in `%LOCALAPPDATA%\Programs\Obsidian` (up to date, per its own log). It was running, but **no vault had ever been registered**: there was no `%APPDATA%\obsidian\obsidian.json`.
- No other vault on the PC (searched Documents and Desktop). No `Atlas-des-Douze-Knowledge-Base.zip`, so nothing was extracted. The existing `knowledge/` folder from commit `8b16623` is the vault.

## 2. What was already configured
- `knowledge/` with 84 notes in the requested structure, the five templates, six ADRs, and the frontmatter labels.
- `.obsidian/`: `app.json` (attachments folder, links auto-update), `templates.json` (folder `Templates`, date `YYYY-MM-DD`), `core-plugins.json`, and `bookmarks.json` (Home bookmarked).
- `CLAUDE.md` with the vault workflow, `scripts/check-knowledge.ts`, and `.gitignore` rules for the workspace state.

## 3. What I configured
- **Registered the vault:** the `obsidian://open?path=` link does not register an unknown folder. So I closed Obsidian (it had no vault open, so nothing was lost), wrote `obsidian.json` with `knowledge/` as the open vault, and restarted it. Obsidian then created `workspace.json` in the vault, which shows it opened it.
- **Obsidian's defaults:** on first opening, Obsidian added its default core plugins to `core-plugins.json`: Canvas, Bases, File recovery and Note composer are on. It also created `appearance.json` (ribbon shown). Both files are kept in Git because they hold no personal data.
- **Dashboard:** rebuilt [[Home]] with a status snapshot, a feature status table (implemented, in progress, planned, blocked or rejected, NEEDS VERIFICATION), active priorities, and sections for the technical docs, game research, builds, professions, security and deployment.
- **Research view:** `06 - Research and Sources/Research.base` lists every note with `type: research`, grouped by its label. It is a native Bases view, so no plugin is needed. Home embeds it.

## 4. Documentation populated or corrected
- [[Architecture]]: the installed package versions (read from `node_modules`) and a table of all 24 page routes (read from `app/**/page.tsx`).
- [[XP Routes]] and [[Kamas Routes]]: research frontmatter completed (source: none found, confidence low, HYPOTHESIS). Every research note now has a source, source type, game version, research date, verification date and confidence. The other 18 already did.
- [[Verification Status]]: added NEEDS VERIFICATION, a technical marker kept separate from the research labels. [[Documentation Rules]] now lists the status words *in progress*, *rejected* and *needs verification*.
- [[Current Status]], [[Milestones]] and one session summary: changed "not pushed" to pushed (the commits are on `main` since 2026-11-20).
- The decision to drop the internal map is unchanged: [[ADR-0005 Remove the in-site map]]. Home shows it as rejected, and `/carte` links to DofusDB and Dofus Maps.
- Not added: class play advice, XP and kamas routes. There is still no sourced data for them, and nothing was invented.

## 5. Claude Code integration
`CLAUDE.md` keeps all of its rules. Two retrieval steps were added before a task:
- check the *Known limitations* section of [[Current Status]];
- reuse existing research and the labels in `06 - Research and Sources` before searching again.

[[Operating Instructions]] now records the plugin assessment below.

## 6. Plugins
None installed. Data checked on GitHub on 2026-11-20; all four support Obsidian 1.15.1.

| Plugin | Maintenance | Recommendation |
|---|---|---|
| Dataview (MIT) | Last release 0.5.70 in April 2025 | **Not needed:** the core Bases plugin does the same queries without third-party code |
| Templater (AGPL) | 2.27.0, November 2026 | **Not needed:** the core Templates plugin covers our static templates |
| Excalidraw (AGPL) | 2.29.2, November 2026 | **Optional:** only if you want hand-drawn diagrams; Mermaid already renders |
| Obsidian Git (MIT) | 2.43.0, November 2026 | **Not recommended:** the vault lives in the code repository, and commits go with the code |

If you want one, approve it in chat and install it from Obsidian's own browser (Settings → Community plugins).

## 7. Tests performed
| Check | Result |
|---|---|
| `node scripts/check-knowledge.ts` (links, headings, repository paths, secret and e-mail patterns, required files, `CLAUDE.md` reference) | Passes. The checker now also resolves `.base` embeds |
| Obsidian opens the vault | Yes: `workspace.json` was created after the restart |
| Dashboard opens with `obsidian://open?vault=knowledge&file=00 - Dashboard/Home` | Yes: `workspace.json` shows Home as the active file and `Research.base` as loaded |
| Git: `workspace.json` ignored | Yes (`git check-ignore`) |
| No secrets added | Checker passes; the changed files hold only documentation and Obsidian settings |

## 8. What remains incomplete (manual checks)
I could not see the Obsidian window (no screen access in this session). Please check:
1. Home renders, and its links open the right notes.
2. The embedded **Research by label** table shows about 20 notes grouped by label. This is NEEDS VERIFICATION: the Bases syntax was written from the documentation, not seen on screen.
3. *Templates: Insert template* (command palette) lists the five templates and fills in `{{date}}`.

Also:
- **Permanent location (since 2026-11-20):** the repository is cloned to `Documents\Atlas-des-Douze` on the owner's PC (with `core.longpaths true`). Obsidian's only registered vault is its `knowledge` folder. The local-only files (`data/`, `public/ankama/`) were copied there; they are git-ignored. The first copy, in a temporary Claude session folder, is no longer used.
- `.gitattributes` keeps the vault in LF line endings, so Obsidian's rewrites of `.obsidian/*.json` no longer show as changes on Windows.
- The setup commit reached `main` through PR #1. Later commits (line endings, this location note) are on branch docs/obsidian-setup until merged.

## 9. How to open and use the vault
- **Open it:** start Obsidian. It reopens `Documents\Atlas-des-Douze\knowledge` automatically; to switch vaults, use the vault icon at the bottom left.
- **Start here:** [[Home]] (also bookmarked).
- **New note from a template:** create a note, then run *Templates: Insert template* from the command palette (Ctrl+P).
- **Find by label:** open `Research.base`, or search `verification: COMMUNITY`.
- **Before committing vault edits:** run `node scripts/check-knowledge.ts` from the repository root.
