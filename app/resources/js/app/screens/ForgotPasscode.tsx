import { lazy, Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';

import { useSession } from '../session';

const RecoverWithPhrase = lazy(() => import('./RecoverWithPhrase'));

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
                        <Suspense fallback={null}>
                            <RecoverWithPhrase onDone={() => onOpenChange(false)} />
                        </Suspense>
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
