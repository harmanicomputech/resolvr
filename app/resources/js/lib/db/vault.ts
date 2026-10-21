import { openJson, open as openBytes, seal, sealJson, type KdfParams, deriveKey, newKdfParams } from '../crypto';
import { ResolvrDatabase, type RecordKind } from './database';

/**
 * The encrypted vault. Unlocking derives the key from the PIN and checks it
 * against a stored key-check value; the PIN itself is never stored. The key
 * lives only in this object and is dropped on lock().
 */

const KEY_CHECK = 'resolvr-key-check-v1';

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
        return (await db.meta.get('kdf')) !== undefined;
    }

    /** First run: create the vault protected by `pin`. */
    static async create(pin: string, options: VaultOptions = {}): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        if (await Vault.exists(db)) throw new Error('A vault already exists on this device');
        const params = await newKdfParams(options.kdf?.prefer, options.kdf);
        const key = await deriveKey(pin, params);
        const check = await sealJson(key, KEY_CHECK, 'meta:key-check');
        await db.transaction('rw', db.meta, async () => {
            await db.meta.put({ key: 'kdf', value: params });
            await db.meta.put({ key: 'keyCheck', value: check });
            await db.meta.put({ key: 'schemaVersion', value: 1 });
        });
        return new Vault(db, key);
    }

    /** Derive the key from `pin` and confirm it opens the vault. */
    static async unlock(pin: string, options: VaultOptions = {}): Promise<Vault> {
        const db = options.db ?? new ResolvrDatabase();
        const params = (await db.meta.get('kdf'))?.value as KdfParams | undefined;
        const check = (await db.meta.get('keyCheck'))?.value as
            { iv: Uint8Array<ArrayBuffer>; ct: ArrayBuffer } | undefined;
        if (!params || !check) throw new Error('No vault on this device');
        const key = await deriveKey(pin, params);
        try {
            if ((await openJson<string>(key, check, 'meta:key-check')) !== KEY_CHECK) throw new WrongPinError();
        } catch {
            throw new WrongPinError();
        }
        return new Vault(db, key);
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

    /**
     * Change the PIN: derive a new key and re-encrypt everything with it in one
     * transaction, so a failure part-way leaves the old PIN working.
     */
    async changePin(currentPin: string, newPin: string, options: VaultOptions = {}): Promise<void> {
        await Vault.unlock(currentPin, { db: this.db }); // confirms the current PIN
        const oldKey = this.#k;
        const params = await newKdfParams(options.kdf?.prefer, options.kdf);
        const newKey = await deriveKey(newPin, params);

        const records = await this.db.records.toArray();
        const blobs = await this.db.blobs.toArray();
        const reRecords = await Promise.all(
            records.map(async (row) => ({
                ...row,
                ...(await seal(newKey, await openBytes(oldKey, row, row.id), row.id)),
            })),
        );
        const reBlobs = await Promise.all(
            blobs.map(async (row) => ({
                ...row,
                ...(await seal(newKey, await openBytes(oldKey, row, `blob:${row.id}`), `blob:${row.id}`)),
            })),
        );
        const check = await sealJson(newKey, KEY_CHECK, 'meta:key-check');

        await this.db.transaction('rw', this.db.records, this.db.blobs, this.db.meta, async () => {
            await this.db.records.bulkPut(reRecords);
            await this.db.blobs.bulkPut(reBlobs);
            await this.db.meta.put({ key: 'kdf', value: params });
            await this.db.meta.put({ key: 'keyCheck', value: check });
        });
        this.#key = newKey;
    }

    /** Delete everything on this device. */
    async destroy(): Promise<void> {
        this.lock();
        await this.db.delete();
    }
}
