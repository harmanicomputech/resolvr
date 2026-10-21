import { draftSchema, emptyForm, type Draft, type LogForm } from '../model/draft';
import type { FileRepository } from './files';
import type { Vault } from './vault';

/** Unfinished incidents, saved encrypted on every change so nothing typed is lost. */
export class DraftRepository {
    constructor(
        private readonly vault: Vault,
        private readonly files: FileRepository,
    ) {}

    async list(): Promise<Draft[]> {
        const drafts = await this.vault.list<Draft>('draft');
        return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    get(id: string): Promise<Draft | undefined> {
        return this.vault.get<Draft>('draft', id);
    }

    /** Start a new draft (not saved until the first change). */
    create(options: { quick?: boolean; incidentId?: string; form?: LogForm } = {}): Draft {
        const now = new Date().toISOString();
        return draftSchema.parse({
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            quick: options.quick ?? false,
            incidentId: options.incidentId,
            form: options.form ?? emptyForm(),
        });
    }

    async save(draft: Draft): Promise<Draft> {
        const next = draftSchema.parse({ ...draft, updatedAt: new Date().toISOString() });
        await this.vault.put('draft', next.id, next);
        return next;
    }

    /**
     * Remove a draft. When it is discarded (not saved as an incident), files
     * attached only to it are deleted too.
     */
    async remove(id: string, options: { discardFiles?: boolean } = {}): Promise<void> {
        const draft = await this.get(id);
        if (options.discardFiles && draft) {
            for (const fileId of draft.form.fileIds) {
                const file = await this.files.get(fileId);
                if (file && !file.incidentIds.length) await this.files.purge(fileId);
            }
        }
        await this.vault.remove('draft', id);
    }
}
