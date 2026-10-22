import { draftDocumentSchema, type DraftDocument } from '../model/schema';
import type { Vault } from './vault';

/** Drafted letters and summaries, encrypted on the device. */
export class DocumentRepository {
    constructor(private readonly vault: Vault) {}

    async list(): Promise<DraftDocument[]> {
        return (await this.vault.list<DraftDocument>('document')).sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt),
        );
    }

    get(id: string): Promise<DraftDocument | undefined> {
        return this.vault.get<DraftDocument>('document', id);
    }

    async save(doc: Omit<DraftDocument, 'updatedAt'> & { updatedAt?: string }): Promise<DraftDocument> {
        const parsed = draftDocumentSchema.parse({ ...doc, updatedAt: new Date().toISOString() });
        await this.vault.put('document', parsed.id, parsed);
        return parsed;
    }

    remove(id: string): Promise<void> {
        return this.vault.remove('document', id);
    }
}
