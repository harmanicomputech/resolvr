import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { isValidPhrase } from '@/lib/backup/recovery';

import { useSession } from '../session';
import { PasscodeField, pinRules } from './settings/parts';

/** Set a new passcode with the recovery phrase. The record itself is untouched. */
export default function RecoverWithPhrase({ onDone }: { onDone: () => void }) {
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
