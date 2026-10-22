import { sha256OfBlob } from '../backup/cloud';

/** The Laravel share API. Only ciphertext and an expiry choice are sent. */

export interface ShareStatus {
    expiresAt: string;
    revokedAt: string | null;
    open: boolean;
    size: number;
    views: { at: string; device: string }[];
}

async function failure(r: Response): Promise<Error> {
    const body = (await r.json().catch(() => ({}))) as { message?: string };
    if (r.status === 429) return new Error('Too many shares just now. Please try again later.');
    if (r.status === 422 && /size/.test(body.message ?? ''))
        return new Error('These files are too large to share in one link.');
    return new Error(body.message || 'The link could not be created. Please try again.');
}

export async function uploadShare(
    sealed: Blob,
    expiresIn: '24h' | '7d',
    onProgress?: (f: number) => void,
): Promise<{ id: string; token: string; expiresAt: string }> {
    const start = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ size: sealed.size, sha256: await sha256OfBlob(sealed), expiresIn }),
    });
    if (!start.ok) throw await failure(start);
    const { id, token, upload, chunkSize, expiresAt } = (await start.json()) as {
        id: string;
        token: string;
        upload: string;
        chunkSize: number;
        expiresAt: string;
    };
    const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    const chunks = Math.max(1, Math.ceil(sealed.size / chunkSize));
    for (let i = 0; i < chunks; i++) {
        const r = await fetch(`/api/shares/${id}/uploads/${upload}/${i}`, {
            method: 'PUT',
            headers: { ...auth, 'Content-Type': 'application/octet-stream' },
            body: sealed.slice(i * chunkSize, (i + 1) * chunkSize),
        });
        if (!r.ok) throw await failure(r);
        onProgress?.((i + 1) / chunks);
    }
    const done = await fetch(`/api/shares/${id}/uploads/${upload}/complete`, { method: 'POST', headers: auth });
    if (!done.ok) throw await failure(done);
    return { id, token, expiresAt };
}

export async function shareStatus(id: string, token: string): Promise<ShareStatus | null> {
    const r = await fetch(`/api/shares/${id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    return r.ok ? ((await r.json()) as ShareStatus) : null;
}

export async function revokeShare(id: string, token: string): Promise<void> {
    const r = await fetch(`/api/shares/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw await failure(r);
}
