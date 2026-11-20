# GDPR and privacy

Detailed review: `docs/PRIVACY_GDPR_REVIEW.md`. Policy page: `app/confidentialite/page.tsx`. **This note is technical, not legal advice.**

## Data held
- **Account:** e-mail, scrypt hash, plan, characters, session and reset token hashes (time-limited), and throttling events as hashes (1 h).
- **Without an account:** browser `localStorage` only.
- **Screenshots:** never leave the browser.

## Implemented rights
- Access and rectification (character pages).
- JSON export (characters only).
- Immediate account deletion (cascade).

## Open legal questions (need a professional)
- Terms of service page (none).
- DPAs with the host, Cloudflare and the future e-mail provider.
- Breach procedure (72 h notification to the AEPD).
- Retention rule for inactive accounts.
- Minors (Spain: under 14).
- AEPD position on cookieless analytics.
- Whether the export must include the e-mail and creation date.

## Consent
- Session cookie and `localStorage` are strictly necessary, so no banner is needed for them.
- AdSense stays off until a certified consent platform is set up.
- Analytics stays off until its consent position is confirmed for Spain.
