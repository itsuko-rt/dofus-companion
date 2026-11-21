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
