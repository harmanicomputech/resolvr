import { ArrowRight, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import type { Readiness } from '@/lib/scoring/readiness';
import { cn } from '@/lib/utils';

import { useNavigate } from '../../hooks/use-navigate';

const actions = [
    { label: 'Log an incident', href: '/log' },
    { label: 'Add evidence', href: '/vault?upload=1' },
    { label: 'Draft an HR letter', href: '/documents' },
    { label: 'Prepare a case file', href: '/documents?type=dossier' },
];

/** Four milestones on one path, the reached part drawn in, and a single next action. */
export function ReadinessPath({ readiness }: { readiness: Readiness }) {
    const reduce = useReducedMotion();
    const navigate = useNavigate();
    const n = readiness.stages.length;
    const progress = readiness.current < 0 ? 0 : readiness.current / (n - 1);
    const action = actions[Math.min(readiness.current + 1, n - 1)]!;

    return (
        <div className="card p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex-1">
                    <h2 className="text-sm font-medium text-fg">Case readiness</h2>
                    <div className="relative mt-5">
                        <div
                            className="absolute top-3 right-[12.5%] left-[12.5%] h-0.5 rounded-full bg-hairline"
                            aria-hidden
                        >
                            <motion.div
                                className="h-full rounded-full bg-accent"
                                initial={reduce ? false : { width: 0 }}
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                            />
                        </div>
                        <ol className="relative grid grid-cols-4" aria-label="Case readiness">
                            {readiness.stages.map((stage, i) => {
                                const current = i === readiness.current;
                                return (
                                    <li
                                        key={stage.name}
                                        className="relative flex flex-col items-center gap-2 text-center"
                                        aria-current={current ? 'step' : undefined}
                                    >
                                        <motion.span
                                            className={cn(
                                                'grid size-6 place-items-center rounded-full border-2 bg-surface',
                                                stage.done
                                                    ? 'border-accent bg-accent text-accent-fg'
                                                    : 'border-hairline-strong',
                                            )}
                                            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 400,
                                                damping: 22,
                                                delay: reduce ? 0 : 0.15 + i * 0.12,
                                            }}
                                        >
                                            {stage.done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                                        </motion.span>
                                        <span
                                            className={cn(
                                                'text-xs',
                                                stage.done ? 'font-medium text-fg' : 'text-fg-subtle',
                                            )}
                                        >
                                            {stage.name}
                                        </span>
                                        <span className="sr-only">{stage.done ? '(reached)' : '(not yet)'}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>
                <div className="md:w-72 md:border-l md:border-hairline md:pl-6">
                    <p className="eyebrow">Next step</p>
                    <p className="mt-1 text-sm text-fg">{readiness.nextStep}</p>
                    <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate(action.href)}>
                        {action.label} <ArrowRight aria-hidden />
                    </Button>
                </div>
            </div>
        </div>
    );
}
