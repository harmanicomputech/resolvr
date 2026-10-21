import { Lock, PanelLeftClose, PanelLeftOpen, Plus, Search } from 'lucide-react';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { Wordmark } from '../components/wordmark';
import { useNavigate } from '../hooks/use-navigate';
import { isActive, navItems } from './nav';
import { NavLink } from './NavLink';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onSearch: () => void;
    onLock: () => void;
    onLogoTap: () => void;
}

/** Desktop navigation: a quiet glass rail that collapses to icons. */
export function Sidebar({ collapsed, onToggle, onSearch, onLock, onLogoTap }: SidebarProps) {
    const [location] = useLocation();
    const navigate = useNavigate();

    const item = (child: React.ReactNode, label: string) =>
        collapsed ? (
            <Tooltip content={label} side="right">
                {child}
            </Tooltip>
        ) : (
            child
        );

    return (
        <aside
            className={cn(
                'glass sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col rounded-(--radius-xl) p-3 transition-[width] duration-(--dur-base) ease-(--ease-standard) md:flex',
                collapsed ? 'w-[4.5rem]' : 'w-60',
            )}
            aria-label="Main"
        >
            <div className={cn('flex items-center gap-2 px-1 pt-1 pb-4', collapsed && 'flex-col')}>
                <button
                    type="button"
                    onClick={onLogoTap}
                    className="flex min-w-0 items-center gap-2 rounded-(--radius-md) p-1 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                    aria-label="Resolvr"
                >
                    <img src="/icons/resolvr-32.png" alt="" className="size-7 rounded-(--radius-sm)" />
                    {!collapsed && <Wordmark className="text-lg" />}
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(!collapsed && 'ml-auto')}
                    onClick={onToggle}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
                </Button>
            </div>

            {item(
                <Button
                    variant="primary"
                    className={cn('mb-3', collapsed ? 'w-full px-0' : 'w-full')}
                    onClick={() => navigate('/log')}
                    aria-label={collapsed ? 'Log incident' : undefined}
                >
                    <Plus aria-hidden />
                    {!collapsed && 'Log incident'}
                </Button>,
                'Log incident',
            )}
            {item(
                <button
                    type="button"
                    onClick={onSearch}
                    className={cn(
                        'mb-4 flex items-center gap-2 rounded-(--radius-md) border border-hairline px-3 py-2 text-sm text-fg-subtle transition-colors hover:text-fg-muted focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none',
                        collapsed && 'justify-center px-0',
                    )}
                    aria-label="Search and commands"
                >
                    <Search className="size-4" aria-hidden />
                    {!collapsed && (
                        <>
                            <span className="flex-1 text-left">Search</span>
                            <kbd className="mono text-2xs">⌘K</kbd>
                        </>
                    )}
                </button>,
                'Search',
            )}

            <nav className="flex flex-1 flex-col gap-1">
                {navItems.map((nav) => {
                    const active = isActive(nav, location);
                    const Icon = nav.icon;
                    return (
                        <div key={nav.href}>
                            {item(
                                <NavLink
                                    href={nav.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors duration-(--dur-fast) focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none',
                                        active
                                            ? 'bg-accent-tint font-medium text-accent-text'
                                            : 'text-fg-muted hover:bg-raised hover:text-fg',
                                        collapsed && 'justify-center px-0',
                                    )}
                                >
                                    <Icon className="size-[1.125rem] shrink-0" aria-hidden />
                                    {collapsed ? <span className="sr-only">{nav.label}</span> : nav.label}
                                </NavLink>,
                                nav.label,
                            )}
                        </div>
                    );
                })}
            </nav>

            {item(
                <Button
                    variant="ghost"
                    className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
                    onClick={onLock}
                    aria-label={collapsed ? 'Lock now' : undefined}
                >
                    <Lock aria-hidden />
                    {!collapsed && 'Lock now'}
                </Button>,
                'Lock now',
            )}
        </aside>
    );
}
