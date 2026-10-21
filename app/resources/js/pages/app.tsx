import { Head } from '@inertiajs/react';

import { App } from '@/app/App';

/** The whole app lives in one Inertia page; screens are routed on the device. */
export default function AppPage() {
    return (
        <>
            <Head title="Resolvr" />
            <App />
        </>
    );
}
