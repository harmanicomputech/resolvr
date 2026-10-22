import type { Repositories } from '../db';

/** What the device remembers about a share it created (encrypted, kind "share"). */
export interface ShareRecord {
    id: string;
    /** Owner token for status and revoking. */
    token: string;
    /** The decryption key, so the link can be copied again later. */
    key: string;
    label: string;
    incidentIds: string[];
    fileCount: number;
    createdAt: string;
    expiresAt: string;
    revokedAt?: string;
}

export const listShares = async (repos: Repositories) =>
    (await repos.vault.list<ShareRecord>('share')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const saveShare = (repos: Repositories, record: ShareRecord) => repos.vault.put('share', record.id, record);

export const forgetShare = (repos: Repositories, id: string) => repos.vault.remove('share', id);
