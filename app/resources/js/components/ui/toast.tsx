import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface ToastProps {
    title: ReactNode;
    description?: ReactNode;
    tone?: ToastTone;
    action?: ReactNode;
    /** Replaces the tone dot, e.g. a drawn check for success. */
    icon?: ReactNode;
    className?: string;
}

/** Presentational toast. The stack, timing, haptics and swipe-to-dismiss live in the app's Toaster. */
export function Toast({ title, description, tone = 'neutral', action, icon, className }: ToastProps) {
    return (
        <div
            className={cn('toast', className)}
            data-tone={tone === 'neutral' ? undefined : tone}
            data-icon={icon ? '' : undefined}
            role="status"
        >
            {icon && <span className="toast-icon">{icon}</span>}
            <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">{title}</p>
                {description && <p className="mt-0.5 text-fg-muted">{description}</p>}
            </div>
            {action}
        </div>
    );
}
