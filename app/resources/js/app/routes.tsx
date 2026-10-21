import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Route, Switch } from 'wouter';

import { Skeleton } from '@/components/ui/skeleton';

import { ComingSoon } from './screens/ComingSoon';

/* Screens load on demand so the lock screen stays light. */
const page = (load: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> => lazy(load);
const soon = (title: string) => () => <ComingSoon title={title} />;

const Dashboard = page(() => import('./screens/dashboard/Dashboard'));

const routes: { path: string; component: ComponentType | LazyExoticComponent<ComponentType> }[] = [
    { path: '/', component: Dashboard },
    { path: '/incidents', component: soon('Incident log') },
    { path: '/incidents/:id', component: soon('Incident') },
    { path: '/log', component: soon('Log an incident') },
    { path: '/capture', component: soon('Quick capture') },
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

export function PageSkeleton() {
    return (
        <div className="space-y-4 pt-4" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    );
}
