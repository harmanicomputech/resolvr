# Security and privacy audit (Q3)

Last run: October 2026, against the Phase 3 code. Each check has an automated test so it stays true.

| Check | Result | Test |
| --- | --- | --- |
| Evidence and records are encrypted before they touch IndexedDB | Pass. Rows hold only an id, a kind and AES-256-GCM ciphertext; no titles, names, notes or file bytes appear in storage. | `lib/db/security.test.ts` |
| Plaintext `meta` holds nothing personal; the data key is stored only wrapped | Pass (48-byte wrapped key: 32 bytes + GCM tag). The passcode is never stored. | `lib/db/security.test.ts`, `lib/db/vault.test.ts` |
| The key never persists and cannot be read back | Pass. Non-extractable `CryptoKey`, held in memory by `Vault`, dropped on lock; locked vaults refuse to encrypt. | `lib/db/security.test.ts`, `lib/crypto/crypto.test.ts` |
| The hash chain detects edits | Pass. Rewriting a past ledger entry breaks the chain; editing an incident without a ledger entry is flagged; moving ciphertext between records fails authentication. | `lib/db/security.test.ts`, `lib/integrity/integrity.test.ts` |
| Nothing leaves the device unencrypted | Pass. Backups and shares upload ciphertext only; share keys stay in the URL fragment; reminders carry no payload. | `lib/backup/backup.test.ts`, `lib/share/bundle.test.ts`, `BackupApiTest`, `ShareApiTest`, `ReminderTest` |
| CSP blocks inline scripts and styles | Pass. `script-src 'self' 'nonce-…' 'wasm-unsafe-eval'`, no `'unsafe-inline'`; `object-src 'none'`, `frame-ancestors 'none'`. (Development with Vite hot reload is the only exception.) | `SecurityAuditTest`, `SecurityHeadersTest` |
| CSRF on Laravel POST routes | Pass. Every state-changing web route is in the `web` group; the only exemption is the share-target fallback, which accepts nothing. API routes are stateless and authorised by bearer tokens derived on the device. | `SecurityAuditTest` |
| Rate limiting | Pass. Waitlist, AI drafting, backups, shares, share views and reminders are all throttled per IP; every `api/*` write route is checked. | `SecurityAuditTest`, `WaitlistTest`, `AiDocumentTest` |
| The AI route receives only approved fields | Pass. `DraftDocumentRequest` allow-lists every key; unknown fields (a passcode, anything else) are never forwarded. Nothing is logged. | `SecurityAuditTest`, `AiDocumentTest` |
| Uploads stored outside `public_html` with random names | Pass. `storage/app/{backups,shares}` (shared storage, outside the web root), with a `Require all denied` guard; files are named by random 128-bit ids. | `SecurityAuditTest`, `BackupApiTest`, `ShareApiTest` |
| `.env`, `storage` and `vendor` are not web-accessible | Pass. Only `public/` is served (`public_html` → `current/public`, or the shim), and dotfiles are refused by `.htaccess`. | `SecurityAuditTest` |

## Fixed during the audit

- **Unused file-serving route removed.** Laravel 12 registers `PUT /storage/{path}` for the local disk (signed temporary uploads). Resolvr never uses it, so `serve` is now off for that disk and the route no longer exists.

## Known limits (by design, documented for users)

- A 4-digit PIN can be brute-forced by someone who copies the device's storage; 6 digits or a passphrase is the default recommendation. Backups never contain the PIN unlocker for this reason.
- A decoy vault's existence is visible to forensic analysis of the device.
- Anyone holding a full share link can read it until it expires or is turned off.
- Push services can see that a reminder was sent, not what it says.
