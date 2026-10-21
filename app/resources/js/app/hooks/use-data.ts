import { useEffect, useState } from 'react';

import type { Repositories } from '@/lib/db';

import { useSession } from '../session';

type Dep = string | number | boolean | null | undefined;

/**
 * Read decrypted data for a screen. Re-runs whenever the session's data
 * version changes (after any write) or a dep changes, keeps showing the
 * previous result while reloading, and returns nothing once the vault locks.
 */
export function useData<T>(
    load: (repos: Repositories) => Promise<T>,
    deps: Dep[] = [],
): { data: T | undefined; loading: boolean; error: Error | null } {
    const { repos, version } = useSession();
    const key = JSON.stringify([version, ...deps]);
    const [state, setState] = useState<{ key: string; repos: Repositories; data?: T; error: Error | null } | null>(
        null,
    );

    useEffect(() => {
        if (!repos) return;
        let cancelled = false;
        load(repos).then(
            (data) => !cancelled && setState({ key, repos, data, error: null }),
            (error: unknown) =>
                !cancelled &&
                setState({ key, repos, error: error instanceof Error ? error : new Error(String(error)) }),
        );
        return () => {
            cancelled = true;
        };
        // `load` is usually an inline closure; `key` captures what it depends on.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repos, key]);

    const current = state && state.repos === repos ? state : null;
    return { data: current?.data, loading: !current || current.key !== key, error: current?.error ?? null };
}
