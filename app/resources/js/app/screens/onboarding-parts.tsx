import { ArrowLeft, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { haptic } from '../lib/haptics';
import { PinEntry, type PinEntryHandle } from '../lock/PinEntry';
import { useSession, type PinFormat } from '../session';

/* Building blocks shared by onboarding and restoring from a backup. */

/** The large icon tile that leads each step; shares a layout id so it glides between steps. */
export function Hero({
    icon,
    title,
    id,
    children,
}: {
    icon: ReactNode;
    title: string;
    id: string;
    children?: ReactNode;
}) {
    return (
        <div className="mt-10 mb-8">
            <motion.span layoutId="onb-icon" className="icon-badge" data-size="lg" aria-hidden>
                {icon}
            </motion.span>
            <h1 id={id} className="mt-6 font-display text-3xl font-semibold tracking-tight text-fg">
                {title}
            </h1>
            {children && <div className="mt-3 text-fg-muted">{children}</div>}
        </div>
    );
}

export function Row({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="icon-badge" aria-hidden>
                {icon}
            </span>
            <div className="text-sm">
                <p className="font-medium text-fg">{title}</p>
                <p className="text-fg-muted">{children}</p>
            </div>
        </li>
    );
}

export function Footer({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
    return (
        <div className="mt-auto flex items-center gap-3 pt-8">
            {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
                    <ArrowLeft aria-hidden />
                </Button>
            )}
            <div className="flex-1">{children}</div>
        </div>
    );
}

const formatOptions = [
    { value: 'pin6', label: '6 digits' },
    { value: 'phrase', label: 'Passphrase' },
    { value: 'pin4', label: '4 digits' },
] as const;

const formatHint: Record<PinFormat, string> = {
    pin6: 'Recommended. Quick to type, and a million combinations.',
    phrase: 'Strongest. At least 8 characters; works best for desktop use.',
    pin4: 'Fastest, but easier to guess if someone copies your device. Stealth unlock works with any PIN.',
};

export function Passcode({
    onBack,
    onCreated,
    create,
    busyLabel = 'Securing your vault…',
    id = 'onb-passcode',
}: {
    onBack: () => void;
    onCreated: (pin: string) => void;
    /** What to do with the new passcode. Defaults to creating a fresh vault. */
    create?: (pin: string, format: PinFormat) => Promise<void>;
    busyLabel?: string;
    id?: string;
}) {
    const session = useSession();
    const [format, setFormat] = useState<PinFormat>('pin6');
    const [first, setFirst] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [mismatch, setMismatch] = useState(false);
    const entry = useRef<PinEntryHandle>(null);

    const complete = async (pin: string) => {
        if (!first) {
            setFirst(pin);
            setMismatch(false);
            entry.current?.clear();
            return;
        }
        if (pin !== first) {
            setMismatch(true);
            setFirst(null);
            entry.current?.reject();
            return;
        }
        setBusy(true);
        try {
            await (create ?? session.create)(pin, format);
        } catch (error) {
            setBusy(false);
            setFirst(null);
            throw error;
        }
        haptic('success');
        onCreated(pin);
    };

    return (
        <>
            <Hero
                id={id}
                icon={<KeyRound className="size-6" />}
                title={first ? 'Enter it once more' : 'Choose a passcode'}
            >
                {first ? 'Just to be sure it is the one you meant.' : 'You will use it every time you open Resolvr.'}
            </Hero>
            {!first && (
                <div className="mb-8">
                    <SegmentedControl
                        label="Passcode type"
                        value={format}
                        onValueChange={setFormat}
                        options={formatOptions}
                        className="w-full"
                    />
                    <p className="mt-2 text-xs text-fg-muted">{formatHint[format]}</p>
                </div>
            )}
            <PinEntry
                key={`${format}-${first ? 2 : 1}`}
                ref={entry}
                format={format}
                onComplete={(pin) => void complete(pin).catch(() => undefined)}
                disabled={busy}
                label={first ? 'Confirm passcode' : 'New passcode'}
            />
            <p className="mt-6 min-h-5 text-center text-sm text-danger-text" aria-live="assertive">
                {mismatch && 'Those did not match. Please choose it again.'}
                {busy && <span className="text-fg-muted">{busyLabel}</span>}
            </p>
            <Footer onBack={first ? () => setFirst(null) : onBack}>{null}</Footer>
        </>
    );
}
