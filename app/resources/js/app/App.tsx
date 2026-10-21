import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';

import { Toaster } from './components/toaster';
import { InstallPrompt } from './pwa/InstallPrompt';
import { applyDisguise } from './pwa/stealth';
import { UpdateNotice } from './pwa/UpdateNotice';
import { Placeholder } from './screens/Placeholder';
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

function Gate() {
    const session = useSession();
    useTheme(session.settings?.theme);
    useEffect(() => applyDisguise(session.stealth), [session.stealth]);

    if (session.status === 'loading') return <Splash />;
    if (session.status !== 'unlocked') return <Placeholder title={session.status === 'new' ? 'Welcome' : 'Locked'} />;
    return <Unlocked />;
}

function Unlocked() {
    const { data: count } = useData((repos) => repos.incidents.list().then((list) => list.length));
    return (
        <Router>
            <Switch>
                <Route path="/">
                    <Placeholder title="Home" />
                </Route>
                <Route>
                    <Placeholder title="Not found" />
                </Route>
            </Switch>
            <InstallPrompt eligible={(count ?? 0) > 0} />
        </Router>
    );
}
