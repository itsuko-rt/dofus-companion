// Writes the account-database migrations as Cloudflare D1 migration files (migrations/0001_….sql),
// generated from src/server/appdb.ts so both stay identical. node scripts/export-d1-migrations.ts
// Apply with: npx wrangler d1 migrations apply <database> --remote   (see docs/LANCEMENT_PUBLIC.md §4)
import { mkdirSync, writeFileSync } from 'node:fs';
import { MIGRATIONS } from '../src/server/appdb.ts';

mkdirSync('migrations', { recursive: true });
MIGRATIONS.forEach((sql, i) => {
  const file = `migrations/${String(i + 1).padStart(4, '0')}_app.sql`;
  writeFileSync(file, `-- generated from src/server/appdb.ts (migration ${i + 1}); do not edit by hand\n${sql.replace(/^ {2,}/gm, '  ')}\n`);
  console.log(file);
});
