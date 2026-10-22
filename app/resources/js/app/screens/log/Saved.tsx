import { ArrowRight, Check, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { CheckDraw } from '../../components/check-draw';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Incident } from '@/lib/model/schema';

const HEX = '0123456789abcdef';

/** The fingerprint resolves character by character: a visual of the record being sealed. */
function HashReveal({ hash }: { hash: string }) {
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(reduce ? hash.length : 0);
    const [noise, setNoise] = useState('');
    useEffect(() => {
        if (reduce) return;
        let i = 0;
        const timer = window.setInterval(() => {
            i += 2;
            setShown(Math.min(i, hash.length));
            setNoise(
                Array.from(
                    { length: Math.max(0, Math.min(8, hash.length - i)) },
                    () => HEX[Math.floor(Math.random() * 16)],
                ).join(''),
            );
            if (i >= hash.length) window.clearInterval(timer);
        }, 18);
        return () => window.clearInterval(timer);
    }, [hash, reduce]);
    return (
        <p className="mono text-xs break-all text-fg-muted" aria-label={`Fingerprint ${hash}`}>
            <span className="text-fg">{hash.slice(0, shown)}</span>
            <span className="text-fg-subtle">{noise}</span>
        </p>
    );
}

/** After saving: the locked timestamp and fingerprint, then next steps. */
export function Saved({
    incident,
    onView,
    onAnother,
    onDone,
}: {
    incident: Incident;
    onView: () => void;
    onAnother: () => void;
    onDone: () => void;
}) {
    const reduce = useReducedMotion();
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-10 text-center">
            <motion.span
                className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg"
                initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
                <CheckDraw className="size-8" />
            </motion.span>
            <h2 className="mt-5 font-display text-2xl font-semibold text-fg" tabIndex={-1} data-autofocus>
                Saved and sealed
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
                <span className="mono">{incident.incId}</span> is now part of your record.
            </p>
            <dl className="card mt-6 w-full max-w-md space-y-3 p-4 text-left">
                <div>
                    <dt className="eyebrow">Locked timestamp</dt>
                    <dd className="mono mt-1 text-sm text-fg">
                        {new Date(incident.updatedAt).toLocaleString(undefined, {
                            dateStyle: 'full',
                            timeStyle: 'long',
                        })}
                    </dd>
                </div>
                <div>
                    <dt className="eyebrow">Fingerprint (SHA-256)</dt>
                    <dd className="mt-1">
                        <HashReveal hash={incident.hash} />
                    </dd>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-fg-subtle">
                    <Check className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
                    Any later edit is kept as a new version; this one cannot be changed without it showing.
                </p>
            </dl>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={onView}>
                    View incident <ArrowRight aria-hidden />
                </Button>
                <Button onClick={onAnother}>
                    <Plus aria-hidden /> Log another
                </Button>
                <Button variant="ghost" onClick={onDone}>
                    Done
                </Button>
            </div>
        </div>
    );
}
