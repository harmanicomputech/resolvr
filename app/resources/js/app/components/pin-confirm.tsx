import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';

import { useSession } from '../session';

interface PinConfirmProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    /** Receives the checked passcode, for actions that need it (e.g. re-wrapping the key). */
    onConfirm: (pin: string) => Promise<void> | void;
    tone?: 'danger' | 'primary';
}

/** Ask for the passcode again before a sensitive action (delete, export, settings). */
export function PinConfirm({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    tone = 'danger',
}: PinConfirmProps) {
    const session = useSession();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const numeric = session.pinFormat !== 'phrase';

    const submit = async () => {
        setBusy(true);
        setError('');
        const ok = await session.verifyPin(pin);
        if (!ok) {
            setBusy(false);
            setError('That passcode is not right.');
            return;
        }
        await onConfirm(pin);
        setBusy(false);
        setPin('');
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                onOpenChange(o);
                if (!o) {
                    setPin('');
                    setError('');
                }
            }}
        >
            <DialogContent title={title} description={description}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                    className="space-y-4"
                >
                    <Field label="Your passcode" error={error || undefined}>
                        <Input
                            type="password"
                            inputMode={numeric ? 'numeric' : undefined}
                            autoComplete="current-password"
                            autoFocus
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant={tone} disabled={!pin || busy}>
                            {busy ? 'Checking…' : confirmLabel}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
