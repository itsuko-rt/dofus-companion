---
type: technical
---
# API documentation

*All routes are in `app/api/`. Verified 2026-11-20.*

## Public, read-only game data
| Route | Input | Cache |
|---|---|---|
| `GET /api/graph` | — | static (built once) |
| `GET /api/quests/:id` | numeric id | `max-age=3600` |
| `GET /api/achievements?categories=1,2` | positive integers, at most 200 | `max-age=3600` |
| `GET /api/achievements?ids=10,11` | positive integers, at most 100; rows returned in the order given (recommendations, deep links) | `max-age=3600` |
| `GET /api/achievements/search?q=` | text, trimmed to 80 characters, at least 2; accent-insensitive; matches name, dungeon, objective text, category, description; at most 40 results, each with what matched and the full row | `max-age=3600` |
| `GET /api/achievements/objectives` | — | static |
| `GET /api/encyclopedie/search?q=&kind=` | text trimmed to 80 characters, at least 2; `kind` one of item, monster, dungeon, zone, set (400 otherwise); at most 30 results | `max-age=3600` |
| `GET /api/atelier?lines=id:qty,…&sub=1` | at most 100 lines, quantities 1–100,000, malformed parts ignored; resources and intermediate crafts from the game recipes | `max-age=3600` |
| `GET /api/compagnon/titres` | — ; `{ version, names }`: quest and achievement category, area and subarea names, for the Windows companion's evidence rules | static (built once) |
| `GET /api/compagnon[?guide=<slug>]` | slug `[a-z0-9-]{1,80}` (400 otherwise, 404 unknown); guide list or one guide's steps | `max-age=3600` |

Achievement rows (since 2026-11-21): each objective may carry `place` (`kind` monster, zone or dungeon; `level` range; `zones`), from an exact name match in the game's monster, zone and dungeon tables; `dofus` is a list of `{ name, slug }` (slug of `/guides/dofus/<slug>`). The page adds `v=2` to these URLs so a browser never reuses a cached response of the former shape.
| `GET /api/items/search?q=&type=&min=&max=` | text (60 characters), integers | `max-age=3600` |
| `GET /api/professions/:slug` | `[a-z-]{2,40}` | `max-age=3600` |
| `GET /api/builds?breed=9` | class from an allow-list | upstream cached 1 h (see [[Integrations]]) |

## Accounts (`/api/auth/:action`)
Every POST requires a same-origin request. Bodies are JSON, at most 16 KB.

| Action | Effect |
|---|---|
| `POST register` | Creates an account and starts a session (throttled: 10/h per IP) |
| `POST login` | Starts a session (throttled) |
| `POST logout` | Deletes the session |
| `POST forgot` | Always the same answer; sends a reset link (**no e-mail provider yet**) |
| `POST reset` | New password; ends all sessions |
| `POST delete` | Deletes the account; requires the password |
| `GET me` | Current user, or null |

Busy server (too many password hashes queued): `503` with `Retry-After`.

## Characters
| Route | Auth | Notes |
|---|---|---|
| `GET /api/characters` | session | The user's own characters only |
| `PUT /api/characters/:id` | session, same origin | Body at most 2 MB, validated by `sanitizeCharacter`; at most 20 characters; `409` if the stored copy is newer |
| `DELETE /api/characters/:id` | session, same origin | Scoped to the user |

Responses of auth and character routes are `no-store`. Details and test evidence: [[Security Audit]].

## Windows companion local API (`companion/api.mjs`, since 2026-11-25)
This is served by the companion on the player's PC, not by the site: `http://127.0.0.1:47120`. The site calls it from the browser, once paired ([[Game Companion Design]]).

| Method and path | Body / query | Answer |
|---|---|---|
| `GET /v1/status` | — | `{ app, version, mode, stopped, dofus, active: { characterKey, className, breedId, gameVersion } or null, list, lastEventId }` |
| `GET /v1/events` | `?after=<eventId>` | `{ events: [...] }`, oldest first, at most 200. Event ids sort by time |
| `POST /v1/ack` | `{ acks: [{ eventId, status }] }`, status `applied` / `pending` / `rejected` / `ignored`, at most 500 | `{ ok: true }`. Kept in the companion's log |
| `POST /v1/control` | `{ mode? , stop? }` | the new status |

Every request needs:
- `Authorization: Bearer <64 hex>`, the pairing code shown by the companion;
- a `Host` of `127.0.0.1:47120` or `localhost:47120` (DNS rebinding);
- an `Origin`, when present, from the allow-list: `http://127.0.0.1:3101`, `http://localhost:3101`, `http://localhost:3000`, `http://127.0.0.1:3000`, and the companion's `atlasUrl`.

Bodies are JSON, 64 KB at most. Error codes:

| Code | Meaning |
|---|---|
| 400 | Invalid body or query |
| 401 | Missing or wrong token |
| 403 | Origin not in the allow-list |
| 413 | Body over 64 KB |
| 415 | Not JSON |
| 421 | Wrong `Host` |

CORS answers carry `Access-Control-Allow-Private-Network: true` for Chrome's local-network rules.
