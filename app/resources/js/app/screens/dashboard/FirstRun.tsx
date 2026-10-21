import { ArrowRight, ChartLine, FolderLock, NotebookPen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { greeting } from '@/lib/scoring/series';

import { useNavigate } from '../../hooks/use-navigate';

const steps = [
    {
        icon: NotebookPen,
        title: 'Write down what happened',
        body: 'Start with the most recent incident. A few lines is enough; you can add more later.',
    },
    {
        icon: FolderLock,
        title: 'Keep the proof with it',
        body: 'Screenshots, emails and photos stay encrypted on this device.',
    },
    {
        icon: ChartLine,
        title: 'See the bigger picture',
        body: 'As your record grows, Resolvr shows patterns and how ready your case is.',
    },
];

/** Empty dashboard: an illustrated, three-step first-run guide. */
export function FirstRun({ name }: { name: string }) {
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    return (
        <div className="mx-auto max-w-3xl py-6">
            <div className="relative mx-auto mb-8 size-40" aria-hidden>
                <div className="absolute inset-4 rounded-full bg-accent-tint" />
                {steps.map(({ icon: Icon }, i) => (
                    <motion.span
                        key={i}
                        className="icon-badge absolute bg-surface shadow-(--shadow-raised)"
                        data-size="lg"
                        style={{ left: ['8%', '56%', '30%'][i], top: ['14%', '22%', '58%'][i] }}
                        initial={reduce ? false : { opacity: 0, scale: 0.6, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: reduce ? 0 : 0.1 + i * 0.12 }}
                    >
                        <Icon className="size-6" />
                    </motion.span>
                ))}
            </div>
            <div className="text-center">
                <p className="text-sm text-fg-muted">
                    {greeting()}
                    {name ? `, ${name}` : ''}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg md:text-3xl">
                    Let’s start your record
                </h2>
                <p className="mx-auto mt-2 max-w-md text-fg-muted">
                    Everything stays private and encrypted on this device.
                </p>
            </div>
            <ol className="mt-8 grid gap-3 md:grid-cols-3">
                {steps.map(({ icon: Icon, title, body }, i) => (
                    <li key={title} className="card p-5">
                        <div className="flex items-center gap-2">
                            <span className="icon-badge size-8" aria-hidden>
                                <Icon className="size-4" />
                            </span>
                            <span className="mono text-xs text-fg-subtle">Step {i + 1}</span>
                        </div>
                        <p className="mt-3 font-medium text-fg">{title}</p>
                        <p className="mt-1 text-sm text-fg-muted">{body}</p>
                    </li>
                ))}
            </ol>
            <div className="mt-8 flex flex-col items-center gap-2">
                <Button variant="primary" size="lg" onClick={() => navigate('/log')}>
                    Log your first incident <ArrowRight aria-hidden />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/capture')}>
                    Short on time? Quick capture
                </Button>
            </div>
            <p className="mt-10 text-center text-xs text-fg-subtle">
                Resolvr helps you organise your record. It is not legal advice.
            </p>
        </div>
    );
}
