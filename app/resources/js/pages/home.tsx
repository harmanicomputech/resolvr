import { Head } from '@inertiajs/react';

// Placeholder until the app shell is built (P2.3).
export default function Home() {
    return (
        <>
            <Head title="Home" />
            <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
                <div className="text-center">
                    <p className="wordmark text-4xl">Resolvr</p>
                    <p className="mt-2 text-sm text-fg-muted">Your evidence, your protection.</p>
                </div>
            </main>
        </>
    );
}
