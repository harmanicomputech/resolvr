import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SCORE_CAPS, scoreLabel, scoreTips, type ScoreParts } from '@/lib/scoring/score';

import { CountUp } from '../../components/count-up';

const factorNames: Record<keyof typeof SCORE_CAPS, string> = {
    incidents: 'Incidents logged',
    witnesses: 'Witnesses named',
    severity: 'Severity recorded',
    descriptions: 'Detailed descriptions',
    files: 'Evidence files',
    variety: 'Types of treatment',
    notes: 'Follow-up notes',
};

// A 270° arc, open at the bottom.
const R = 44;
const ARC = 1.5 * Math.PI * R;

/** Evidence strength as a radial gauge; the breakdown explains each factor and how to raise it. */
export function ScoreGauge({ score }: { score: ScoreParts }) {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    const fraction = score.total / 100;

    return (
        <div className="flex h-full flex-col items-center">
            <div className="relative size-40">
                <svg viewBox="0 0 100 100" className="size-40 rotate-[135deg]" aria-hidden>
                    <circle
                        cx={50}
                        cy={50}
                        r={R}
                        fill="none"
                        stroke="var(--accent-tint)"
                        strokeWidth={7}
                        strokeLinecap="round"
                        strokeDasharray={`${ARC} 999`}
                    />
                    <motion.circle
                        cx={50}
                        cy={50}
                        r={R}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={7}
                        strokeLinecap="round"
                        strokeDasharray={`${ARC} 999`}
                        initial={reduce ? false : { strokeDashoffset: ARC }}
                        animate={{ strokeDashoffset: ARC * (1 - fraction) }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                        <CountUp value={score.total} className="font-display text-4xl font-semibold text-fg" />
                        <p className="text-2xs text-fg-subtle">out of 100</p>
                    </div>
                </div>
            </div>
            <p className="-mt-3 text-sm font-medium text-fg">{scoreLabel(score.total)}</p>
            <p className="sr-only">
                Evidence strength {score.total} out of 100: {scoreLabel(score.total)}.
            </p>
            <Button variant="ghost" size="sm" className="mt-auto" onClick={() => setOpen(true)}>
                What makes this up?
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="right"
                    className="w-full max-w-md"
                    title="Evidence strength"
                    description="How organised and complete your record is. It is not a prediction of any outcome."
                >
                    <ul className="space-y-5">
                        {(Object.keys(factorNames) as (keyof typeof SCORE_CAPS)[]).map((key) => {
                            const value = score[key];
                            const cap = SCORE_CAPS[key];
                            const full = value >= cap;
                            return (
                                <li key={key}>
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="font-medium text-fg">{factorNames[key]}</span>
                                        <span className="text-fg-muted tabular-nums">
                                            {value} / {cap}
                                        </span>
                                    </div>
                                    <div
                                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-tint"
                                        role="meter"
                                        aria-valuemin={0}
                                        aria-valuemax={cap}
                                        aria-valuenow={value}
                                        aria-label={factorNames[key]}
                                    >
                                        <motion.div
                                            className="h-full rounded-full bg-accent"
                                            initial={reduce ? false : { width: 0 }}
                                            animate={{ width: `${(value / cap) * 100}%` }}
                                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                        />
                                    </div>
                                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-fg-muted">
                                        {full ? (
                                            <>
                                                <Check className="mt-px size-3.5 shrink-0 text-success" aria-hidden />{' '}
                                                Complete.
                                            </>
                                        ) : (
                                            scoreTips[key]
                                        )}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-6 text-xs text-fg-subtle">General guidance only, not legal advice.</p>
                </SheetContent>
            </Sheet>
        </div>
    );
}
