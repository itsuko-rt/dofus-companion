# Infrastructure

**Not deployed yet.** Plan from `docs/LANCEMENT_PUBLIC.md` (voie A): a Node machine running `next start`, behind a Cloudflare tunnel, with the domain on Cloudflare. A static host won't work: API routes and accounts need Node.

## Environment variables (`.env.example`)
| Variable | Purpose | Production |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, reset links, turns on HSTS when https | required |
| `APP_DB_PATH` | Accounts database file | required, persistent disk |
| `TRUSTED_IP_HEADER` | Real client IP from the proxy (`cf-connecting-ip`) | required behind Cloudflare |
| `LEGAL_PUBLISHER`, `LEGAL_CONTACT`, `LEGAL_HOST` | Legal notice (LCEN), kept out of Git | required |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics | off until consent is decided |
| `NEXT_PUBLIC_ADSENSE_*` | Ads | off until a CMP is set up |

Never commit real values. `.env.local` is git-ignored.

## Backups
The only user data is the `APP_DB_PATH` SQLite file.
- **Back up while running:** `sqlite3 "$APP_DB_PATH" ".backup '/backups/app-$(date +%F).sqlite'"` (consistent with WAL).
- **Restore:** stop the app, put the backup in place, remove stale `-wal` / `-shm` files, then start. Migrations upgrade old backups.

Status: **procedure documented, not scheduled, never tested.**
