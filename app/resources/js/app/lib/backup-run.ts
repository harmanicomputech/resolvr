import { uploadBackup, type CloudBackupInfo } from '@/lib/backup/cloud';

import type { Session } from '../session';

/** Make an encrypted backup of the open vault and upload it, then note when. */
export async function runCloudBackup(
    session: Pick<Session, 'backupFile' | 'saveSettings' | 'settings'>,
    onProgress?: (fraction: number) => void,
): Promise<CloudBackupInfo> {
    const backup = session.settings?.backup;
    if (!backup?.backupId || !backup.token) throw new Error('Set up a recovery phrase first.');
    const file = await session.backupFile();
    const info = await uploadBackup({ backupId: backup.backupId, token: backup.token }, file, onProgress);
    await session.saveSettings({ backup: { ...backup, lastBackupAt: new Date().toISOString(), lastSize: info.size } });
    return info;
}

export const AUTO_BACKUP_EVERY_MS = 24 * 60 * 60 * 1000;

export function autoBackupDue(settings: Session['settings'], now = Date.now()): boolean {
    const b = settings?.backup;
    if (!b?.auto || !b.backupId) return false;
    return !b.lastBackupAt || now - Date.parse(b.lastBackupAt) > AUTO_BACKUP_EVERY_MS;
}
