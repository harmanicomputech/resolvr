import { ArrowLeft, ArrowRight, LockKeyhole, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearch } from 'wouter';

import { Button } from '@/components/ui/button';
import { commitForm } from '@/lib/db';
import type { LogForm } from '@/lib/model/draft';
import type { Incident } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { haptic } from '../../lib/haptics';
import { useSession } from '../../session';
import { Review } from './Review';
import { Saved } from './Saved';
import { StepEvidence } from './StepEvidence';
import { StepImpact, StepPeople, StepReporting, StepSeverity, StepType, StepWhat, type StepProps } from './steps';
import { useDraft } from './use-draft';

const STEPS = [
    { title: 'What happened', subtitle: 'The basics, while it is fresh.' },
    { title: 'What kind of treatment', subtitle: 'Choose everything that fits.' },
    { title: 'How serious', subtitle: 'Your honest sense of it.' },
    { title: 'Who was involved', subtitle: 'People responsible and anyone who saw.' },
    { title: 'Reporting', subtitle: 'Who knows about it so far.' },
    { title: 'How it affected you', subtitle: 'Optional, and private.' },
    { title: 'Evidence', subtitle: 'Anything that backs up what happened.' },
    { title: 'Review', subtitle: 'Check it over, then lock it in.' },
] as const;

function stepValid(step: number, form: LogForm): boolean {
    if (step === 0) return Boolean(form.title.trim() && form.description.trim());
    if (step === 1) return form.types.length > 0;
    if (step === 2) return Boolean(form.severity);
    return true;
}

/**
 * The guided log: full screen on phones, a side panel on larger screens.
 * Every change is saved as an encrypted draft; saving locks it into the
 * hash-chained record.
 */
export function LogFlow({ incidentId }: { incidentId?: string }) {
    const search = new URLSearchParams(useSearch());
    const draftId = search.get('draft') ?? undefined;
    const session = useSession();
    const navigate = useNavigate();
    const toast = useToast();
    const reduce = useReducedMotion();
    const { draft, update, setStep, flush, savedAt } = useDraft({ draftId, incidentId });
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<Incident | null>(null);
    const [direction, setDirection] = useState(1);
    const heading = useRef<HTMLHeadingElement>(null);
    const { data: people } = useData((repos) => repos.people.list().then((list) => list.map((p) => p.name)));

    const step = draft?.step ?? 0;
    const close = () => {
        void flush();
        navigate(incidentId ? `/incidents/${incidentId}` : '/incidents');
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="dialog"]') && close();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    useEffect(() => {
        heading.current?.focus({ preventScroll: true });
    }, [step, saved]);

    if (!draft) return <Panel onClose={close} />;
    const form = draft.form;

    const go = (next: number) => {
        if (next > step && !stepValid(step, form)) {
            setShowErrors(true);
            haptic('error');
            return;
        }
        setShowErrors(false);
        setDirection(next > step ? 1 : -1);
        setStep(next);
    };

    const save = async () => {
        const firstInvalid = [0, 1, 2].find((s) => !stepValid(s, form));
        if (firstInvalid !== undefined) {
            setShowErrors(true);
            setStep(firstInvalid);
            return;
        }
        if (!session.repos) return;
        setSaving(true);
        try {
            const incident = await commitForm(form, session.repos, {
                incidentId,
                jurisdiction: session.settings?.jurisdiction,
            });
            await session.repos.drafts.remove(draft.id);
            haptic('success');
            setSaved(incident);
            session.refresh();
        } catch {
            toast({ title: 'Could not save', description: 'Your draft is safe. Please try again.', tone: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const props: StepProps = { form, update, people: people ?? [], showErrors };
    const progress = saved ? 1 : (step + 1) / STEPS.length;

    return (
        <Panel onClose={close} title={incidentId ? 'Edit incident' : 'Log an incident'}>
            {saved ? (
                <Saved
                    incident={saved}
                    onView={() => navigate(`/incidents/${saved.id}`)}
                    onAnother={() => {
                        setSaved(null);
                        navigate(`/log?new=${Date.now()}`, { replace: true });
                    }}
                    onDone={() => navigate('/')}
                />
            ) : (
                <>
                    <div className="px-5 pt-1 md:px-8">
                        <div
                            className="h-1 overflow-hidden rounded-full bg-hairline"
                            role="progressbar"
                            aria-label="Progress"
                            aria-valuemin={1}
                            aria-valuemax={STEPS.length}
                            aria-valuenow={step + 1}
                            aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]!.title}`}
                        >
                            <motion.div
                                className="h-full rounded-full bg-accent"
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ duration: reduce ? 0 : 0.3 }}
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle">
                            <span>
                                Step {step + 1} of {STEPS.length}
                            </span>
                            <span aria-live="polite">
                                {savedAt
                                    ? incidentId
                                        ? 'Changes saved as a draft'
                                        : 'Draft saved'
                                    : 'Drafts save as you type'}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 pb-6 md:px-8">
                        <AnimatePresence mode="wait" initial={false} custom={direction}>
                            <motion.div
                                key={step}
                                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 * direction }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
                                transition={{ duration: 0.18 }}
                            >
                                <h2
                                    ref={heading}
                                    tabIndex={-1}
                                    className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg outline-none"
                                >
                                    {STEPS[step]!.title}
                                </h2>
                                <p className="mt-1 mb-6 text-sm text-fg-muted">{STEPS[step]!.subtitle}</p>
                                {step === 0 && <StepWhat {...props} />}
                                {step === 1 && (
                                    <StepType {...props} jurisdiction={session.settings?.jurisdiction ?? 'us'} />
                                )}
                                {step === 2 && <StepSeverity {...props} />}
                                {step === 3 && <StepPeople {...props} />}
                                {step === 4 && <StepReporting {...props} />}
                                {step === 5 && <StepImpact {...props} />}
                                {step === 6 && <StepEvidence {...props} />}
                                {step === 7 && <Review form={form} onEdit={go} fileCount={form.fileIds.length} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    <footer className="flex items-center gap-2 border-t border-hairline px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8">
                        {step > 0 ? (
                            <Button variant="ghost" onClick={() => go(step - 1)}>
                                <ArrowLeft aria-hidden /> Back
                            </Button>
                        ) : (
                            <span className="text-xs text-fg-subtle">Only the first three steps are needed.</span>
                        )}
                        <div className="ml-auto flex gap-2">
                            {step >= 2 && step < 7 && (
                                <Button variant="ghost" onClick={() => go(7)}>
                                    Review
                                </Button>
                            )}
                            {step < 7 ? (
                                <Button variant="primary" onClick={() => go(step + 1)}>
                                    Next <ArrowRight aria-hidden />
                                </Button>
                            ) : (
                                <Button variant="primary" onClick={() => void save()} disabled={saving}>
                                    <LockKeyhole aria-hidden />{' '}
                                    {saving ? 'Sealing…' : incidentId ? 'Save new version' : 'Lock and save'}
                                </Button>
                            )}
                        </div>
                    </footer>
                </>
            )}
        </Panel>
    );
}

/** Full-screen on phones; a right-hand panel over a dimmed page on larger screens. */
function Panel({ onClose, title, children }: { onClose: () => void; title?: string; children?: React.ReactNode }) {
    const reduce = useReducedMotion();
    // Portalled to <body>: the page's view-transition root is its own stacking context.
    return createPortal(
        <>
            <motion.div
                className="scrim fixed inset-0 z-[55] hidden md:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                aria-hidden
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title ?? 'Log an incident'}
                className={cn(
                    'fixed inset-0 z-[56] flex flex-col bg-surface md:inset-y-3 md:right-3 md:left-auto md:w-[40rem] md:rounded-(--radius-xl) md:shadow-(--shadow-overlay)',
                )}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
                <header className="flex items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-5 md:pt-4">
                    <p className="flex-1 pl-2 text-sm font-medium text-fg-muted">{title}</p>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (your draft is kept)">
                        <X aria-hidden />
                    </Button>
                </header>
                {children}
            </motion.div>
        </>,
        document.body,
    );
}
