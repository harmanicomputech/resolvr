import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Router } from 'wouter';

import { Toaster } from './components/toaster';
import { InstallPrompt } from './pwa/InstallPrompt';
import { applyDisguise } from './pwa/stealth';
import { UpdateNotice } from './pwa/UpdateNotice';
import { useAutoLock, usePanic } from './hooks/use-guards';
import { Routes } from './routes';
import { AppShell } from './shell/AppShell';
import { Calculator } from './screens/Calculator';
import { ForgotPasscode } from './screens/ForgotPasscode';
import { LockScreen } from './screens/LockScreen';
import { Onboarding } from './screens/Onboarding';
import { Splash } from './screens/Splash';
import { SessionProvider, useSession } from './session';
import { useTheme } from './theme';
import { useData } from './hooks/use-data';

/**
 * The client app. Laravel serves one Inertia page for every app URL and the
 * routes below take over in the browser, so the whole app works offline from
 * the cached shell.
 */
export function App() {
    return (
        <SessionProvider>
            <Toaster>
                <UpdateNotice />
                <Gate />
            </Toaster>
        </SessionProvider>
    );
}

type Screen = 'splash' | 'onboarding' | 'calculator' | 'lock' | 'app';

function Gate() {
    const session = useSession();
    const [revealed, setRevealed] = useState(false);
    const [forgot, setForgot] = useState(false);
    useTheme(session.settings?.theme);
    useEffect(() => applyDisguise(session.disguised), [session.disguised]);
    useAutoLock(session.status === 'unlocked' ? session.settings : null, session.lock);
    usePanic(session.status === 'unlocked' && (session.settings?.panicGesture ?? false), session.panic);
    // Each time the app locks in disguise, start from the calculator again.
    const [seenStatus, setSeenStatus] = useState(session.status);
    if (seenStatus !== session.status) {
        setSeenStatus(session.status);
        setRevealed(false);
    }

    const onboarding =
        session.status === 'new' || (session.status === 'unlocked' && !session.settings?.notLegalAdviceAcknowledgedAt);
    const screen: Screen =
        session.status === 'loading'
            ? 'splash'
            : onboarding
              ? 'onboarding'
              : session.status === 'locked'
                ? session.disguised && !revealed
                    ? 'calculator'
                    : 'lock'
                : 'app';

    return (
        <>
            {/* Screens stack in one grid cell so the old one can fade out over the new (popLayout would inject a <style>, which the CSP blocks). */}
            <div className="grid">
                <AnimatePresence initial={false}>
                    <Transition key={screen} kind={screen}>
                        {screen === 'splash' && <Splash />}
                        {screen === 'onboarding' && (
                            <Onboarding startAt={session.status === 'unlocked' ? 'finish' : 'welcome'} />
                        )}
                        {screen === 'calculator' && <Calculator onReveal={() => setRevealed(true)} />}
                        {screen === 'lock' && <LockScreen onForgot={() => setForgot(true)} />}
                        {screen === 'app' && <Unlocked />}
                    </Transition>
                </AnimatePresence>
            </div>
            <ForgotPasscode open={forgot} onOpenChange={setForgot} />
        </>
    );
}

/** Lock and calculator dissolve away (soft blur and lift); the app settles in underneath. */
function Transition({ kind, children }: { kind: Screen; children: ReactNode }) {
    const reduce = useReducedMotion();
    const leaving = kind === 'lock' || kind === 'calculator' || kind === 'onboarding';
    return (
        <motion.div
            className="col-start-1 row-start-1 min-h-dvh"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: kind === 'app' ? 0.985 : 1 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            // Leaving the app (lock, panic) is instant so nothing private lingers on screen.
            exit={
                kind === 'app'
                    ? { opacity: 0, pointerEvents: 'none', transition: { duration: 0 } }
                    : reduce || !leaving
                      ? { opacity: 0, pointerEvents: 'none' }
                      : { opacity: 0, scale: 1.04, filter: 'blur(10px)', pointerEvents: 'none' }
            }
            transition={{ duration: reduce ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

function Unlocked() {
    const { data: count } = useData((repos) => repos.incidents.list().then((list) => list.length));
    return (
        <Router>
            <AppShell>
                <Routes />
            </AppShell>
            <InstallPrompt eligible={(count ?? 0) > 0} />
        </Router>
    );
}
