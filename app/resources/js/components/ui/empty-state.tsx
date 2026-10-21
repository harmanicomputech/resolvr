import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: ReactNode;
    title: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
    return (
        <div className={cn('empty', className)}>
            <div className="empty-icon" aria-hidden>
                {icon}
            </div>
            <p className="empty-title">{title}</p>
            {children && <div className="empty-body">{children}</div>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
