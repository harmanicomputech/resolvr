import { Database, FileJson, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { deleteCloudBackup } from '@/lib/backup/cloud';
import type { Settings } from '@/lib/model/schema';

import { PinConfirm } from '../../components/pin-confirm';
import { useToast } from '../../components/toaster';
import { exportReadableJson } from '../../lib/export-json';
import { pickAndImportPrototype } from '../../lib/import-backup';
import { saveBlob } from '../../pdf/download';
import { useSession } from '../../session';
import { SettingRow, SettingsCard } from './parts';

export function DataCard({ settings }: { settings: Settings }) {
    const session = useSession();
    const toast = useToast();
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const exportJson = async () => {
        if (!session.repos) return;
        saveBlob(
            await exportReadableJson(session.repos),
            `resolvr-export-${new Date().toISOString().slice(0, 10)}.json`,
        );
    };

    const importPrototype = async () => {
        if (!session.repos) return;
        try {
            const report = await pickAndImportPrototype(session.repos);
            if (!report) return;
            session.refresh();
            toast({ title: 'Imported', description: `${report.incidents} incidents added.`, tone: 'success' });
        } catch {
            toast({ title: 'Nothing imported', description: 'That file is not a Resolvr backup.', tone: 'warning' });
        }
    };

    return (
        <SettingsCard
            id="data"
            icon={<Database className="size-4" />}
            title="Your data"
            description="Take it with you, or remove it."
        >
            <SettingRow
                title="Readable copy"
                description="A JSON file of your incidents, people and document drafts. It is not encrypted, so store it carefully."
            >
                <Button size="sm" onClick={() => setExporting(true)}>
                    <FileJson aria-hidden /> Export
                </Button>
            </SettingRow>
            <SettingRow
                title="Import from the first Resolvr"
                description="Bring in a JSON backup from the earlier version of the app."
            >
                <Button size="sm" onClick={() => void importPrototype()}>
                    <Upload aria-hidden /> Import
                </Button>
            </SettingRow>
            <SettingRow
                title={session.isDecoy ? 'Delete this record' : 'Delete everything'}
                description="Permanently erase everything on this device."
            >
                <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
                    <Trash2 aria-hidden /> Delete
                </Button>
            </SettingRow>

            <PinConfirm
                open={exporting}
                onOpenChange={setExporting}
                title="Export a readable copy"
                description="The file will not be encrypted. Anyone who opens it can read your record."
                confirmLabel="Export"
                tone="primary"
                onConfirm={exportJson}
            />
            <DeleteEverything open={deleting} onOpenChange={setDeleting} settings={settings} />
        </SettingsCard>
    );
}

function DeleteEverything({
    open,
    onOpenChange,
    settings,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: Settings;
}) {
    const session = useSession();
    const [step, setStep] = useState<1 | 2>(1);
    const [typed, setTyped] = useState('');
    const [alsoOnline, setAlsoOnline] = useState(false);
    const [busy, setBusy] = useState(false);
    const b = settings.backup;
    const hasOnline = Boolean(b.backupId && b.token && b.lastBackupAt);

    const close = (o: boolean) => {
        onOpenChange(o);
        if (!o) {
            setStep(1);
            setTyped('');
            setAlsoOnline(false);
        }
    };

    const erase = async () => {
        setBusy(true);
        if (alsoOnline && b.backupId && b.token)
            await deleteCloudBackup({ backupId: b.backupId, token: b.token }).catch(() => undefined);
        await session.wipe();
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent
                title="Delete everything?"
                description="Incidents, evidence, people and documents on this device will be erased. This cannot be undone."
            >
                {step === 1 ? (
                    <div className="space-y-4 text-sm">
                        <p className="text-fg-muted">
                            If you might need this record later, export a copy or back it up first.
                        </p>
                        {hasOnline && (
                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 size-4 accent-[var(--accent)]"
                                    checked={alsoOnline}
                                    onChange={(e) => setAlsoOnline(e.target.checked)}
                                />
                                <span className="text-fg">Also delete my encrypted online backup</span>
                            </label>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => close(false)}>
                                Keep my record
                            </Button>
                            <Button variant="danger" onClick={() => setStep(2)}>
                                Continue
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void erase();
                        }}
                    >
                        <Field label="Type DELETE to confirm">
                            <Input
                                autoFocus
                                autoComplete="off"
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                            />
                        </Field>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => close(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                disabled={busy || typed.trim().toUpperCase() !== 'DELETE'}
                            >
                                {busy ? 'Deleting…' : 'Delete everything'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
