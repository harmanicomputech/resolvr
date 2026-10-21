import { Wordmark } from '../components/wordmark';

/** Temporary screen while the real one is built. */
export function Placeholder({ title }: { title: string }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
            <div>
                <Wordmark className="text-2xl" />
                <h1 className="mt-4 font-display text-xl text-fg">{title}</h1>
                <p className="mt-2 text-sm text-fg-muted">Your evidence, your protection.</p>
            </div>
        </main>
    );
}
