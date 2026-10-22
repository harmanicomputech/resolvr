import {
    ArrowRight,
    ChartLine,
    Clock,
    EyeOff,
    FileText,
    Fingerprint,
    FolderLock,
    KeyRound,
    Scale,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Jurisdiction } from '@/lib/model/catalog';
import { cn } from '@/lib/utils';

import { JurisdictionPicker } from '../components/jurisdiction-picker';
import { Wordmark } from '../components/wordmark';
import { Footer, Hero, Passcode, Row } from './onboarding-parts';
import { Restore } from './Restore';
import { haptic } from '../lib/haptics';
import { passkeySupported } from '../lock/passkey';
import { useSession } from '../session';
import { useToast } from '../components/toaster';

type Step = 'welcome' | 'privacy' | 'passcode' | 'finish' | 'restore';
const STEPS: Step[] = ['welcome', 'privacy', 'passcode', 'finish'];

/**
 * First run, in four calm steps. The vault is created at the passcode step;
 * the last step (jurisdiction, optional passkey, "not legal advice") runs
 * inside the unlocked vault, so a reload there resumes at that step.
 */
export function Onboarding({ startAt = 'welcome' }: { startAt?: Step }) {
    const [step, setStep] = useState<Step>(startAt);
    const [direction, setDirection] = useState(1);
    const reduce = useReducedMotion();
    const pinRef = useRef<string | null>(null);
    const index = Math.max(0, STEPS.indexOf(step));

    const go = (next: Step) => {
        const order = (s: Step) => (s === 'restore' ? 1 : STEPS.indexOf(s));
        setDirection(order(next) > order(step) ? 1 : -1);
        setStep(next);
    };
    const swipeable = step === 'welcome' || step === 'privacy';

    return (
        <main className="relative min-h-dvh overflow-hidden">
            <div className="lock-backdrop" aria-hidden />
            <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <header className="flex items-center justify-between">
                    <Wordmark className="text-lg" />
                    <ol
                        className={cn('flex gap-1.5', step === 'restore' && 'invisible')}
                        aria-label={`Step ${index + 1} of ${STEPS.length}`}
                    >
                        {STEPS.map((s, i) => (
                            <li
                                key={s}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-(--dur-base)',
                                    i === index
                                        ? 'w-6 bg-accent'
                                        : i < index
                                          ? 'w-1.5 bg-accent'
                                          : 'w-1.5 bg-hairline-strong',
                                )}
                            />
                        ))}
                    </ol>
                </header>

                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.section
                        key={step}
                        custom={direction}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 * direction }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 * direction }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        drag={swipeable && !reduce ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -60) go(step === 'welcome' ? 'privacy' : 'passcode');
                            else if (info.offset.x > 60 && step === 'privacy') go('welcome');
                        }}
                        className="flex flex-1 flex-col"
                        aria-labelledby={`onb-${step}`}
                    >
                        {step === 'welcome' && <Welcome onNext={() => go('privacy')} onRestore={() => go('restore')} />}
                        {step === 'restore' && <Restore onBack={() => go('welcome')} />}
                        {step === 'privacy' && <Privacy onBack={() => go('welcome')} onNext={() => go('passcode')} />}
                        {step === 'passcode' && (
                            <Passcode
                                onBack={() => go('privacy')}
                                onCreated={(pin) => ((pinRef.current = pin), go('finish'))}
                            />
                        )}
                        {step === 'finish' && <Finish pinRef={pinRef} />}
                    </motion.section>
                </AnimatePresence>
            </div>
        </main>
    );
}

function Welcome({ onNext, onRestore }: { onNext: () => void; onRestore: () => void }) {
    return (
        <>
            <Hero id="onb-welcome" icon={<ShieldCheck className="size-6" />} title="Your evidence, your protection.">
                A private place to write down what happens at work, while it is fresh, so it holds up later.
            </Hero>
            <ul className="space-y-5">
                <Row icon={<Clock className="size-4" />} title="Locked timestamps">
                    Every entry is dated and sealed the moment you save it.
                </Row>
                <Row icon={<FolderLock className="size-4" />} title="Evidence in one place">
                    Screenshots, emails and documents, kept with the incidents they prove.
                </Row>
                <Row icon={<ChartLine className="size-4" />} title="Patterns you can show">
                    See repeat behaviour and how things have changed over time.
                </Row>
                <Row icon={<FileText className="size-4" />} title="Ready when you are">
                    Turn your record into a clear HR letter or case file.
                </Row>
            </ul>
            <Footer>
                <Button variant="primary" className="w-full" onClick={onNext}>
                    Get started <ArrowRight aria-hidden />
                </Button>
                <Button variant="ghost" className="mt-2 w-full" onClick={onRestore}>
                    I have a backup
                </Button>
            </Footer>
        </>
    );
}

function Privacy({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
    return (
        <>
            <Hero id="onb-privacy" icon={<EyeOff className="size-6" />} title="Only you can open it.">
                Your record is encrypted on this device with a passcode only you know.
            </Hero>
            <ul className="space-y-5">
                <Row icon={<Smartphone className="size-4" />} title="Stays on your device">
                    We never see your incidents, notes or files. There is nothing for your employer to request from us.
                </Row>
                <Row icon={<KeyRound className="size-4" />} title="No passcode, no access">
                    We cannot reset it for you. Keep it somewhere safe, and turn on encrypted backup later.
                </Row>
                <Row icon={<ShieldCheck className="size-4" />} title="No ads, no trackers">
                    Nothing in the app reports what you do.
                </Row>
            </ul>
            <Footer onBack={onBack}>
                <Button variant="primary" className="w-full" onClick={onNext}>
                    Choose a passcode <ArrowRight aria-hidden />
                </Button>
            </Footer>
        </>
    );
}

function Finish({ pinRef }: { pinRef: React.RefObject<string | null> }) {
    const session = useSession();
    const toast = useToast();
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(session.settings?.jurisdiction ?? 'us');
    const [acknowledged, setAcknowledged] = useState(false);
    const [canPasskey, setCanPasskey] = useState(false);
    const [passkeyDone, setPasskeyDone] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (pinRef.current) void passkeySupported().then(setCanPasskey);
    }, [pinRef]);

    const addPasskey = async () => {
        if (!pinRef.current) return;
        setBusy(true);
        try {
            await session.addPasskey(pinRef.current);
            setPasskeyDone(true);
            haptic('success');
        } catch (error) {
            toast({
                title: 'Passkey not added',
                description: error instanceof Error ? error.message : 'You can try again in Settings.',
                tone: 'warning',
            });
        } finally {
            setBusy(false);
        }
    };

    const finish = async () => {
        setBusy(true);
        pinRef.current = null;
        await session.repos?.singletons.saveProfile({ jurisdiction });
        await session.saveSettings({ jurisdiction, notLegalAdviceAcknowledgedAt: new Date().toISOString() });
    };

    return (
        <>
            <Hero id="onb-finish" icon={<Scale className="size-6" />} title="Last few things" />
            <fieldset>
                <legend className="text-sm font-medium text-fg">Where do you work?</legend>
                <p className="text-xs text-fg-muted">Used to show which laws may apply. You can change it later.</p>
                <div className="mt-3">
                    <JurisdictionPicker value={jurisdiction} onChange={setJurisdiction} />
                </div>
            </fieldset>

            {canPasskey && (
                <div className="card mt-6 flex items-center gap-3 p-4">
                    <span className="icon-badge" aria-hidden>
                        <Fingerprint className="size-4" />
                    </span>
                    <div className="flex-1 text-sm">
                        <p className="font-medium text-fg">Unlock with your face or fingerprint</p>
                        <p className="text-fg-muted">
                            {passkeyDone ? 'Passkey added.' : 'Optional. Your passcode still works.'}
                        </p>
                    </div>
                    {!passkeyDone && (
                        <Button size="sm" onClick={() => void addPasskey()} disabled={busy}>
                            Add
                        </Button>
                    )}
                </div>
            )}

            <label className="card mt-6 flex cursor-pointer gap-3 p-4 text-sm has-[:focus-visible]:shadow-[var(--focus-ring)]">
                <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                    <span className="font-medium text-fg">Resolvr is not legal advice.</span>{' '}
                    <span className="text-fg-muted">
                        It helps you keep an organised record. For advice about your situation, speak to a qualified
                        lawyer or advisor.
                    </span>
                </span>
            </label>

            <Footer>
                <Button
                    variant="primary"
                    className="w-full"
                    disabled={!acknowledged || busy}
                    onClick={() => void finish()}
                >
                    Open my record <ArrowRight aria-hidden />
                </Button>
            </Footer>
        </>
    );
}
