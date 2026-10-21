import { useEffect, useState } from 'react';

import { LOCKOUT_MS } from '../session';

/** A calm countdown ring shown after too many wrong attempts. */
export function LockoutRing({ until, onDone }: { until: number; onDone: () => void }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= until) {
                window.clearInterval(timer);
                onDone();
            }
        }, 250);
        return () => window.clearInterval(timer);
    }, [until, onDone]);

    const remaining = Math.max(0, until - now);
    const seconds = Math.ceil(remaining / 1000);
    const r = 44;
    const circumference = 2 * Math.PI * r;
    return (
        <div className="flex flex-col items-center gap-4" role="timer" aria-live="polite">
            <div className="relative size-28">
                <svg viewBox="0 0 100 100" className="lockout-ring size-28" aria-hidden>
                    <circle className="track" cx="50" cy="50" r={r} />
                    <circle
                        className="progress"
                        cx="50"
                        cy="50"
                        r={r}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - remaining / LOCKOUT_MS)}
                    />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-2xl text-fg tabular-nums">
                    {seconds}
                </span>
            </div>
            <p className="max-w-xs text-center text-sm text-fg-muted">
                Too many attempts. Take a breath; you can try again in {seconds} seconds.
            </p>
        </div>
    );
}
