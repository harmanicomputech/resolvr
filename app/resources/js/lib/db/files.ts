import { sha256Hex } from '../integrity';
import { evidenceFileSchema, type EvidenceFile } from '../model/schema';
import type { Vault } from './vault';

/** Evidence files: metadata as an encrypted record, bytes as an encrypted blob. */
export class FileRepository {
    constructor(private readonly vault: Vault) {}

    async list(options: { includeDeleted?: boolean } = {}): Promise<EvidenceFile[]> {
        const files = await this.vault.list<EvidenceFile>('file');
        return files
            .filter((f) => options.includeDeleted || !f.deletedAt)
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    }

    get(id: string): Promise<EvidenceFile | undefined> {
        return this.vault.get<EvidenceFile>('file', id);
    }

    /** Fingerprint, encrypt and store a file. Nothing leaves the device. */
    async add(
        file: Blob & { name?: string; lastModified?: number },
        meta: Partial<
            Pick<EvidenceFile, 'capturedAt' | 'incidentIds' | 'folder' | 'width' | 'height' | 'thumb' | 'ocrText'>
        > = {},
    ): Promise<EvidenceFile> {
        const bytes = await file.arrayBuffer();
        const record = evidenceFileSchema.parse({
            id: crypto.randomUUID(),
            name: file.name || 'evidence',
            mimeType: file.type || 'application/octet-stream',
            size: bytes.byteLength,
            sha256: await sha256Hex(bytes),
            addedAt: new Date().toISOString(),
            incidentIds: [],
            ...meta,
        });
        await this.vault.putBlob(record.id, bytes);
        await this.vault.put('file', record.id, record);
        return record;
    }

    /** Decrypt the file back into a Blob (for previews and exports). */
    async open(id: string): Promise<Blob | undefined> {
        const [record, bytes] = await Promise.all([this.get(id), this.vault.getBlob(id)]);
        return record && bytes ? new Blob([bytes], { type: record.mimeType }) : undefined;
    }

    /** Re-hash the decrypted bytes and compare with the fingerprint taken on upload. */
    async verify(id: string): Promise<boolean> {
        const [record, bytes] = await Promise.all([this.get(id), this.vault.getBlob(id)]);
        return Boolean(record && bytes && (await sha256Hex(bytes)) === record.sha256);
    }

    async update(record: EvidenceFile): Promise<EvidenceFile> {
        const parsed = evidenceFileSchema.parse(record);
        await this.vault.put('file', parsed.id, parsed);
        return parsed;
    }

    /** Permanently delete a file and its bytes. */
    async purge(id: string): Promise<void> {
        await this.vault.removeBlob(id);
        await this.vault.remove('file', id);
    }
}
