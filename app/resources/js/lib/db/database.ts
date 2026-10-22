import Dexie, { type EntityTable } from 'dexie';

/*
 * IndexedDB layout. Nothing here is readable without the key:
 *
 *   meta     plaintext settings needed before unlocking: KDF parameters,
 *            the key-check value, schema version. No personal data.
 *   records  every model object, encrypted. Only an id and a kind are
 *            visible, so storage reveals counts, not content.
 *   blobs    evidence file bytes, encrypted, never base64 strings.
 */

export interface MetaRow {
    key: string;
    value: unknown;
}

export interface RecordRow {
    /** "<kind>:<id>". Ledger ids are zero-padded so key order is chain order. */
    id: string;
    kind: RecordKind;
    iv: Uint8Array<ArrayBuffer>;
    ct: ArrayBuffer;
}

export interface BlobRow {
    id: string;
    iv: Uint8Array<ArrayBuffer>;
    ct: ArrayBuffer;
}

export const recordKinds = [
    'incident',
    'ledger',
    'person',
    'file',
    'profile',
    'settings',
    'counter',
    'draft',
    'view',
    'document',
] as const;
export type RecordKind = (typeof recordKinds)[number];

export class ResolvrDatabase extends Dexie {
    meta!: EntityTable<MetaRow, 'key'>;
    records!: EntityTable<RecordRow, 'id'>;
    blobs!: EntityTable<BlobRow, 'id'>;

    constructor(name = 'resolvr') {
        super(name);
        this.version(1).stores({
            meta: 'key',
            records: 'id, kind',
            blobs: 'id',
        });
    }
}
