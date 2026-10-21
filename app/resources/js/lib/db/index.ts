import { FileRepository } from './files';
import { IncidentRepository } from './incidents';
import { PeopleRepository } from './people';
import { SingletonRepository } from './singletons';
import type { Vault } from './vault';

export * from './database';
export * from './files';
export * from './incidents';
export * from './people';
export * from './singletons';
export * from './vault';

/** Everything the app reads and writes, bound to an unlocked vault. */
export function repositories(vault: Vault) {
    return {
        vault,
        incidents: new IncidentRepository(vault),
        people: new PeopleRepository(vault),
        files: new FileRepository(vault),
        singletons: new SingletonRepository(vault),
    };
}

export type Repositories = ReturnType<typeof repositories>;
