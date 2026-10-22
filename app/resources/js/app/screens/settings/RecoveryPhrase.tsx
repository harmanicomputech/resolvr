import { Check, KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { generatePhrase } from '@/lib/backup/recovery';

import { PasscodeField } from './parts';
import { useSession } from '../../session';

type Step = 'intro' | 'show' | 'check' | 'pin';

/** Pick three different word positions to ask back. */
function pickPositions(): number[] {
    const all = Array.from({ length: 12 }, (_, i) => i);
    const out: number[] = [];
    while (out.length < 3) {
        const i = crypto.getRandomValues(new Uint32Array(1))[0]! % all.length;
        out.push(all.splice(i, 1)[0]!);
    }
    return out.sort((a, b) => a - b);
}

/**
 * Create a recovery phrase: show 12 words once, ask three of them back, then
 * confirm the passcode so the data key can be wrapped for the phrase.
 */
export function RecoveryPhraseDialog({
    open,
    onOpenChange,
    onDone,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}) {
    const session = useSession();
    const [step, setStep] = useState<Step>('intro');
    const [phrase, setPhrase] = useState('');
    const [answers, setAnswers] = useState<string[]>(['', '', '']);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const words = useMemo(() => phrase.split(' '), [phrase]);
    const [positions, setPositions] = useState<number[]>([]);

    const close = (o: boolean) => {
        onOpenChange(o);
        if (!o) {
            setStep('intro');
            setPhrase('');
            setAnswers(['', '', '']);
            setPin('');
            setError('');
        }
    };

    const check = () => {
        const ok = positions.every((p, i) => answers[i]?.trim().toLowerCase() === words[p]);
        if (!ok) return setError('One of those words does not match. Look at your copy and try again.');
        setError('');
        setStep('pin');
    };

    const save = async () => {
        setBusy(true);
        setError('');
        try {
            if (!(await session.verifyPin(pin))) return setError('That passcode is not right.');
            await session.setupRecovery(pin, phrase);
            close(false);
            onDone();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent
                title="Recovery phrase"
                description="Twelve words that can restore your record on a new device, or reset a forgotten passcode."
            >
                {step === 'intro' && (
                    <div className="space-y-4 text-sm text-fg-muted">
                        <p>
                            Write the words on paper and keep them somewhere private and safe, away from work. Anyone
                            with them and your backup could open your record.
                        </p>
                        <p>We never see the phrase and cannot show it to you again.</p>
                        {session.hasRecovery && (
                            <p className="rounded-(--radius-md) bg-raised p-3 text-fg">
                                Making a new phrase replaces the old one. Backups made with the old phrase will no
                                longer be updated.
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => close(false)}>
                                Not now
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setPhrase(generatePhrase());
                                    setPositions(pickPositions());
                                    setStep('show');
                                }}
                            >
                                Show my words
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'show' && (
                    <div className="space-y-4">
                        <ol
                            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                            aria-label="Your recovery phrase"
                            data-testid="recovery-words"
                        >
                            {words.map((w, i) => (
                                <li
                                    key={i}
                                    className="flex items-baseline gap-2 rounded-(--radius-md) border border-hairline px-3 py-2"
                                >
                                    <span className="mono w-5 text-right text-xs text-fg-subtle">{i + 1}</span>
                                    <span className="mono text-sm text-fg">{w}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-sm text-fg-muted">
                            Avoid screenshots or notes apps that sync to a work account.
                        </p>
                        <div className="flex justify-end">
                            <Button variant="primary" onClick={() => setStep('check')}>
                                I have written them down
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'check' && (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            check();
                        }}
                    >
                        <p className="text-sm text-fg-muted">Just to be sure, type these three words from your copy.</p>
                        {positions.map((p, i) => (
                            <Field key={p} label={`Word ${p + 1}`}>
                                <Input
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    autoFocus={i === 0}
                                    value={answers[i]}
                                    onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                                />
                            </Field>
                        ))}
                        <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                            {error}
                        </p>
                        <div className="flex justify-between gap-2">
                            <Button variant="ghost" onClick={() => setStep('show')}>
                                See the words again
                            </Button>
                            <Button type="submit" variant="primary" disabled={answers.some((a) => !a.trim())}>
                                Check
                            </Button>
                        </div>
                    </form>
                )}

                {step === 'pin' && (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void save();
                        }}
                    >
                        <p className="flex items-center gap-2 text-sm text-fg">
                            <Check className="size-4 text-accent-text" aria-hidden /> Those match.
                        </p>
                        <PasscodeField
                            label="Your passcode"
                            format={session.pinFormat}
                            value={pin}
                            onChange={setPin}
                            autoComplete="current-password"
                            autoFocus
                        />
                        <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                            {error}
                        </p>
                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" disabled={!pin || busy}>
                                <KeyRound aria-hidden /> {busy ? 'Saving…' : 'Save recovery phrase'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
