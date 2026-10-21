import { useEffect, useState } from 'react';

import { useSession } from '../session';

/**
 * Decrypt a vault file into a temporary object URL for previews. The URL is
 * revoked when the component unmounts or the vault locks.
 */
export function useFileUrl(id: string | undefined): string | null {
    const { repos } = useSession();
    const [url, setUrl] = useState<{ id: string; url: string } | null>(null);
    useEffect(() => {
        if (!id || !repos) return;
        let objectUrl: string | null = null;
        let cancelled = false;
        void repos.files.open(id).then((blob) => {
            if (!blob || cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            setUrl({ id, url: objectUrl });
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [id, repos]);
    return url && url.id === id && repos ? url.url : null;
}
