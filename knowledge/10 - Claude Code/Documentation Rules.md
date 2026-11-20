# Documentation rules

1. **One place per fact:** a fact lives in one note; other notes link to it. The long reports in `docs/` are the detailed record; vault notes summarise them and link to them.
2. **Labels on research:** VERIFIED, COMMUNITY, UNVERIFIED, OUTDATED, HYPOTHESIS, as defined in [[Verification Status]]. Research notes use the frontmatter of [[Research Template]].
3. **Status words for features:**
   - **implemented** (with how it was tested);
   - **planned**;
   - **idea**;
   - **blocked** (on what);
   - **removed** (with the ADR).
4. **Decisions:** one ADR per decision, numbered, never rewritten. A change of mind is a new ADR that says *Supersedes ADR-000N*, and the old one gets *Superseded by …* added at the top.
5. **Dates:** absolute (`2026-11-20`), never "yesterday".
6. **Links:** Obsidian wikilinks `[[Note]]` inside the vault (note names are unique). Repository files as code: `src/server/auth.ts`.
7. **Privacy:** no secrets, no real user data, no private screenshots. Test accounts are described, never their passwords.
8. **Size:** short notes, tables over prose for facts, no copies of source code.
9. **Session summaries** only for significant work.
