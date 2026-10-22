import {
    deriveKey,
    newKdfParams,
    open as openBytes,
    openJson,
    randomBytes,
    seal,
    sealJson,
    type KdfParams,
    type Sealed,
} from '../crypto';
import { ResolvrDatabase, type RecordKind } from './database';

/**
 * The encrypted vault (envelope encryption).
 *
 * Everything is encrypted with one random 256-bit data key. That key is stored
 * only in wrapped (encrypted) form, once per way of unlocking: by the PIN
 * (through Argon2id), and optionally by a passkey or a recovery phrase. The
 * PIN is never stored; a wrong PIN simply fails to unwrap the key. Once
 * unwrapped, the data key is held as a non-extractable CryptoKey in this
 * object only, and dropped on lock().
 */

export type UnlockMethod = 'pin' | 'passkey' | 'recovery';

export interface PinUnlocker {
    kdf: KdfParams;
    dek: Sealed;
}
export interface SecretUnlocker {
    dek: Sealed;
    /** Method-specific public data, e.g. the passkey's credential id and PRF salt. */
    data?: Record<string, string>;
}
export interface Unlockers {
    pin: PinUnlocker;
    passkey?: SecretUnlocker;
    recovery?: SecretUnlocker;
}

const wrapContext = (method: UnlockMethod) => `meta:dek:${method}`;

async function importDataKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    try {
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } finally {
        raw.fill(0);
    }
}

export class WrongPinError extends Error {
    constructor() {
        super('That PIN is not right');
        this.name = 'WrongPinError';
    }
}

export class VaultLockedError extends Error {
    constructor() {
        super('The vault is locked');
        this.name = 'VaultLockedError';
    }
}

export interface VaultOptions {
    db?: ResolvrDatabase;
    /** Test hook: cheaper KDF parameters. Never set in production. */
    kdf?: { prefer?: 'argon2id' | 'pbkdf2-sha256'; memoryKiB?: number; iterations?: number };
}

export class Vault {
    #key: CryptoKey | null;
    readonly db: ResolvrDatabase;
    readonly #listeners = new Set<() => void>();
    #queue: Promise<unknown> = Promise.resolve();

    private constructor(db: ResolvrDatabase, key: CryptoKey) {
        this.db = db;
        this.#key = key;
    }

    /** True once a PIN has been set up on this device. */
    static async exists(db = new ResolvrDatabase()): Promise<boolean> {
        return (await db.meta.get('unlockers')) !== undefined;
    }

    /** First run: create the vault with a fresh data key, wrapped by `pin`. */
    static async create(pin: string, options: VaultOptions = {}): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        if (await Vault.exists(db)) throw new Error('A vault already exists on this device');
        const raw = randomBytes(32);
        const kdf = await newKdfParams(options.kdf?.prefer, options.kdf);
        const unlockers: Unlockers = {
            pin: { kdf, dek: await seal(await deriveKey(pin, kdf), raw, wrapContext('pin')) },
        };
        await db.transaction('rw', db.meta, async () => {
            await db.meta.put({ key: 'unlockers', value: unlockers });
            await db.meta.put({ key: 'schemaVersion', value: 2 });
        });
        return new Vault(db, await importDataKey(raw));
    }

    /** Unwrap the data key with `pin`. */
    static async unlock(pin: string, options: VaultOptions = {}): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        const raw = await Vault.#unwrapWithPin(db, pin);
        return new Vault(db, await importDataKey(raw));
    }

    /** Unwrap the data key with a passkey or recovery wrapping key (see crypto.keyFromSecret). */
    static async unlockWith(
        method: Exclude<UnlockMethod, 'pin'>,
        wrappingKey: CryptoKey,
        options: VaultOptions = {},
    ): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        const unlocker = (await Vault.unlockers(db))[method];
        if (!unlocker) throw new Error(`No ${method} is set up on this device`);
        try {
            const raw = new Uint8Array(await openBytes(wrappingKey, unlocker.dek, wrapContext(method)));
            return new Vault(db, await importDataKey(raw));
        } catch {
            throw new WrongPinError();
        }
    }

    /**
     * Restore onto an empty database from a backup's recovery unlocker: unwrap
     * the data key with the recovery phrase and wrap it again for a new PIN.
     * The caller then writes the backup's encrypted rows as they are.
     */
    static async fromRecovery(
        recovery: SecretUnlocker,
        wrappingKey: CryptoKey,
        newPin: string,
        options: VaultOptions = {},
    ): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        if (await Vault.exists(db)) throw new Error('A vault already exists on this device');
        return Vault.#rewrapPin(db, recovery, wrappingKey, newPin, options);
    }

    /** Forgot the PIN but kept the recovery phrase: set a new PIN on this device. */
    static async resetPinWithRecovery(
        wrappingKey: CryptoKey,
        newPin: string,
        options: VaultOptions = {},
    ): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        const { recovery } = await Vault.unlockers(db);
        if (!recovery) throw new Error('No recovery phrase is set up on this device');
        return Vault.#rewrapPin(db, recovery, wrappingKey, newPin, options);
    }

    static async #rewrapPin(
        db: ResolvrDatabase,
        recovery: SecretUnlocker,
        wrappingKey: CryptoKey,
        newPin: string,
        options: VaultOptions,
    ): Promise<Vault> {
        let raw: Uint8Array<ArrayBuffer>;
        try {
            raw = new Uint8Array(await openBytes(wrappingKey, recovery.dek, wrapContext('recovery')));
        } catch {
            throw new WrongPinError();
        }
        const kdf = await newKdfParams(options.kdf?.prefer, options.kdf);
        const pin: PinUnlocker = { kdf, dek: await seal(await deriveKey(newPin, kdf), raw, wrapContext('pin')) };
        const existing = (await db.meta.get('unlockers'))?.value as Unlockers | undefined;
        await db.transaction('rw', db.meta, async () => {
            await db.meta.put({ key: 'unlockers', value: { ...existing, pin, recovery } satisfies Unlockers });
            if (!existing) await db.meta.put({ key: 'schemaVersion', value: 2 });
        });
        return new Vault(db, await importDataKey(raw));
    }

    /** Does this wrapping key open a recovery unlocker? (Checks a phrase before asking for a new PIN.) */
    static async opensRecovery(recovery: SecretUnlocker, wrappingKey: CryptoKey): Promise<boolean> {
        try {
            new Uint8Array(await openBytes(wrappingKey, recovery.dek, wrapContext('recovery'))).fill(0);
            return true;
        } catch {
            return false;
        }
    }

    static async unlockers(db = new ResolvrDatabase()): Promise<Unlockers> {
        const value = (await db.meta.get('unlockers'))?.value as Unlockers | undefined;
        if (!value) throw new Error('No vault on this device');
        return value;
    }

    static async #unwrapWithPin(db: ResolvrDatabase, pin: string): Promise<Uint8Array<ArrayBuffer>> {
        const { pin: unlocker } = await Vault.unlockers(db);
        const kek = await deriveKey(pin, unlocker.kdf);
        try {
            return new Uint8Array(await openBytes(kek, unlocker.dek, wrapContext('pin')));
        } catch {
            throw new WrongPinError();
        }
    }

    get locked(): boolean {
        return this.#key === null;
    }

    /** Forget the key. Callers must also drop any decrypted data they hold (see onLock). */
    lock(): void {
        this.#key = null;
        this.#listeners.forEach((fn) => fn());
        this.#listeners.clear();
    }

    /** Register cleanup to run when the vault locks (e.g. clearing in-memory caches). */
    onLock(fn: () => void): () => void {
        this.#listeners.add(fn);
        return () => this.#listeners.delete(fn);
    }

    get #k(): CryptoKey {
        if (!this.#key) throw new VaultLockedError();
        return this.#key;
    }

    // ---------------------------------------------------------------- records

    async put<T>(kind: RecordKind, id: string, value: T): Promise<void> {
        const rowId = `${kind}:${id}`;
        const { iv, ct } = await sealJson(this.#k, value, rowId);
        await this.db.records.put({ id: rowId, kind, iv, ct });
    }

    async get<T>(kind: RecordKind, id: string): Promise<T | undefined> {
        const rowId = `${kind}:${id}`;
        const row = await this.db.records.get(rowId);
        return row ? openJson<T>(this.#k, row, rowId) : undefined;
    }

    async list<T>(kind: RecordKind): Promise<T[]> {
        const rows = await this.db.records.where('kind').equals(kind).sortBy('id');
        const key = this.#k;
        return Promise.all(rows.map((row) => openJson<T>(key, row, row.id)));
    }

    /**
     * Encrypt several records, then write them in one IndexedDB transaction so
     * they land together or not at all. (Encryption happens first because an
     * IndexedDB transaction closes as soon as code awaits anything else.)
     */
    async putMany(entries: { kind: RecordKind; id: string; value: unknown }[]): Promise<void> {
        const key = this.#k;
        const rows = await Promise.all(
            entries.map(async ({ kind, id, value }) => {
                const rowId = `${kind}:${id}`;
                return { id: rowId, kind, ...(await sealJson(key, value, rowId)) };
            }),
        );
        await this.db.transaction('rw', this.db.records, () => this.db.records.bulkPut(rows));
    }

    async remove(kind: RecordKind, id: string): Promise<void> {
        await this.db.records.delete(`${kind}:${id}`);
    }

    async count(kind: RecordKind): Promise<number> {
        return this.db.records.where('kind').equals(kind).count();
    }

    /** Seal arbitrary bytes with the data key (used for backup manifests). */
    sealBytes(bytes: BufferSource, context: string): Promise<Sealed> {
        return seal(this.#k, bytes, context);
    }

    openBytes(sealed: Sealed, context: string): Promise<ArrayBuffer> {
        return openBytes(this.#k, sealed, context);
    }

    // ------------------------------------------------------------------ blobs

    async putBlob(id: string, bytes: ArrayBuffer): Promise<void> {
        const { iv, ct } = await seal(this.#k, bytes, `blob:${id}`);
        await this.db.blobs.put({ id, iv, ct });
    }

    async getBlob(id: string): Promise<ArrayBuffer | undefined> {
        const row = await this.db.blobs.get(id);
        return row ? openBytes(this.#k, row, `blob:${id}`) : undefined;
    }

    async removeBlob(id: string): Promise<void> {
        await this.db.blobs.delete(id);
    }

    // -------------------------------------------------------------- maintenance

    /**
     * Run a read-modify-write sequence exclusively: one at a time in this tab
     * and, where the browser supports Web Locks, across tabs too, so two tabs
     * can never fork the hash chain.
     */
    exclusive<R>(fn: () => Promise<R>): Promise<R> {
        if (typeof navigator !== 'undefined' && navigator.locks) {
            return navigator.locks.request(`resolvr-write:${this.db.name}`, fn) as Promise<R>;
        }
        const run = this.#queue.then(fn, fn);
        this.#queue = run.catch(() => undefined);
        return run;
    }

    /** Change the PIN: re-wrap the data key. The data itself does not change. */
    async changePin(currentPin: string, newPin: string, options: VaultOptions = {}): Promise<void> {
        void this.#k; // must be unlocked
        const raw = await Vault.#unwrapWithPin(this.db, currentPin);
        try {
            const kdf = await newKdfParams(options.kdf?.prefer, options.kdf);
            const dek = await seal(await deriveKey(newPin, kdf), raw, wrapContext('pin'));
            await this.#saveUnlockers((u) => ({ ...u, pin: { kdf, dek } }));
        } finally {
            raw.fill(0);
        }
    }

    /**
     * Add (or replace) a passkey or recovery unlocker. The PIN is asked again
     * because the in-memory data key cannot be read back out to wrap it.
     */
    async addUnlocker(
        method: Exclude<UnlockMethod, 'pin'>,
        pin: string,
        wrappingKey: CryptoKey,
        data?: Record<string, string>,
    ): Promise<void> {
        void this.#k;
        const raw = await Vault.#unwrapWithPin(this.db, pin);
        try {
            const dek = await seal(wrappingKey, raw, wrapContext(method));
            await this.#saveUnlockers((u) => ({ ...u, [method]: { dek, data } }));
        } finally {
            raw.fill(0);
        }
    }

    async removeUnlocker(method: Exclude<UnlockMethod, 'pin'>): Promise<void> {
        await this.#saveUnlockers((u) => {
            const next = { ...u };
            delete next[method];
            return next;
        });
    }

    async #saveUnlockers(change: (current: Unlockers) => Unlockers): Promise<void> {
        const next = change(await Vault.unlockers(this.db));
        await this.db.meta.put({ key: 'unlockers', value: next });
    }

    /** Delete everything on this device. */
    async destroy(): Promise<void> {
        this.lock();
        await this.db.delete();
    }
}
