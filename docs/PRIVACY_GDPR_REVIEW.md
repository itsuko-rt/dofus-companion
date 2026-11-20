# Privacy and GDPR review, 2026-11-20

This is a technical review of what the code does, compared with what `/confidentialite` says. **It is not legal advice.** Items marked ⚖️ need review by a qualified professional (or the AEPD / CNIL guidance) before a public launch in Spain and the EU. Having a privacy page does not by itself make the site compliant.

## What data exists (from the code)
| Data | Where | Retention in code | Policy says it |
|---|---|---|---|
| Progression without an account | browser `localStorage` only | until the user clears it | ✓ |
| E-mail, password hash (scrypt), plan | `users` | until account deletion | ✓ |
| Characters (name, class, level, quests, achievements, builds, notes, history, profession levels) | `characters` | until the character or account is deleted | ✓ |
| Session token hash, dates | `sessions` | 30 days at most; deleted at logout, reset or account deletion | ✓ |
| Reset token hash | `password_resets` | 60 min; deleted when used or expired | ✓ |
| Throttle events (SHA-256 of e-mail and/or IP, timestamp) | `login_failures` | purged after 1 hour | ✓ (these are pseudonymised, not anonymous: the policy says "rendues illisibles", which is fair, but they remain personal data) |
| Screenshots for the scanner | browser memory only | never stored | ✓ (verified in code) |
| Server access logs (IP, URL) | hosting provider | provider's retention | ✓ mentions the host |

**No analytics or ads run by default.** Both depend on environment variables:
- Cloudflare Web Analytics requires `NEXT_PUBLIC_CF_BEACON_TOKEN`;
- AdSense requires `NEXT_PUBLIC_ADSENSE_CLIENT`.

None were set in this audit, and none were enabled.

## Cookies and storage
- **Session cookie and `localStorage`:** strictly necessary for the requested service, so no consent banner is needed for them (ePrivacy art. 5(3) exemption). The policy lists them in a table.
- **Analytics (Cloudflare Web Analytics):** it is cookieless. ⚖️ Whether it needs consent under the AEPD guidance is a legal question (the AEPD is stricter than the CNIL on audience measurement). The policy describes it only when it is enabled.
- **Advertising (AdSense):** must not be enabled until a certified CMP (Google Privacy & messaging) shows a consent choice in the EEA before any ad cookie. `.env.example` and the policy already say so.

## User rights (implemented)
- **Access and rectification:** character pages.
- **Export:** "Exporter" button (JSON of the characters). ⚖️ The export doesn't include the account e-mail or creation date. A full access request (art. 15) may require that, by e-mail on request.
- **Erasure:** "Supprimer mon compte" (password required) deletes the user, sessions, reset tokens and characters immediately, through `ON DELETE CASCADE` (unit test). Host backups keep them until they expire, as the policy says.
- **Contact:** through the legal notice (`LEGAL_CONTACT`, set by environment). It must be set before launch.

## Third parties
| Party | Data | Needs |
|---|---|---|
| Hosting provider (not chosen in the repo) | everything stored, plus access logs | ⚖️ **DPA (art. 28)**; EU location or transfer safeguards |
| Cloudflare (if used as proxy or analytics) | IPs, requests | ⚖️ DPA (Cloudflare's standard DPA); transfer basis (EU-US DPF / SCCs) |
| E-mail provider (needed for password reset, F5) | e-mail addresses, reset links | ⚖️ DPA; to be named in the policy |
| jsDelivr (scanner model download) | IP of scanner users | disclosed; no DPA needed for a public CDN fetch, but ⚖️ to confirm |
| Dofus Fashionista | none from users (the server fetches public builds) | — |
| DofusDB, Dofus Maps, Dofus Pour Les Noobs | only if the user clicks (no referrer for the map links) | disclosed |
| Google AdSense (if ever enabled) | ad cookies, IP | consent first; Google is an independent controller; policy update |

## Gaps and recommendations
1. ⚖️ **Terms of service:** there is no terms page (only `/mentions-legales` and `/confidentialite`). Accounts make one advisable (acceptable use, account termination, liability).
2. ⚖️ **Retention of inactive accounts:** there is no rule. Consider deleting accounts after, for example, 24 months without login, after an e-mail warning. This needs the e-mail provider.
3. ⚖️ **Breach procedure:** nothing is written. Minimum: who decides, notifying the AEPD within 72 hours (art. 33), informing users if the risk is high, and a record of incidents. With only e-mails and scrypt hashes stored, the impact is limited, but a notification may still be required.
4. **Records of processing (art. 30):** this table can serve as its base. ⚖️ Small-organisation exemptions may apply.
5. **Controller identity:** `LEGAL_PUBLISHER`, `LEGAL_CONTACT` and `LEGAL_HOST` must be filled in for production.
6. **Minors:** Dofus players include minors. ⚖️ In Spain, consent-based processing of under-14s needs parental consent. Account data rests on contract performance, but a statement about minors in the policy is advisable.
7. **Password reset:** the policy says the e-mail is used to send reset links, but production cannot send them yet (F5). Either add the provider or adjust the wording before launch.
8. **Done in this review:** the policy now lists DofusDB and Dofus Maps (only when clicked; opened without referrer), and its date was updated.
