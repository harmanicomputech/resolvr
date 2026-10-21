import { Fingerprint, LockKeyhole } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { Wordmark } from '../components/wordmark';
import { haptic } from '../lib/haptics';
import { LockoutRing } from '../lock/LockoutRing';
import { PinEntry, type PinEntryHandle } from '../lock/PinEntry';
import { MAX_ATTEMPTS, useSession } from '../session';

/** Frosted lock screen over a slow aurora. Unlocking dissolves it into the app (see App.tsx). */
export function LockScreen({ onForgot }: { onForgot: () => void }) {
    const session = useSession();
    const entry = useRef<PinEntryHandle>(null);
    const [busy, setBusy] = useState(false);
    const [lockedUntil, setLockedUntil] = useState(() =>
        session.lockout.until > Date.now() ? session.lockout.until : 0,
    );
    const triedPasskey = useRef(false);

    const tryPasskey = useCallback(async () => {
        setBusy(true);
        const ok = await session.unlockWithPasskey();
        if (ok) haptic('success');
        setBusy(false);
    }, [session]);

    // Offer the passkey straight away once per lock, like a phone's face unlock.
    useEffect(() => {
        if (session.hasPasskey && !triedPasskey.current && !lockedUntil) {
            triedPasskey.current = true;
            void tryPasskey();
        }
    }, [session.hasPasskey, lockedUntil, tryPasskey]);

    const submit = async (pin: string) => {
        setBusy(true);
        const result = await session.unlock(pin);
        setBusy(false);
        if (result === 'ok') {
            haptic('success');
            return;
        }
        entry.current?.reject();
        if (result === 'locked-out') setLockedUntil(Date.now() + 30_000);
    };

    const attemptsLeft = MAX_ATTEMPTS - session.lockout.attempts;

    return (
        <main className="relative min-h-dvh">
            <div className="lock-backdrop" aria-hidden />
            <div className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-10 px-6 py-12">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="icon-badge" data-size="lg" aria-hidden>
                        <LockKeyhole className="size-6" />
                    </span>
                    <Wordmark className="text-xl" />
                    <h1 className="text-sm text-fg-muted">
                        {session.pinFormat === 'phrase' ? 'Enter your passphrase' : 'Enter your PIN'}
                    </h1>
                </div>

                {lockedUntil ? (
                    <LockoutRing until={lockedUntil} onDone={() => setLockedUntil(0)} />
                ) : (
                    <PinEntry
                        ref={entry}
                        format={session.pinFormat}
                        onComplete={(pin) => void submit(pin)}
                        disabled={busy}
                        label="Passcode"
                    />
                )}

                <p className="min-h-5 text-center text-xs text-fg-subtle" aria-live="polite">
                    {!lockedUntil &&
                        session.lockout.attempts > 0 &&
                        `${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left before a short pause`}
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                    {session.hasPasskey && !lockedUntil && (
                        <Button variant="ghost" size="sm" onClick={() => void tryPasskey()} disabled={busy}>
                            <Fingerprint aria-hidden /> Use passkey
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onForgot}>
                        Forgot passcode?
                    </Button>
                </div>
            </div>
        </main>
    );
}
