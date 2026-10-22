import { SavedViewRepository } from '../incidents/views';
import { DocumentRepository } from './documents';
import { DraftRepository } from './drafts';
import { FileRepository } from './files';
import { IncidentRepository } from './incidents';
import { PeopleRepository } from './people';
import { SingletonRepository } from './singletons';
import type { Vault } from './vault';

export * from './commit-form';
export * from './database';
export * from './documents';
export * from './drafts';
export * from './files';
export * from './incidents';
export * from './people';
export * from './people-merge';
export * from './singletons';
export * from './vault';

/** Everything the app reads and writes, bound to an unlocked vault. */
export function repositories(vault: Vault) {
    const files = new FileRepository(vault);
    return {
        vault,
        incidents: new IncidentRepository(vault),
        people: new PeopleRepository(vault),
        files,
        drafts: new DraftRepository(vault, files),
        views: new SavedViewRepository(vault),
        documents: new DocumentRepository(vault),
        singletons: new SingletonRepository(vault),
    };
}

export type Repositories = ReturnType<typeof repositories>;
