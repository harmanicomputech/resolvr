import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { severities, type Severity } from '@/lib/model/catalog';
import { cn } from '@/lib/utils';

const label: Record<Severity, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
/** Ordinal one-hue ramp (validated): darker = more serious. */
const fill: Record<Severity, string> = {
    low: 'var(--chart-sev-1)',
    medium: 'var(--chart-sev-2)',
    high: 'var(--chart-sev-3)',
    critical: 'var(--chart-sev-4)',
};

const R = 52;
const STROKE = 16;
const C = 2 * Math.PI * R;
const GAP = 2; // px of surface between segments

/** Part-to-whole by severity, with a legend that always shows each count and share. */
export function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
    const [active, setActive] = useState<Severity | null>(null);
    const reduce = useReducedMotion();
    const total = severities.reduce((s, k) => s + counts[k], 0);
    const present = severities.filter((s) => counts[s] > 0);

    const segments = severities.map((s, i) => {
        const before = severities.slice(0, i).reduce((sum, k) => sum + counts[k], 0);
        const length = total ? (counts[s] / total) * C : 0;
        return {
            s,
            length: Math.max(0, length - (present.length > 1 ? GAP : 0)),
            offset: total ? (before / total) * C : 0,
        };
    });

    const centre = active ? counts[active] : total;
    return (
        <div className="flex items-center gap-6">
            <div className="relative size-36 shrink-0">
                <svg viewBox="0 0 140 140" className="size-36 -rotate-90" aria-hidden>
                    <circle cx={70} cy={70} r={R} fill="none" stroke="var(--chart-heat-0)" strokeWidth={STROKE} />
                    {segments.map(({ s, length, offset: o }, i) =>
                        length > 0 ? (
                            <motion.circle
                                key={s}
                                cx={70}
                                cy={70}
                                r={R}
                                fill="none"
                                stroke={fill[s]}
                                strokeWidth={active === s ? STROKE + 4 : STROKE}
                                strokeDasharray={`${length} ${C}`}
                                strokeDashoffset={-o}
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: active && active !== s ? 0.35 : 1 }}
                                transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.08 }}
                                onMouseEnter={() => setActive(s)}
                                onMouseLeave={() => setActive(null)}
                                className="transition-[stroke-width] duration-(--dur-fast)"
                            />
                        ) : null,
                    )}
                </svg>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="font-display text-2xl font-semibold text-fg">{centre}</p>
                        <p className="text-2xs text-fg-muted">{active ? label[active] : 'in total'}</p>
                    </div>
                </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm" aria-label="Incidents by severity">
                {[...severities].reverse().map((s) => (
                    <li key={s}>
                        <button
                            type="button"
                            className={cn(
                                'flex w-full items-center gap-2 rounded-(--radius-sm) px-1.5 py-1 text-left transition-colors focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none',
                                active === s && 'bg-raised',
                            )}
                            onMouseEnter={() => setActive(s)}
                            onMouseLeave={() => setActive(null)}
                            onFocus={() => setActive(s)}
                            onBlur={() => setActive(null)}
                        >
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: fill[s] }}
                                aria-hidden
                            />
                            <span className="flex-1 text-fg-muted">{label[s]}</span>
                            <span className="font-medium text-fg tabular-nums">{counts[s]}</span>
                            <span className="w-10 text-right text-xs text-fg-subtle tabular-nums">
                                {total ? Math.round((counts[s] / total) * 100) : 0}%
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
