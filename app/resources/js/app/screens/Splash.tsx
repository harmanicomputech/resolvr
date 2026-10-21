import { Wordmark } from '../components/wordmark';

/** Shown for the moment it takes to open the local database. */
export function Splash() {
    return (
        <main className="grid min-h-dvh place-items-center bg-bg" aria-busy="true">
            <Wordmark className="animate-pulse text-2xl motion-reduce:animate-none" />
            <span className="sr-only">Opening Resolvr</span>
        </main>
    );
}
