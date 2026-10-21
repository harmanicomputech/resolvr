import type { Vault } from '../db/vault';
import type { IncidentFilter, IncidentSort } from './filter';

export interface SavedView {
    id: string;
    name: string;
    filter: IncidentFilter;
    sort: IncidentSort;
}

/** Saved list views. Encrypted like everything else, since filters can contain names. */
export class SavedViewRepository {
    constructor(private readonly vault: Vault) {}

    list(): Promise<SavedView[]> {
        return this.vault.list<SavedView>('view');
    }

    async save(view: Omit<SavedView, 'id'> & { id?: string }): Promise<SavedView> {
        const saved = { ...view, id: view.id ?? crypto.randomUUID() };
        await this.vault.put('view', saved.id, saved);
        return saved;
    }

    remove(id: string): Promise<void> {
        return this.vault.remove('view', id);
    }
}
