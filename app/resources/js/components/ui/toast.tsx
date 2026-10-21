import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface ToastProps {
    title: ReactNode;
    description?: ReactNode;
    tone?: ToastTone;
    action?: ReactNode;
    className?: string;
}

/** Presentational toast. The stack, timing and swipe-to-dismiss arrive with P2.13. */
export function Toast({ title, description, tone = 'neutral', action, className }: ToastProps) {
    return (
        <div className={cn('toast', className)} data-tone={tone === 'neutral' ? undefined : tone} role="status">
            <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">{title}</p>
                {description && <p className="mt-0.5 text-fg-muted">{description}</p>}
            </div>
            {action}
        </div>
    );
}
