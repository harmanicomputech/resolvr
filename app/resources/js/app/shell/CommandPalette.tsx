import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
    Calculator,
    CornerDownLeft,
    FileUp,
    Lock,
    Moon,
    NotebookPen,
    Plus,
    Search,
    Sun,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { SeverityPill } from '@/components/ui/severity-pill';
import type { Incident } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { useToast } from '../components/toaster';
import { useNavigate } from '../hooks/use-navigate';
import { pickAndImportPrototype } from '../lib/import-backup';
import { useSession } from '../session';
import { navItems } from './nav';

interface Command {
    id: string;
    group: 'Go to' | 'Actions' | 'Incidents';
    label: string;
    hint?: string;
    icon?: LucideIcon;
    incident?: Incident;
    run: () => void;
}

/** ⌘K / Ctrl+K: jump anywhere, search incidents, or run an action. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const session = useSession();
    const navigate = useNavigate();
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const listId = useId();
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!open || !session.repos) return;
        void session.repos.incidents.list().then(setIncidents);
    }, [open, session.repos]);

    const close = () => {
        onOpenChange(false);
        setQuery('');
        setActive(0);
    };
    const dark = session.settings?.theme === 'dark';

    const commands = useMemo<Command[]>(() => {
        const go = (href: string) => () => {
            close();
            navigate(href);
        };
        const base: Command[] = [
            { id: 'log', group: 'Actions', label: 'Log an incident', icon: Plus, run: go('/log') },
            {
                id: 'capture',
                group: 'Actions',
                label: 'Quick capture',
                hint: 'Save a note to finish later',
                icon: NotebookPen,
                run: go('/capture'),
            },
            {
                id: 'theme',
                group: 'Actions',
                label: dark ? 'Switch to light theme' : 'Switch to dark theme',
                icon: dark ? Sun : Moon,
                run: () => {
                    close();
                    void session.saveSettings({ theme: dark ? 'light' : 'dark' });
                },
            },
            {
                id: 'import',
                group: 'Actions',
                label: 'Import a backup from the earlier Resolvr',
                hint: 'resolvr-backup….json',
                icon: FileUp,
                run: () => {
                    close();
                    if (!session.repos) return;
                    pickAndImportPrototype(session.repos).then(
                        (report) => {
                            if (!report) return;
                            session.refresh();
                            toast({
                                title: `Imported ${report.incidents} ${report.incidents === 1 ? 'incident' : 'incidents'}`,
                                description: `${report.files} ${report.files === 1 ? 'file' : 'files'} and ${report.people} ${report.people === 1 ? 'person' : 'people'}.${report.skipped.length ? ` ${report.skipped.length} items could not be read.` : ''}`,
                                tone: 'success',
                            });
                        },
                        () =>
                            toast({
                                title: 'That file could not be imported',
                                description: 'Choose a resolvr-backup JSON file exported from the earlier app.',
                                tone: 'warning',
                            }),
                    );
                },
            },
            { id: 'lock', group: 'Actions', label: 'Lock now', icon: Lock, run: () => (close(), session.lock()) },
            {
                id: 'calc',
                group: 'Actions',
                label: 'Switch to calculator',
                hint: 'Locks and disguises the app',
                icon: Calculator,
                run: () => (close(), session.panic()),
            },
            ...navItems.map((item) => ({
                id: `go-${item.href}`,
                group: 'Go to' as const,
                label: item.label,
                icon: item.icon,
                run: go(item.href),
            })),
        ];
        const q = query.trim().toLowerCase();
        const matches = (text: string) => !q || text.toLowerCase().includes(q);
        const incidentCommands: Command[] = q
            ? incidents
                  .filter((i) =>
                      matches(`${i.incId} ${i.content.title} ${i.content.location} ${i.content.types.join(' ')}`),
                  )
                  .slice(0, 8)
                  .map((i) => ({
                      id: i.id,
                      group: 'Incidents',
                      label: i.content.title,
                      hint: i.incId,
                      incident: i,
                      run: go(`/incidents/${i.id}`),
                  }))
            : [];
        return [...base.filter((c) => matches(`${c.label} ${c.hint ?? ''}`)), ...incidentCommands];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, incidents, dark]);

    const selected = Math.min(active, Math.max(0, commands.length - 1));

    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    const groups = (['Actions', 'Go to', 'Incidents'] as const)
        .map((group) => ({ group, items: commands.filter((c) => c.group === group) }))
        .filter((g) => g.items.length);

    return (
        <DialogPrimitive.Root
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) {
                    setQuery('');
                    setActive(0);
                }
            }}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="scrim fixed inset-0 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="dialog fixed top-[12vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden p-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]">
                    <DialogPrimitive.Title className="sr-only">Search and commands</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        Type to search incidents, pages and actions. Use the arrow keys to choose and Enter to run.
                    </DialogPrimitive.Description>
                    <div className="flex items-center gap-3 border-b border-hairline px-4">
                        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                        <input
                            autoFocus
                            role="combobox"
                            aria-expanded
                            aria-controls={listId}
                            aria-activedescendant={
                                commands[selected] ? `${listId}-${commands[selected].id}` : undefined
                            }
                            aria-label="Search"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setActive(0);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setActive((selected + 1) % Math.max(1, commands.length));
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setActive((selected - 1 + commands.length) % Math.max(1, commands.length));
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commands[selected]?.run();
                                }
                            }}
                            placeholder="Search incidents, pages and actions"
                            className="h-14 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
                        />
                    </div>
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-label="Results"
                        className="max-h-[min(60vh,26rem)] overflow-y-auto p-2"
                    >
                        {groups.map(({ group, items }) => (
                            <li key={group} role="presentation">
                                <p className="eyebrow px-3 pt-3 pb-1.5">{group}</p>
                                <ul role="group" aria-label={group}>
                                    {items.map((command) => {
                                        const index = commands.indexOf(command);
                                        const Icon = command.icon;
                                        return (
                                            <li
                                                key={command.id}
                                                id={`${listId}-${command.id}`}
                                                role="option"
                                                aria-selected={index === selected}
                                                onMouseMove={() => setActive(index)}
                                                onClick={command.run}
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-3 rounded-(--radius-md) px-3 py-2.5 text-sm',
                                                    index === selected ? 'bg-accent-tint text-fg' : 'text-fg-muted',
                                                )}
                                            >
                                                {command.incident ? (
                                                    <SeverityPill severity={command.incident.content.severity} />
                                                ) : (
                                                    Icon && <Icon className="size-4 shrink-0" aria-hidden />
                                                )}
                                                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                                                {command.hint && (
                                                    <span
                                                        className={cn(
                                                            'shrink-0 text-xs text-fg-subtle',
                                                            command.incident && 'mono',
                                                        )}
                                                    >
                                                        {command.hint}
                                                    </span>
                                                )}
                                                {index === selected && (
                                                    <CornerDownLeft
                                                        className="size-3.5 shrink-0 text-fg-subtle"
                                                        aria-hidden
                                                    />
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                        {!commands.length && (
                            <li className="px-3 py-8 text-center text-sm text-fg-muted">Nothing matches “{query}”.</li>
                        )}
                    </ul>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
