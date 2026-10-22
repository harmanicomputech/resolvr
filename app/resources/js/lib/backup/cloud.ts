/**
 * Talks to the Laravel backup API (`/api/backups`). Only ciphertext is sent:
 * the file from createBackup(), in chunks small enough for shared hosting.
 * Requests carry the access token derived from the recovery phrase.
 */

export interface BackupCredentials {
    backupId: string;
    token: string;
}

export interface CloudBackupInfo {
    size: number;
    sha256: string;
    updatedAt: string;
}

export class BackupServiceError extends Error {
    constructor(
        message: string,
        readonly status = 0,
    ) {
        super(message);
        this.name = 'BackupServiceError';
    }
}

const base = (id: string) => `/api/backups/${id}`;

async function call(creds: BackupCredentials, path: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
    for (let attempt = 1; ; attempt++) {
        let response: Response | undefined;
        try {
            response = await fetch(base(creds.backupId) + path, {
                ...init,
                headers: { Accept: 'application/json', Authorization: `Bearer ${creds.token}`, ...init.headers },
                cache: 'no-store',
            });
        } catch {
            if (attempt >= attempts) throw new BackupServiceError('You seem to be offline. Try again when connected.');
        }
        if (response) {
            if (response.ok || response.status === 404) return response;
            const retry = response.status >= 500 || response.status === 429;
            if (!retry || attempt >= attempts)
                throw new BackupServiceError(await messageFor(response), response.status);
        }
        await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    }
}

async function messageFor(response: Response): Promise<string> {
    if (response.status === 401 || response.status === 403) return 'That recovery phrase does not match this backup.';
    if (response.status === 413) return 'This backup is larger than the server allows.';
    if (response.status === 429) return 'Too many tries. Please wait a few minutes.';
    try {
        const body = (await response.json()) as { message?: string };
        if (body.message) return body.message;
    } catch {
        // not JSON
    }
    return 'The backup service is not available right now.';
}

export async function sha256OfBlob(blob: Blob, onProgress?: (f: number) => void): Promise<string> {
    const { createSHA256 } = await import('hash-wasm');
    const hasher = await createSHA256();
    hasher.init();
    const step = 4 * 1024 * 1024;
    for (let at = 0; at < blob.size; at += step) {
        hasher.update(new Uint8Array(await blob.slice(at, at + step).arrayBuffer()));
        onProgress?.(Math.min(1, (at + step) / blob.size));
    }
    return hasher.digest('hex');
}

/** Upload a backup file, replacing the previous one only once every chunk has arrived. */
export async function uploadBackup(
    creds: BackupCredentials,
    blob: Blob,
    onProgress?: (fraction: number) => void,
): Promise<CloudBackupInfo> {
    const sha256 = await sha256OfBlob(blob);
    const start = await call(creds, '/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: blob.size, sha256 }),
    });
    if (!start.ok) throw new BackupServiceError(await messageFor(start), start.status);
    const { upload, chunkSize } = (await start.json()) as { upload: string; chunkSize: number };
    const chunks = Math.max(1, Math.ceil(blob.size / chunkSize));
    for (let i = 0; i < chunks; i++) {
        const body = blob.slice(i * chunkSize, (i + 1) * chunkSize);
        const r = await call(creds, `/uploads/${upload}/${i}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body,
        });
        if (!r.ok) throw new BackupServiceError(await messageFor(r), r.status);
        onProgress?.((i + 1) / chunks);
    }
    const done = await call(creds, `/uploads/${upload}/complete`, { method: 'POST' });
    if (!done.ok) throw new BackupServiceError(await messageFor(done), done.status);
    return (await done.json()) as CloudBackupInfo;
}

/** Details of the stored backup, or null if there is none. */
export async function backupInfo(creds: BackupCredentials): Promise<CloudBackupInfo | null> {
    const r = await call(creds, '');
    return r.status === 404 ? null : ((await r.json()) as CloudBackupInfo);
}

export async function downloadBackup(creds: BackupCredentials, onProgress?: (fraction: number) => void): Promise<Blob> {
    const info = await backupInfo(creds);
    if (!info) throw new BackupServiceError('No backup was found for that recovery phrase.', 404);
    const r = await call(creds, '/content');
    if (!r.ok || !r.body) throw new BackupServiceError('No backup was found for that recovery phrase.', r.status);
    const reader = r.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value as Uint8Array<ArrayBuffer>);
        received += value.length;
        onProgress?.(info.size ? received / info.size : 1);
    }
    const blob = new Blob(parts, { type: 'application/octet-stream' });
    if ((await sha256OfBlob(blob)) !== info.sha256)
        throw new BackupServiceError('The download was interrupted. Please try again.');
    return blob;
}

export async function deleteCloudBackup(creds: BackupCredentials): Promise<void> {
    await call(creds, '', { method: 'DELETE' });
}
