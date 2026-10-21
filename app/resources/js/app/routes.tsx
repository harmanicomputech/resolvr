import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Route, Switch, useSearch } from 'wouter';

import { Skeleton } from '@/components/ui/skeleton';

import { ComingSoon } from './screens/ComingSoon';
import { LogFlow } from './screens/log/LogFlow';

/* Screens load on demand so the lock screen stays light. */
const page = (load: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> => lazy(load);
const soon = (title: string) => () => <ComingSoon title={title} />;

const Dashboard = page(() => import('./screens/dashboard/Dashboard'));
const Capture = page(() => import('./screens/log/Capture'));

const routes: { path: string; component: ComponentType | LazyExoticComponent<ComponentType> }[] = [
    { path: '/', component: Dashboard },
    { path: '/incidents', component: soon('Incident log') },
    { path: '/incidents/:id', component: soon('Incident') },
    { path: '/log', component: LogRoute },
    { path: '/capture', component: Capture },
    { path: '/vault', component: soon('Evidence vault') },
    { path: '/timeline', component: soon('Timeline') },
    { path: '/people', component: soon('People') },
    { path: '/people/:id', component: soon('Person') },
    { path: '/documents', component: soon('Documents') },
    { path: '/settings', component: soon('Settings') },
];

export function Routes() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Switch>
                {routes.map(({ path, component }) => (
                    <Route key={path} path={path} component={component} />
                ))}
                <Route>{soon('Page not found')()}</Route>
            </Switch>
        </Suspense>
    );
}

/** The log flow opens over the incident list. A new search string starts a fresh draft. */
function LogRoute() {
    const search = useSearch();
    return (
        <>
            <ComingSoon title="Incident log" />
            <LogFlow key={search} />
        </>
    );
}

export function PageSkeleton() {
    return (
        <div className="space-y-4 pt-4" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    );
}
