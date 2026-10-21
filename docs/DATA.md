# Resolvr data layer (app)

How the app stores, encrypts and proves the integrity of a person's record. Code lives in `app/resources/js/lib/`.

| Folder | What |
| --- | --- |
| `model/` | Zod schemas and types (`schema.ts`), fixed vocabularies (`catalog.ts`), name normalisation (`people.ts`) |
| `crypto/` | PIN → key derivation (`kdf.ts`), AES-256-GCM sealing (`aead.ts`), byte helpers |
| `integrity/` | Canonical JSON, SHA-256, hash chain and verification |
| `db/` | Dexie database, the `Vault` (unlock, lock, encrypted records and blobs, PIN change) and repositories |
| `scoring/` | Evidence score, case readiness, dashboard stats (pure functions) |
| `patterns/` | Pattern detection (pure) |
| `laws/` | Jurisdiction packs (`us.json`) and legal coverage matching |
| `migration/` | Importer for the original prototype's JSON export |

Use it like this:

```ts
import { repositories, Vault } from '@/lib/db';

const vault = (await Vault.exists()) ? await Vault.unlock(pin) : await Vault.create(pin);
const repos = repositories(vault);

const incident = await repos.incidents.create({ title, types, severity, occurredAt, description });
await repos.incidents.annotate(incident.id, 'HR replied today');
const verdict = await repos.incidents.verify(); // { ok, length, head, mismatchedIncidents }

vault.lock(); // forgets the key; register cache clean-up with vault.onLock()
```

## Encryption

- **Key derivation.** The PIN is turned into a 256-bit key with **Argon2id** (19 MiB, 2 passes, 1 lane, the OWASP baseline) running in WebAssembly. If WebAssembly is unavailable, **PBKDF2-SHA256 with 600,000 iterations** is used instead. A random 16-byte salt and the parameters are stored in plaintext in `meta` so the same key can be derived again.
- **The PIN is never stored.** An encrypted key-check value (`meta.keyCheck`) confirms a PIN is correct: if it decrypts, the key is right.
- **The key stays in memory.** It is imported as a non-extractable `CryptoKey`, held only by the `Vault` object, and dropped by `vault.lock()`. Raw key bytes are zeroed after import.
- **AES-256-GCM** encrypts every record and every file, with a fresh random 96-bit IV each time. The record's identity (`incident:<id>`, `blob:<id>`) is bound in as additional authenticated data, so an encrypted record cannot be moved onto another one, and any change to the ciphertext makes decryption fail.
- **What storage reveals.** IndexedDB holds ciphertext plus an id and a kind for each row (for example `incident`, `file`). Someone with the device's storage can count records, but cannot read titles, names, dates or files.

### Limits to be honest about

- A **4-digit PIN** has only 10,000 combinations. Argon2id makes each guess slow, but someone who copies the device's storage could still try them all in hours. The onboarding (P2.2) should offer a longer passcode and say why.
- Anyone who knows the PIN and has the unlocked device can read the record.
- If the PIN is forgotten and there is no backup, the record cannot be recovered. That is the cost of the server never holding a key.

## Storage layout (IndexedDB via Dexie, database `resolvr`)

| Table | Contents |
| --- | --- |
| `meta` | `kdf` parameters, `keyCheck`, `schemaVersion`. No personal data. |
| `records` | `{ id: "<kind>:<id>", kind, iv, ct }`. Kinds: `incident`, `ledger`, `person`, `file`, `profile`, `settings`, `counter`, `draft`. |
| `blobs` | `{ id, iv, ct }`: evidence file bytes as encrypted `ArrayBuffer`s, never base64 strings. |

**Atomic writes.** An IndexedDB transaction closes as soon as code awaits anything else (such as Web Crypto), so the app encrypts first and then writes every row of a change in one transaction (`vault.putMany`). Read-modify-write sequences run one at a time through `vault.exclusive()`, which uses the Web Locks API so two open tabs can never interleave writes.

## Tamper evidence

Every change to an incident (`create`, `edit`, `annotate`, `trash`, `restore`, `import`) appends an entry to a single **ledger** shared by all incidents:

```
hash = SHA-256( prevHash + canonicalJson({ seq, body }) )
```

`body` holds the operation, the time, the incident's INC id and version, and a full snapshot of its content and notes. `canonicalJson` sorts keys, so the same data always hashes the same way. The first entry's `prevHash` is 64 zeros.

- **Edits never overwrite.** The `incident` record is a cache of the latest version (`hash`, `prevHash` and `version` point at its newest ledger entry). The full history is always in the ledger (`repos.incidents.history(id)`).
- **Verification.** `repos.incidents.verify()` recomputes every hash in order and reports the first entry that was changed, removed or reordered. It also flags any cached incident that no longer matches its latest ledger entry.
- **What it proves.** It shows whether the record was changed after each entry was written. It cannot prove that what was written is true, and someone who has the PIN could rebuild a whole new chain; exports (P2.11) include the chain head and a checksum so a copy already shared can be compared later.
- **Imports.** Prototype data was not tamper-evident, so imported incidents start their history at the moment of import, marked `op: 'import'`, with original dates kept in the content.

## INC numbers

`INC-001`, `INC-002`… come from an encrypted counter, one above the highest number ever issued. Deleting an incident never frees its number. Imports keep their original numbers and push the counter past them.

## Ported logic

| Function | Notes |
| --- | --- |
| `scoreParts(incidents, fileCount)` | Same weights and caps as the prototype (25/20/15/10/5/5/20). A test checks it against the prototype's own code on 200 random records. Labels reworded calmly ("Well documented", not "Strong case"). |
| `caseReadiness(incidents, score, fileCount)` | Same stage thresholds; calmer next-step text. |
| `caseStats(incidents, peopleById)` | Totals, serious count, days since last, most-mentioned person. |
| `detectPatterns(incidents, peopleById)` | Same six detectors (repeat person, weekday, escalation, 30-day post-report window, multiple types, witnesses). Returns structured findings with the incident ids involved. Wording avoids legal conclusions. |
| `legalCoverage(types, pack)` | Same idea as the prototype, driven by a versioned jurisdiction pack. Fixes: retaliation types now map to Title VII; "Pay cut" no longer triggers FLSA; triggers match whole words, so "Wage" no longer triggers the age-discrimination law. |

## Migration from the prototype

`importPrototype(json, repos)` accepts the prototype's `resolvr-backup-*.json` export:

- Incident fields map one-to-one. `type` (joined with `; `) becomes `types[]`, and the comma-joined chip fields become arrays.
- Free-text `person` and `witnesses` become `Person` records, de-duplicated by normalised name ("J. Smith" = "j smith").
- `notes` become annotations, keeping their original time in the text.
- Vault files are decoded from data URLs, fingerprinted with SHA-256 and stored encrypted.
- Anything malformed is imported with safe defaults, or listed in `report.skipped` with a reason. Nothing is silently dropped.

## Tests

`npm test` in `app/` runs Vitest with `fake-indexeddb` and Node's Web Crypto. It covers:
- round-trips and tamper attempts on ciphertext, context binding and wrong PINs;
- that no plaintext or PIN reaches storage;
- PIN change and locking;
- INC numbers never being reused;
- versioning, trash and restore;
- chain verification against rewritten, deleted and out-of-band edits;
- score parity with the prototype;
- each pattern detector, legal coverage and the importer.
