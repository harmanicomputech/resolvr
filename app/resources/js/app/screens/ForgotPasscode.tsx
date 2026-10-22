import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { isValidPhrase } from '@/lib/backup/recovery';

import { useSession } from '../session';
import { PasscodeField, pinRules } from './settings/parts';

/**
 * There is no reset: the passcode is the only way to the key. Be clear and
 * kind about that, and make erasing deliberate.
 */
export function ForgotPasscode({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const session = useSession();
    const [confirm, setConfirm] = useState('');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                title="Forgot your passcode?"
                description="Your record is encrypted with it, and nobody, including us, can open it without it."
            >
                <div className="space-y-4 text-sm text-fg-muted">
                    <p>
                        Take your time: try the passcodes you usually use. After a few tries there is a short pause, and
                        then you can try again.
                    </p>
                    {session.hasRecovery ? (
                        <RecoverWithPhrase onDone={() => onOpenChange(false)} />
                    ) : (
                        <p>If you made an encrypted backup, you can restore it after starting again.</p>
                    )}
                    <div className="rounded-(--radius-md) border border-hairline p-4">
                        <p className="font-medium text-fg">Start again on this device</p>
                        <p className="mt-1">
                            This permanently erases everything stored here. Type{' '}
                            <strong className="text-fg">ERASE</strong> to confirm.
                        </p>
                        <label className="sr-only" htmlFor="erase-confirm">
                            Type ERASE to confirm
                        </label>
                        <Input
                            id="erase-confirm"
                            className="mt-3"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="off"
                        />
                        <Button
                            variant="danger"
                            className="mt-3 w-full"
                            disabled={confirm.trim().toUpperCase() !== 'ERASE'}
                            onClick={() => {
                                void session.wipe();
                                onOpenChange(false);
                            }}
                        >
                            Erase and start again
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** Set a new passcode with the recovery phrase. The record itself is untouched. */
function RecoverWithPhrase({ onDone }: { onDone: () => void }) {
    const session = useSession();
    const format = session.pinFormat;
    const [phrase, setPhrase] = useState('');
    const [pin, setPin] = useState('');
    const [again, setAgain] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setError('');
        if (!pinRules[format].pattern.test(pin))
            return setError(`The new passcode needs ${pinRules[format].hint.toLowerCase()}.`);
        if (pin !== again) return setError('The new passcodes do not match.');
        setBusy(true);
        try {
            await session.recoverPin(phrase, pin, format);
            onDone();
        } catch {
            setError('That recovery phrase does not match this record.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            className="space-y-3 rounded-(--radius-md) border border-hairline p-4"
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
        >
            <p className="font-medium text-fg">Use your recovery phrase</p>
            <Field label="Recovery phrase">
                <Textarea
                    rows={2}
                    className="mono"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                />
            </Field>
            <PasscodeField label="New passcode" format={format} value={pin} onChange={setPin} />
            <PasscodeField label="New passcode again" format={format} value={again} onChange={setAgain} />
            <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                {error}
            </p>
            <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={busy || !isValidPhrase(phrase) || !pin || !again}
            >
                {busy ? 'Checking…' : 'Set new passcode'}
            </Button>
        </form>
    );
}
