import { ArrowRight, CloudDownload, FileArchive, LifeBuoy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { downloadBackup } from '@/lib/backup/cloud';
import { backupRecovery, readBackupHeader } from '@/lib/backup/format';
import { deriveRecovery, isValidPhrase, PHRASE_WORDS, unknownWords } from '@/lib/backup/recovery';
import { Vault } from '@/lib/db';

import { useSession } from '../session';
import { Footer, Hero, Passcode } from './onboarding-parts';

type Source = 'online' | 'file';

/**
 * Restore on a new device: the recovery phrase finds and unlocks the backup
 * (online, or a `.resolvr` file), then a new passcode is chosen for this
 * device. The backup is checked before anything is written.
 */
export function Restore({ onBack }: { onBack: () => void }) {
    const session = useSession();
    const [step, setStep] = useState<'phrase' | 'passcode'>('phrase');
    const [source, setSource] = useState<Source>('online');
    const [phrase, setPhrase] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [backup, setBackup] = useState<Blob | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState('');

    const words = phrase.trim() ? phrase.trim().split(/\s+/).length : 0;
    const unknown = unknownWords(phrase);
    const valid = isValidPhrase(phrase);

    const find = async () => {
        setError('');
        setProgress(0);
        try {
            const keys = await deriveRecovery(phrase);
            const blob =
                source === 'online'
                    ? await downloadBackup({ backupId: keys.backupId, token: keys.token }, setProgress)
                    : file!;
            const { header } = await readBackupHeader(blob);
            if (!(await Vault.opensRecovery(backupRecovery(header), keys.wrappingKey)))
                throw new Error('That recovery phrase does not open this backup.');
            setBackup(blob);
            setStep('passcode');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The backup could not be opened.');
        } finally {
            setProgress(null);
        }
    };

    if (step === 'passcode' && backup)
        return (
            <Passcode
                id="restore-passcode"
                onBack={() => setStep('phrase')}
                onCreated={() => undefined}
                busyLabel="Restoring your record…"
                create={async (pin, format) => {
                    try {
                        await session.restore(backup, phrase, pin, format);
                    } catch (e) {
                        setStep('phrase');
                        setError(e instanceof Error ? e.message : 'The backup could not be restored.');
                        throw e;
                    }
                }}
            />
        );

    return (
        <>
            <Hero id="restore-title" icon={<LifeBuoy className="size-6" />} title="Restore your record">
                Enter your 12-word recovery phrase. Your backup is decrypted here, on this device.
            </Hero>
            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    void find();
                }}
            >
                <SegmentedControl
                    label="Where is your backup?"
                    value={source}
                    onValueChange={setSource}
                    options={[
                        { value: 'online', label: 'Online backup' },
                        { value: 'file', label: 'Backup file' },
                    ]}
                    className="w-full"
                />
                {source === 'file' && (
                    <Field label="Backup file" hint="A .resolvr file you downloaded from Settings.">
                        <input
                            type="file"
                            accept=".resolvr,application/octet-stream"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-(--radius-sm) file:border-0 file:bg-raised file:px-3 file:py-2 file:text-fg"
                        />
                    </Field>
                )}
                <Field
                    label="Recovery phrase"
                    hint={
                        unknown.length
                            ? `Not on the word list: ${unknown.join(', ')}`
                            : `${words} of ${PHRASE_WORDS} words`
                    }
                >
                    <Textarea
                        rows={3}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className="mono"
                        value={phrase}
                        onChange={(e) => setPhrase(e.target.value)}
                    />
                </Field>
                {progress !== null && (
                    <progress
                        className="h-1.5 w-full accent-[var(--accent)]"
                        value={progress}
                        max={1}
                        aria-label="Finding your backup"
                    />
                )}
                <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                    {error}
                </p>
                <Footer onBack={onBack}>
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={!valid || progress !== null || (source === 'file' && !file)}
                    >
                        {source === 'online' ? <CloudDownload aria-hidden /> : <FileArchive aria-hidden />}
                        Find my backup <ArrowRight aria-hidden />
                    </Button>
                </Footer>
            </form>
        </>
    );
}
