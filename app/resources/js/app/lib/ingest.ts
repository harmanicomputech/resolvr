import type { Repositories } from '@/lib/db';
import { exifDateTaken } from '@/lib/files/exif';
import { imagePreview } from '@/lib/files/image';
import type { EvidenceFile } from '@/lib/model/schema';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const ACCEPTED = /^(image\/|audio\/|application\/pdf$)/;

export type IngestStatus = { name: string; state: 'waiting' | 'encrypting' | 'done' | 'skipped'; reason?: string };

/**
 * Bring files into the vault: read the photo's own capture date (EXIF),
 * make a tiny blurred preview, fingerprint and encrypt. Reports progress per
 * file. Nothing leaves the device.
 */
export async function ingestFiles(
    files: File[],
    repos: Repositories,
    options: { folder?: string; incidentIds?: string[]; onStatus?: (statuses: IngestStatus[]) => void } = {},
): Promise<EvidenceFile[]> {
    const statuses: IngestStatus[] = files.map((f) => ({ name: f.name || 'file', state: 'waiting' }));
    const report = () => options.onStatus?.(statuses.map((s) => ({ ...s })));
    report();
    const added: EvidenceFile[] = [];
    for (const [i, file] of files.entries()) {
        const status = statuses[i]!;
        if (file.size > MAX_FILE_BYTES) {
            Object.assign(status, { state: 'skipped', reason: 'Larger than 50 MB' });
            report();
            continue;
        }
        if (file.type && !ACCEPTED.test(file.type)) {
            Object.assign(status, { state: 'skipped', reason: 'Only images, PDFs and audio' });
            report();
            continue;
        }
        status.state = 'encrypting';
        report();
        const taken =
            file.type === 'image/jpeg' ? exifDateTaken(await file.slice(0, 256 * 1024).arrayBuffer()) : undefined;
        const preview = await imagePreview(file);
        added.push(
            await repos.files.add(file, {
                capturedAt: taken ?? (file.lastModified ? new Date(file.lastModified).toISOString() : undefined),
                folder: options.folder || undefined,
                incidentIds: options.incidentIds ?? [],
                ...(preview ?? {}),
            }),
        );
        status.state = 'done';
        report();
    }
    return added;
}

const INBOX = 'resolvr-share-inbox';

/**
 * Files shared into Resolvr from another app wait in a service-worker cache
 * until the vault is unlocked; then they are encrypted into the vault and
 * removed from the cache.
 */
export async function importSharedFiles(repos: Repositories): Promise<EvidenceFile[]> {
    if (typeof caches === 'undefined' || !(await caches.has(INBOX))) return [];
    const cache = await caches.open(INBOX);
    const requests = await cache.keys();
    const files: File[] = [];
    for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        const name = decodeURIComponent(response.headers.get('x-file-name') ?? 'shared-file');
        files.push(new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' }));
    }
    const added = await ingestFiles(files, repos, { folder: 'Shared' });
    await caches.delete(INBOX);
    return added;
}
