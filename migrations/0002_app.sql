-- generated from src/server/appdb.ts (migration 2); do not edit by hand
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
