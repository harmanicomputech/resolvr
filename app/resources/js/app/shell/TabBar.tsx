import { Camera, Ellipsis, Mic, NotebookPen, Plus, Upload, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { haptic } from '../lib/haptics';
import { useNavigate } from '../hooks/use-navigate';
import { isActive, navItems } from './nav';
import { NavLink } from './NavLink';

const tabs = navItems.filter((n) => ['/', '/incidents', '/vault'].includes(n.href));
const more = navItems.filter((n) => !tabs.includes(n));

const quickActions: { label: string; icon: LucideIcon; href: string }[] = [
    { label: 'Log incident', icon: NotebookPen, href: '/log' },
    { label: 'Voice note', icon: Mic, href: '/capture?mode=voice' },
    { label: 'Snap photo', icon: Camera, href: '/capture?mode=photo' },
    { label: 'Upload', icon: Upload, href: '/vault?upload=1' },
];

/** Mobile: floating tab bar with a centre "+" that fans out into quick actions. */
export function TabBar() {
    const [location] = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const reduce = useReducedMotion();
    const firstAction = useRef<HTMLButtonElement>(null);
    const plus = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        firstAction.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                plus.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const tab = (href: string) => {
        const item = navItems.find((n) => n.href === href)!;
        const active = isActive(item, location);
        const Icon = item.icon;
        return (
            <NavLink
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-2xs transition-colors focus-visible:outline-none',
                    active ? 'text-accent-text' : 'text-fg-subtle',
                )}
            >
                <Icon className="size-[1.375rem]" aria-hidden strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
            </NavLink>
        );
    };

    // A staggered arc above the button (px from its centre), wide enough that labels never touch.
    const positions = [
        { x: -124, y: -74 },
        { x: -56, y: -146 },
        { x: 56, y: -146 },
        { x: 124, y: -74 },
    ];

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="scrim"
                        className="scrim fixed inset-0 z-40 md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                )}
            </AnimatePresence>

            <nav
                className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden"
                aria-label="Main"
            >
                <div className="glass relative flex items-end rounded-(--radius-xl) px-2 pt-1.5 pb-1">
                    {tab('/')}
                    {tab('/incidents')}
                    <div className="relative flex flex-1 justify-center">
                        <AnimatePresence>
                            {open && (
                                <ul
                                    id="quick-actions"
                                    role="menu"
                                    aria-label="Quick actions"
                                    className="absolute bottom-6 left-1/2"
                                >
                                    {quickActions.map((action, i) => {
                                        const at = positions[i] ?? { x: 0, y: 0 };
                                        const Icon = action.icon;
                                        return (
                                            <motion.li
                                                key={action.href}
                                                role="none"
                                                className="absolute"
                                                initial={
                                                    reduce ? { opacity: 0 } : { opacity: 0, x: 0, y: 0, scale: 0.4 }
                                                }
                                                animate={{
                                                    opacity: 1,
                                                    x: at.x,
                                                    y: at.y,
                                                    scale: 1,
                                                }}
                                                exit={
                                                    reduce
                                                        ? { opacity: 0 }
                                                        : {
                                                              opacity: 0,
                                                              x: 0,
                                                              y: 0,
                                                              scale: 0.4,
                                                              transition: { duration: 0.14 },
                                                          }
                                                }
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 420,
                                                    damping: 28,
                                                    delay: reduce ? 0 : i * 0.03,
                                                }}
                                            >
                                                <button
                                                    ref={i === 0 ? firstAction : undefined}
                                                    type="button"
                                                    role="menuitem"
                                                    className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus-visible:outline-none"
                                                    onClick={() => {
                                                        haptic('tap');
                                                        setOpen(false);
                                                        navigate(action.href);
                                                    }}
                                                >
                                                    <span className="grid size-12 place-items-center rounded-full bg-surface text-accent-text shadow-(--shadow-floating) ring-1 ring-hairline focus-visible:shadow-[var(--focus-ring)]">
                                                        <Icon className="size-5" aria-hidden />
                                                    </span>
                                                    <span className="rounded-full bg-surface px-2 py-0.5 text-2xs whitespace-nowrap text-fg shadow-(--shadow-raised)">
                                                        {action.label}
                                                    </span>
                                                </button>
                                            </motion.li>
                                        );
                                    })}
                                </ul>
                            )}
                        </AnimatePresence>
                        <motion.button
                            ref={plus}
                            type="button"
                            className="btn -mt-6 size-14 rounded-full p-0"
                            data-variant="primary"
                            aria-label={open ? 'Close quick actions' : 'Quick actions'}
                            aria-expanded={open}
                            aria-controls="quick-actions"
                            aria-haspopup="menu"
                            whileTap={reduce ? undefined : { scale: 0.92 }}
                            onClick={() => {
                                haptic('tap');
                                setOpen((o) => !o);
                            }}
                        >
                            <motion.span
                                animate={{ rotate: open ? 45 : 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                                className="grid"
                            >
                                <Plus className="size-6" aria-hidden />
                            </motion.span>
                        </motion.button>
                    </div>
                    {tab('/vault')}
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className={cn(
                            'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-2xs focus-visible:outline-none',
                            more.some((m) => isActive(m, location)) ? 'text-accent-text' : 'text-fg-subtle',
                        )}
                        aria-haspopup="dialog"
                    >
                        <Ellipsis className="size-[1.375rem]" aria-hidden />
                        More
                    </button>
                </div>
            </nav>

            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent side="bottom" title="More">
                    <ul className="grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
                        {more.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.href}>
                                    <NavLink
                                        href={item.href}
                                        onClick={() => setMoreOpen(false)}
                                        className="card flex items-center gap-3 p-4 text-sm font-medium text-fg"
                                        data-interactive
                                    >
                                        <span className="icon-badge" aria-hidden>
                                            <Icon className="size-4" />
                                        </span>
                                        {item.label}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </SheetContent>
            </Sheet>
        </>
    );
}
