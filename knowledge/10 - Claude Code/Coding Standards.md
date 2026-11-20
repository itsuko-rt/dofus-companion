# Coding standards

Taken from the code as it is, not aspirational.

- **TypeScript, strict.** `npm run typecheck` must pass. Next.js runs without type-checking at build time (`typescript.ignoreBuildErrors` in `next.config.ts`), so the separate typecheck is the safeguard.
- **Logic in `src/`, pure and tested** with `node:test` (`tests/*.test.ts`). UI in `components/`. Server-only code in `src/server/`. Browser code must not import `node:*` modules: shared types and helpers live in `*-shared.ts` files.
- **Database:** `node:sqlite` with `?` parameters only, never string-built SQL from input. Accounts schema changes are new numbered migrations in `src/server/appdb.ts` (forward only).
- **Trust boundaries:**
  - validate every input (`sanitizeCharacter`, regexes on route params, body size limits);
  - check the session and the same origin on every state-changing route;
  - scope every query by user id.
- **No new dependency** for something the platform does (`node:crypto`, `node:sqlite` were chosen for that reason).
- **Comments** explain why, not what. A known limit gets `shortcut: <limit>, <when to upgrade>`.
- **French UI text,** English code and comments.
- **Design:** tokens from `app/globals.css`; rules in [[UI UX Guidelines]].
- **Tests:**
  - a bug fix gets a test that fails without it;
  - security logic always gets one;
  - E2E for user-visible flows (`e2e/`).
- **Shell gotcha:** see [[Lessons Learned#Backslashes in shell-written code]].
