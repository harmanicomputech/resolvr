import { CloudUpload, Download, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { deleteCloudBackup } from '@/lib/backup/cloud';
import type { Settings } from '@/lib/model/schema';

import { useToast } from '../../components/toaster';
import { useOnline } from '../../hooks/use-online';
import { runCloudBackup } from '../../lib/backup-run';
import { saveBlob } from '../../pdf/download';
import { useSession } from '../../session';
import { formatBytes, SettingRow, SettingsCard, Toggle } from './parts';
import { RecoveryPhraseDialog } from './RecoveryPhrase';

function ago(iso: string): string {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    if (minutes < 60 * 48) return rtf.format(-Math.round(minutes / 60), 'hour');
    return rtf.format(-Math.round(minutes / 1440), 'day');
}

export function BackupCard({ settings }: { settings: Settings }) {
    const session = useSession();
    const toast = useToast();
    const online = useOnline();
    const [phraseOpen, setPhraseOpen] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [removing, setRemoving] = useState(false);
    const backup = settings.backup;
    const ready = Boolean(backup.backupId && backup.token);

    const backUpNow = async () => {
        setProgress(0);
        try {
            await runCloudBackup(session, setProgress);
            toast({ title: 'Backed up', description: 'An encrypted copy is stored online.', tone: 'success' });
        } catch (error) {
            toast({
                title: 'Backup did not finish',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'warning',
            });
        } finally {
            setProgress(null);
        }
    };

    const downloadFile = async () => {
        try {
            const file = await session.backupFile();
            saveBlob(file, `resolvr-backup-${new Date().toISOString().slice(0, 10)}.resolvr`);
        } catch (error) {
            toast({
                title: 'No file made',
                description: error instanceof Error ? error.message : undefined,
                tone: 'warning',
            });
        }
    };

    const removeOnline = async () => {
        if (!backup.backupId || !backup.token) return;
        try {
            await deleteCloudBackup({ backupId: backup.backupId, token: backup.token });
            await session.saveSettings({
                backup: { ...backup, auto: false, lastBackupAt: undefined, lastSize: undefined },
            });
            toast({ title: 'Online copy removed', tone: 'success' });
        } catch (error) {
            toast({
                title: 'Not removed',
                description: error instanceof Error ? error.message : undefined,
                tone: 'warning',
            });
        } finally {
            setRemoving(false);
        }
    };

    return (
        <SettingsCard
            id="backup"
            icon={<CloudUpload className="size-4" />}
            title="Backup"
            description="Encrypted on this device before it leaves. We store only scrambled data we cannot open."
        >
            <SettingRow
                title="Recovery phrase"
                description={
                    ready
                        ? 'Set up. It restores your record on a new device and can reset a forgotten passcode.'
                        : 'Twelve words that unlock your backups. Needed before you can back up.'
                }
            >
                <Button size="sm" variant={ready ? 'ghost' : 'primary'} onClick={() => setPhraseOpen(true)}>
                    <KeyRound aria-hidden /> {ready ? 'Make a new phrase' : 'Set up'}
                </Button>
            </SettingRow>

            {ready && (
                <>
                    <SettingRow
                        title="Online backup"
                        description={
                            progress !== null ? (
                                <span className="flex items-center gap-2">
                                    <progress
                                        className="h-1.5 w-32 accent-[var(--accent)]"
                                        value={progress}
                                        max={1}
                                        aria-label="Backup progress"
                                    />
                                    Backing up…
                                </span>
                            ) : backup.lastBackupAt ? (
                                <span data-testid="last-backup">
                                    Last backed up {ago(backup.lastBackupAt)}
                                    {backup.lastSize ? ` · ${formatBytes(backup.lastSize)}` : ''}
                                </span>
                            ) : (
                                'Not backed up yet.'
                            )
                        }
                    >
                        <Button size="sm" onClick={() => void backUpNow()} disabled={progress !== null || !online}>
                            Back up now
                        </Button>
                    </SettingRow>
                    <SettingRow
                        title="Back up every day"
                        description="When you open Resolvr and the last backup is over a day old."
                    >
                        <Toggle
                            label="Back up every day"
                            checked={backup.auto}
                            onChange={(auto) => void session.saveSettings({ backup: { ...backup, auto } })}
                        />
                    </SettingRow>
                    {backup.lastBackupAt && (
                        <SettingRow
                            title="Remove the online copy"
                            description="Deletes the encrypted backup from our server."
                        >
                            <Button size="sm" variant="ghost" onClick={() => setRemoving(true)}>
                                Remove
                            </Button>
                        </SettingRow>
                    )}
                    <SettingRow
                        title="Encrypted file"
                        description="Save the same encrypted backup as a file you keep yourself. It opens only with your recovery phrase."
                    >
                        <Button size="sm" onClick={() => void downloadFile()}>
                            <Download aria-hidden /> Download
                        </Button>
                    </SettingRow>
                </>
            )}

            <p className="pt-4 text-sm text-fg-muted">
                On a new device, choose <strong className="text-fg">I have a backup</strong> when Resolvr first opens.
            </p>

            <RecoveryPhraseDialog
                open={phraseOpen}
                onOpenChange={setPhraseOpen}
                onDone={() =>
                    toast({
                        title: 'Recovery phrase saved',
                        description: 'Keep your copy safe. You can back up now.',
                        tone: 'success',
                    })
                }
            />
            <Dialog open={removing} onOpenChange={setRemoving}>
                <DialogContent
                    title="Remove the online copy?"
                    description="Your record on this device stays as it is. You can back up again later."
                >
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setRemoving(false)}>
                            Keep it
                        </Button>
                        <Button variant="danger" onClick={() => void removeOnline()}>
                            Remove online copy
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </SettingsCard>
    );
}
