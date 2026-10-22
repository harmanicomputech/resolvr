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

- **Envelope encryption.** Everything is encrypted with one random 256-bit **data key**. The data key is only ever stored *wrapped* (encrypted), once per way of unlocking, in `meta.unlockers`:
  - `pin`: wrapped with a key derived from the passcode by **Argon2id** (19 MiB, 2 passes, 1 lane, the OWASP baseline) in WebAssembly, or **PBKDF2-SHA256 with 600,000 iterations** if WebAssembly is unavailable. The random salt and parameters are stored next to it.
  - `passkey` (optional): wrapped with a key from the passkey's **WebAuthn PRF** output (HKDF-SHA256). The passkey never talks to our server; it only unlocks this device.
  - `recovery` (P2.12): wrapped with a key from the 12-word recovery phrase (BIP39 English list, 128 bits; HKDF-SHA256). It restores backups on a new device and can set a new passcode on this one ("Forgot your passcode?").
- **The passcode is never stored.** A wrong passcode simply fails to unwrap the data key (AES-GCM authentication fails).
- **Changing the passcode** re-wraps the data key; the data itself is not re-encrypted. Adding a passkey asks for the passcode again, because the in-memory key cannot be read back out.
- **The key stays in memory.** The unwrapped data key is imported as a non-extractable `CryptoKey`, held only by the `Vault` object, and dropped by `vault.lock()`. Raw key bytes are zeroed after import.
- **AES-256-GCM** encrypts every record and every file, with a fresh random 96-bit IV each time. The record's identity (`incident:<id>`, `blob:<id>`) is bound in as additional authenticated data, so an encrypted record cannot be moved onto another one, and any change to the ciphertext makes decryption fail.
- **What storage reveals.** IndexedDB holds ciphertext plus an id and a kind for each row (for example `incident`, `file`). Someone with the device's storage can count records, but cannot read titles, names, dates or files.

### Limits to be honest about

- A **4-digit PIN** has only 10,000 combinations. Argon2id makes each guess slow, but someone who copies the device's storage could still try them all in hours. Onboarding recommends 6 digits (the default) or a passphrase and says why; 4 digits stays available because the prototype used it.
- The 5-attempt lockout protects the screen, not the stored data: it slows someone holding the unlocked-screen device, not someone who has copied the storage.
- Anyone who knows the PIN and has the unlocked device can read the record.
- If the PIN is forgotten and there is no backup, the record cannot be recovered. That is the cost of the server never holding a key.

## Locking and stealth (P2.2)

- **Lock** forgets the data key and drops every decrypted object held by the app (`useSession().lock()`; screens read through `useData`, which returns nothing once locked). A reload always starts locked.
- **Auto-lock** after 1, 2 (default), 5, 10 or 30 minutes without input, or never; **lock on hide** (default on) locks as soon as the tab or app is hidden.
- **Lockout**: 5 wrong passcodes, then a 30-second pause with a countdown ring. The counter is stored so a reload does not reset it.
- **Stealth mode** shows a working calculator instead of the lock screen, and swaps the tab title, favicon and manifest to "Calculator". Typing the passcode then "=" unlocks; a wrong guess just behaves like a calculator. Passphrase users press and hold "=" to reach the normal lock screen. Already-installed apps keep their icon (browsers do not allow changing it), so Settings explains how to reinstall it disguised.
- **Panic**: Escape twice, a firm shake, or (in the app shell) triple-tapping the logo locks instantly and shows the calculator, whatever the stealth setting.
- **Passkey unlock** (optional): offered on devices whose passkeys support the PRF extension. The passkey's name in the system sheet is "Resolvr", which stealth users should know.

## Decoy passcode (P2.12)

- A second passcode opens a **separate vault** in its own database (`resolvr-decoy`), created empty with onboarding already done, so it looks like an ordinary new record. Nothing in it refers to the real one.
- When a decoy exists, every unlock tries **both** vaults, so the time taken does not show which passcode was entered. Wrong guesses count towards the same lockout.
- While the decoy is open, Settings hides the decoy and passkey rows, and "Delete" removes only the decoy.
- Limit: someone who copies the device's storage can see that a second database exists. The decoy protects against being made to unlock the app in person, not against forensic analysis.

## Backup and restore (P2.12)

- **The backup file** (`.resolvr`, `lib/backup/format.ts`) is a copy of the IndexedDB rows **as they are stored**: already encrypted with the data key, so making one never decrypts anything. It carries the `recovery` unlocker and **never the `pin` one**, because a short PIN could be guessed offline by whoever holds the file; a 128-bit phrase cannot.
- A **manifest** sealed with the data key holds the record and file counts and a SHA-256 over every frame's hash. Restore refuses a file that was cut short, re-ordered or mixed with another backup, and deletes anything it wrote.
- **From the phrase** the device derives (HKDF-SHA256): the wrapping key, a 128-bit **backup id**, and a 256-bit **access token**. The server stores the id, a SHA-256 of the token, the ciphertext, its size and hash, and the upload time. It never sees the phrase, a key, or plaintext.
- **Upload** (`/api/backups/{id}`): the file goes up in 4 MB chunks and replaces the stored copy only once every chunk has arrived and the whole file matches the announced size and SHA-256. Storage is `storage/app/backups`, outside the web root. Limits: 250 MB per backup and a total cap (both configurable), 120 requests a minute per IP.
- **Daily backup** (optional) runs quietly after unlock when the last one is more than a day old. The same file can be downloaded as an **encrypted export** and kept anywhere.
- **Restore on a new device**: "I have a backup" on the welcome screen, enter the phrase (online copy or a `.resolvr` file), then choose a new passcode. The phrase is checked against the backup before anything is written.
- **What the server can infer**: that a backup exists, its size and when it changed. Not what is in it, nor who made it (there are no accounts; requests are rate-limited by IP but IPs are not stored).
- **Readable export** (Settings → Your data): an unencrypted JSON copy of incidents, people, documents and the ledger, after re-entering the passcode. Evidence files are listed by hash, not included.

## Reminders (P2.12)

- Web push with **no payload**. The server stores the push address, time zone, chosen time and days, and a hash of a random token the device made. Each due reminder is an empty POST to the push service signed with VAPID (ES256, `app/Push/Vapid.php`), sent by `reminders:send` from cron.
- The **service worker** words the notification: "A quiet moment to note anything from today…" or, when disguised (a setting, or always in stealth mode), "Reminder: Time to jot down today’s notes" with the calculator icon. It reads one plaintext flag, `meta.reminderStyle`, because it runs while the vault is locked. Nothing about incidents is ever sent or shown.
- Push services (Google, Apple, Mozilla) see that this site sent a push, not its contents. Expired subscriptions (404/410) are deleted; ten failures in a row also remove one.

## Jurisdiction packs and time limits (P3.1)

- Legal content lives in versioned JSON packs, `app/resources/js/lib/laws/{us,uk,ng,ca}.json`: for each statute a plain-language `summary`, the incident-type `triggers` (whole-word matches), where to go (`agency`), and a typical `limitation` (days, what starts the clock, a label and a note). Packs also carry `lawyerHelp` and `support` links.
- `reviewedBy` is `null` in every pack until a qualified lawyer for that jurisdiction reviews it; the app and the case file then say "Not yet reviewed by a lawyer". Bump `version` with every content change. Packs are bundled with the app, so they work offline and nothing about the record is sent anywhere to use them.
- **Time limits** (`lib/laws/deadlines.ts`) are counted cautiously from the *first* incident that suggests each law, giving the earliest possible date. If that date has passed, the dashboard shows the date counted from the most recent related incident and says that some limits may have passed, without alarm. Limits that run from something the record does not hold (for example the end of employment) are explained but not counted.
- Always general information, never legal advice: every surface showing a pack says so and links to a lawyer-finding service.

## Attorney share (P3.2)

- **What is shared**: only the incidents the person ticks, optionally their attached files and their name, plus an optional note. The bundle (`lib/share/bundle.ts`) is a JSON manifest followed by the file bytes, encrypted with **AES-256-GCM under a fresh random 256-bit key** in the browser.
- **The key travels only in the link's #fragment** (`/s/{id}#{key}`). Browsers never send the fragment to a server, so the server stores ciphertext it cannot open. The viewer page sends `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` and `Cache-Control: no-store`.
- **Server side** (`ShareController`): a random 128-bit id and an owner token (only its SHA-256 is kept), the ciphertext in `storage/app/shares` (outside the web root), an expiry of 24 hours or 7 days, and a view log of time plus a coarse description such as "Chrome on Windows" (no IP addresses). The owner can see views and turn the link off, which deletes the file at once. `shares:prune` (hourly) deletes expired files and forgets shares 30 days after they end.
- **The viewer** (`resources/views/share.blade.php` + `resources/js/share-viewer.ts`) is a minimal page outside the app and its service worker. It decrypts in the reader's browser and inserts all shared text with `textContent`, never as HTML. Each incident shows the hash recorded when it was logged and each file its SHA-256.
- **On the device**, each share (id, owner token, key, what was included, expiry) is stored encrypted as a `share` record, so the link can be copied again or turned off later.
- Limits: anyone who has the full link can read it until it expires or is turned off; the reader could save a copy while it is open.

## Storage layout (IndexedDB via Dexie, database `resolvr`)

| Table | Contents |
| --- | --- |
| `meta` | `unlockers` (wrapped data keys + KDF parameters), `schemaVersion`, and three non-sensitive flags needed before unlocking: `pinFormat` (4 digits, 6 digits or passphrase), `stealth`, `lockout` (failed-attempt counter). No personal data. |
| `records` | `{ id: "<kind>:<id>", kind, iv, ct }`. Kinds: `incident`, `ledger`, `person`, `file`, `profile`, `settings`, `counter`, `draft` (unfinished incidents, saved on every change), `view` (saved list filters, which can contain names). |
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

## Evidence files (P2.7)

- **On the way in** each file is fingerprinted (SHA-256), its own capture date is read where possible (EXIF "date taken" for JPEG photos, otherwise the file's date), a tiny blurred preview (about 24 px) is made for images, and the bytes are encrypted into `blobs`. The preview and all metadata are encrypted with the record.
- **Fingerprint check**: "Check it has not changed" decrypts the file, hashes it again and compares.
- **Redaction** draws black boxes on a *copy* (`name (redacted).png`); the original and its fingerprint never change.
- **OCR** (Tesseract.js) runs entirely on the device from files served by our own origin (`/ocr`, copied from `node_modules` by `npm run build`). The recognised text is stored encrypted in the file's metadata so search can find it.
- **Sharing into Resolvr** (Web Share Target): the service worker cannot decrypt or encrypt (it never has the key), so shared files wait in a private browser cache until the app is next unlocked, are then encrypted into the vault's "Shared" folder, and the cache is deleted. Without the service worker the server accepts nothing and just redirects.
- **Deleting** a file asks for the passcode; files that are evidence for an incident must be unlinked first.

## Exports

PDFs (single incidents, drafted letters, and the HR and Legal dossiers) are generated **in the browser** with `@react-pdf/renderer`, and Word files with `docx`, from decrypted data held in memory. Nothing is uploaded to make them. (The prompt pack suggested dompdf and PHPWord on the server; that would send letters and records to the server in plain text, so exports are made on the device instead.)

### Case file and verification (P2.11)

- The dossier (`app/resources/js/app/pdf/dossier/`) is rendered twice: the first pass is read with `pdf-lib` for the page each section's named destination landed on, the second prints those numbers in the contents. "Page n of N" is stamped afterwards (`pdf/postprocess.ts`) because react-pdf's `render` callbacks produce no text in the version we ship.
- The verification appendix lists the ledger head, every included record's latest hash and each evidence file's SHA-256, plus an **export fingerprint**: SHA-256 over the ledger head prefix, the included incident IDs and the file hashes (`lib/integrity/fingerprint.ts`).
- The QR code and printed link point to `/verify#v1.<fingerprint>.<head16>.<ids>`. Everything is in the URL fragment, so it never reaches the server. Opening it in Resolvr on the author's device recomputes the fingerprint from the local ledger and says whether the document still matches. A third party without the vault can only compare the printed hashes; the page says so plainly.

## AI drafting (P2.10)

The only time incident text leaves the device is when the person asks for a draft:

- The studio builds the exact request in the browser from the incidents and fields the person ticks, and shows it under **What will be sent** before anything is sent. Files never leave the device; only "what evidence exists" in words, if chosen.
- `POST /ai/complaint` (Laravel) validates and caps every field, is rate limited per address (12 an hour, 40 a day), and streams the request to Anthropic's Messages API (`claude-opus-5-5`, server-side refusal fallbacks on) with the API key from `.env`. The response comes back as server-sent events. Nothing about the request is stored or logged; failures are reported by type only.
- The system prompt tells the model to use only the facts given, to avoid legal conclusions and outcome predictions, to use placeholders for anything missing, and to treat the record as data rather than instructions.
- Drafts are saved encrypted on the device (`document` records). A refusal discards any partial text and says so calmly.

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
