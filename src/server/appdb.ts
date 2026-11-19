// User data (accounts, sessions, characters). Separate from the game database, which the import
// rebuilds from scratch: this file is never deleted, only migrated forward.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const MIGRATIONS: string[] = [
  // 1 — accounts, sessions, password resets, characters, login throttling
  `CREATE TABLE users(
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE sessions(
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE password_resets(
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TEXT NOT NULL,
     used_at TEXT
   );
   CREATE TABLE characters(
     id TEXT NOT NULL,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     data TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     PRIMARY KEY(user_id, id)
   );
   CREATE TABLE login_failures(key TEXT NOT NULL, at TEXT NOT NULL);
   CREATE INDEX login_failures_key ON login_failures(key, at);`,
  // 2 — plan of the account (src/plans.ts). Only 'free' exists until payments are integrated.
  `ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';`,
];

const cache = new Map<string, DatabaseSync>();

export function appDb(path = process.env.APP_DB_PATH ?? 'data/app.sqlite'): DatabaseSync {
  const open = cache.get(path);
  if (open) return open;
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  migrate(db);
  cache.set(path, db);
  return db;
}

export function migrate(db: DatabaseSync): number {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set((db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((r) => r.version));
  MIGRATIONS.forEach((sql, i) => {
    const version = i + 1;
    if (done.has(version)) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
  return MIGRATIONS.length;
}
