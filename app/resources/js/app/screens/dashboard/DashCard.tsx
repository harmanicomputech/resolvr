import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface DragHandleProps {
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
}

/** A dashboard card: a title row (with an optional drag handle) and content. */
export function DashCard({
    title,
    icon,
    action,
    handle,
    className,
    children,
}: {
    title: string;
    icon?: ReactNode;
    action?: ReactNode;
    handle?: DragHandleProps;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('card flex h-full flex-col p-5', className)} aria-label={title}>
            <header className="mb-4 flex items-center gap-2">
                {icon && (
                    <span className="icon-badge size-8" aria-hidden>
                        {icon}
                    </span>
                )}
                <h2 className="flex-1 text-sm font-medium text-fg">{title}</h2>
                {action}
                {handle && (
                    <button
                        type="button"
                        className="-mr-2 hidden cursor-grab rounded-(--radius-sm) p-1 text-fg-subtle hover:text-fg-muted focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none active:cursor-grabbing md:block"
                        aria-label={`Move ${title} card`}
                        {...handle.attributes}
                        {...handle.listeners}
                    >
                        <GripVertical className="size-4" aria-hidden />
                    </button>
                )}
            </header>
            <div className="min-h-0 flex-1">{children}</div>
        </section>
    );
}
