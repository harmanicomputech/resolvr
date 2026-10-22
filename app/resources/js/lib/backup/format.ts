import { fromBase64, toBase64, toHex, utf8, type Sealed } from '../crypto';
import { recordKinds, type RecordKind, type RecordRow, type BlobRow } from '../db/database';
import { Vault, type SecretUnlocker, type VaultOptions } from '../db/vault';

/**
 * The encrypted backup file (`.resolvr`), used both for cloud backup and the
 * encrypted export.
 *
 * It is a copy of the vault's rows exactly as they sit in IndexedDB, already
 * encrypted with the data key, so making one never decrypts anything. It
 * carries only the *recovery* unlocker, never the PIN one: a 4- or 6-digit
 * PIN could be guessed by whoever holds the file, a 12-word phrase cannot.
 *
 *   magic   16 bytes  "RESOLVR-BACKUP01"
 *   length  u32       header size
 *   header  JSON      { format, createdAt, recovery, manifest }
 *   frames  …         one per record or file:
 *                     type u8 (1 record, 2 file) · id u16+bytes · kind u8+bytes
 *                     · iv 12 bytes · ciphertext u32+bytes
 *
 * The manifest is sealed with the data key and holds the counts and a
 * SHA-256 over every frame's hash, so a file that was cut short, re-ordered
 * or mixed with another backup is refused on restore.
 */

const MAGIC = utf8.encode('RESOLVR-BACKUP01');
const MANIFEST_CONTEXT = 'backup:manifest';
const IV_BYTES = 12;

interface SealedJson {
    iv: string;
    ct: string;
}
export interface BackupHeader {
    format: 1;
    createdAt: string;
    recovery: { dek: SealedJson; data?: Record<string, string> };
    manifest: SealedJson;
}
interface Manifest {
    records: number;
    files: number;
    digest: string;
    createdAt: string;
}

export class BackupDamagedError extends Error {
    constructor(message = 'This backup is incomplete or was changed, so it cannot be restored.') {
        super(message);
        this.name = 'BackupDamagedError';
    }
}

const toJson = (s: Sealed): SealedJson => ({ iv: toBase64(s.iv), ct: toBase64(new Uint8Array(s.ct)) });
const fromJson = (s: SealedJson): Sealed => ({ iv: fromBase64(s.iv), ct: fromBase64(s.ct).buffer });

function frame(type: 1 | 2, id: string, kind: string, iv: Uint8Array, ct: ArrayBuffer): Uint8Array<ArrayBuffer> {
    const idBytes = utf8.encode(id);
    const kindBytes = utf8.encode(kind);
    const out = new Uint8Array(1 + 2 + idBytes.length + 1 + kindBytes.length + IV_BYTES + 4 + ct.byteLength);
    const view = new DataView(out.buffer);
    let at = 0;
    view.setUint8(at, type);
    view.setUint16((at += 1), idBytes.length);
    out.set(idBytes, (at += 2));
    view.setUint8((at += idBytes.length), kindBytes.length);
    out.set(kindBytes, (at += 1));
    out.set(iv, (at += kindBytes.length));
    view.setUint32((at += IV_BYTES), ct.byteLength);
    out.set(new Uint8Array(ct), at + 4);
    return out;
}

const sha256 = async (bytes: BufferSource) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

/** Make a backup of the open vault. Needs a recovery phrase to have been set up. */
export async function createBackup(vault: Vault): Promise<Blob> {
    const { recovery } = await Vault.unlockers(vault.db);
    if (!recovery) throw new Error('Set up a recovery phrase first.');
    const parts: BlobPart[] = [];
    const digests: Uint8Array[] = [];
    const add = async (bytes: Uint8Array<ArrayBuffer>) => {
        parts.push(bytes);
        digests.push(await sha256(bytes));
    };

    const records = await vault.db.records.toArray();
    for (const r of records) await add(frame(1, r.id, r.kind, r.iv, r.ct));
    const fileIds = (await vault.db.blobs.toCollection().primaryKeys()) as string[];
    for (const id of fileIds) {
        const b = await vault.db.blobs.get(id);
        if (b) await add(frame(2, b.id, '', b.iv, b.ct));
    }

    const createdAt = new Date().toISOString();
    const manifest: Manifest = {
        records: records.length,
        files: fileIds.length,
        digest: toHex(await sha256(concat(digests))),
        createdAt,
    };
    const header: BackupHeader = {
        format: 1,
        createdAt,
        recovery: { dek: toJson(recovery.dek), data: recovery.data },
        manifest: toJson(await vault.sealBytes(utf8.encode(JSON.stringify(manifest)), MANIFEST_CONTEXT)),
    };
    const headerBytes = utf8.encode(JSON.stringify(header));
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0, headerBytes.length);
    return new Blob([MAGIC, length, headerBytes, ...parts], { type: 'application/octet-stream' });
}

function concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const c of chunks) {
        out.set(c, at);
        at += c.length;
    }
    return out;
}

const read = async (blob: Blob, start: number, length: number) => {
    if (start + length > blob.size) throw new BackupDamagedError();
    return new Uint8Array(await blob.slice(start, start + length).arrayBuffer());
};

/** Read and check the header. Throws if the file is not a Resolvr backup. */
export async function readBackupHeader(blob: Blob): Promise<{ header: BackupHeader; offset: number }> {
    const magic = await read(blob, 0, MAGIC.length).catch(() => new Uint8Array());
    if (magic.length !== MAGIC.length || !magic.every((b, i) => b === MAGIC[i]))
        throw new BackupDamagedError('This file is not a Resolvr backup.');
    const length = new DataView((await read(blob, MAGIC.length, 4)).buffer).getUint32(0);
    const header = JSON.parse(utf8.decode(await read(blob, MAGIC.length + 4, length))) as BackupHeader;
    if (header.format !== 1) throw new BackupDamagedError('This backup was made by a newer version of Resolvr.');
    return { header, offset: MAGIC.length + 4 + length };
}

/** The recovery unlocker inside a backup, for checking a phrase before restoring. */
export function backupRecovery(header: BackupHeader): SecretUnlocker {
    return { dek: fromJson(header.recovery.dek), data: header.recovery.data };
}

/**
 * Restore a backup onto this (empty) device: the phrase unwraps the data key,
 * which is wrapped again for the new PIN; the encrypted rows are copied in as
 * they are. Anything wrong with the file undoes the restore.
 */
export async function restoreBackup(
    blob: Blob,
    wrappingKey: CryptoKey,
    newPin: string,
    options: VaultOptions & { onProgress?: (fraction: number) => void } = {},
): Promise<Vault> {
    const { header, offset } = await readBackupHeader(blob);
    const vault = await Vault.fromRecovery(backupRecovery(header), wrappingKey, newPin, options);
    try {
        const manifest = JSON.parse(
            utf8.decode(await vault.openBytes(fromJson(header.manifest), MANIFEST_CONTEXT)),
        ) as Manifest;
        const digests: Uint8Array[] = [];
        let records: RecordRow[] = [];
        let files = 0;
        let at = offset;
        const flush = async () => {
            if (records.length) await vault.db.records.bulkPut(records);
            records = [];
        };
        while (at < blob.size) {
            const start = at;
            const head = new DataView((await read(blob, at, 3)).buffer);
            const type = head.getUint8(0);
            const idLength = head.getUint16(1);
            at += 3;
            const id = utf8.decode(await read(blob, at, idLength));
            at += idLength;
            const kindLength = (await read(blob, at, 1))[0] ?? 0;
            at += 1;
            const kind = utf8.decode(await read(blob, at, kindLength));
            at += kindLength;
            const iv = await read(blob, at, IV_BYTES);
            at += IV_BYTES;
            const ctLength = new DataView((await read(blob, at, 4)).buffer).getUint32(0);
            at += 4;
            const ct = (await read(blob, at, ctLength)).buffer;
            at += ctLength;
            digests.push(await sha256(await read(blob, start, at - start)));

            if (type === 1 && recordKinds.includes(kind as RecordKind) && id.startsWith(`${kind}:`)) {
                records.push({ id, kind: kind as RecordKind, iv, ct });
                if (records.length >= 200) await flush();
            } else if (type === 2) {
                await vault.db.blobs.put({ id, iv, ct } satisfies BlobRow);
                files++;
            } else {
                throw new BackupDamagedError();
            }
            options.onProgress?.(at / blob.size);
        }
        await flush();
        const count = await vault.db.records.count();
        if (
            count !== manifest.records ||
            files !== manifest.files ||
            toHex(await sha256(concat(digests))) !== manifest.digest
        )
            throw new BackupDamagedError();
        return vault;
    } catch (error) {
        await vault.destroy();
        throw error instanceof SyntaxError ? new BackupDamagedError() : error;
    }
}
