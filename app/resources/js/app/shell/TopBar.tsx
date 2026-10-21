import { Check, CloudOff, Lock, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { useOnline } from '../hooks/use-online';
import { useSession } from '../session';

interface TopBarProps {
    title: string;
    onSearch: () => void;
    onLock: () => void;
    onLogoTap: () => void;
}

/**
 * Page title plus quiet status: "Saved" briefly after each change (everything
 * saves on this device instantly, so there is nothing to pull or refresh),
 * and an offline badge when there is no connection.
 */
export function TopBar({ title, onSearch, onLock, onLogoTap }: TopBarProps) {
    const online = useOnline();
    const saved = useSavedPulse();

    return (
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-bg/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md md:static md:bg-transparent md:px-0 md:pt-6 md:backdrop-blur-none">
            <button
                type="button"
                onClick={onLogoTap}
                className="-ml-1 rounded-(--radius-sm) p-1 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none md:hidden"
                aria-label="Resolvr"
            >
                <img src="/icons/resolvr-32.png" alt="" className="size-7 rounded-(--radius-sm)" />
            </button>
            <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold tracking-tight text-fg md:text-2xl">
                {title}
            </h1>

            <AnimatePresence>
                {saved && (
                    <motion.span
                        key="saved"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 text-xs text-fg-subtle"
                        role="status"
                    >
                        <Check className="size-3.5 text-success" aria-hidden /> Saved
                    </motion.span>
                )}
            </AnimatePresence>
            {!online && (
                <span className="chip gap-1.5 text-xs" role="status">
                    <CloudOff className="size-3.5" aria-hidden /> Offline
                </span>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onSearch}
                aria-label="Search and commands"
            >
                <Search aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLock} aria-label="Lock now">
                <Lock aria-hidden />
            </Button>
        </header>
    );
}

function useSavedPulse(): boolean {
    const { version } = useSession();
    const [seen, setSeen] = useState(version);
    const [shown, setShown] = useState(false);
    if (seen !== version) {
        setSeen(version);
        setShown(true);
    }
    useEffect(() => {
        if (!shown) return;
        const timer = window.setTimeout(() => setShown(false), 1800);
        return () => window.clearTimeout(timer);
    }, [shown, version]);
    return shown;
}
