import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';

import { TooltipProvider } from '@/components/ui/tooltip';

import { usePanicTap } from '../hooks/use-guards';
import { useSession } from '../session';
import { CommandPalette } from './CommandPalette';
import { titleFor } from './nav';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

const COLLAPSED_KEY = 'resolvr:sidebar-collapsed';

/** The unlocked app frame: sidebar (desktop) or floating tab bar (mobile), top bar, command palette. */
export function AppShell({ children }: { children: ReactNode }) {
    const session = useSession();
    const [location] = useLocation();
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });
    const onLogoTap = usePanicTap(session.settings?.panicGesture ?? true, session.panic);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setPaletteOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggle = () => {
        setCollapsed((c) => {
            try {
                localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
            } catch {
                // Not remembered in private mode; harmless.
            }
            return !c;
        });
    };

    return (
        <TooltipProvider>
            <a
                href="#main"
                className="btn sr-only z-[70] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
                data-variant="primary"
            >
                Skip to content
            </a>
            <div className="flex min-h-dvh bg-bg">
                <Sidebar
                    collapsed={collapsed}
                    onToggle={toggle}
                    onSearch={() => setPaletteOpen(true)}
                    onLock={session.lock}
                    onLogoTap={onLogoTap}
                />
                <div className="flex min-w-0 flex-1 flex-col md:pr-6 md:pl-3">
                    <TopBar
                        title={titleFor(location)}
                        onSearch={() => setPaletteOpen(true)}
                        onLock={session.lock}
                        onLogoTap={onLogoTap}
                    />
                    <main
                        id="main"
                        tabIndex={-1}
                        className="view-root mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none md:px-0 md:pb-10"
                    >
                        {children}
                    </main>
                </div>
            </div>
            <TabBar />
            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </TooltipProvider>
    );
}
