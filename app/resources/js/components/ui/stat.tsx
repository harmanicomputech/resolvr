import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface StatProps {
    label: ReactNode;
    value: ReactNode;
    delta?: ReactNode;
    className?: string;
}

export function Stat({ label, value, delta, className }: StatProps) {
    return (
        <div className={cn('stat', className)}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {delta && <span className="stat-delta">{delta}</span>}
        </div>
    );
}
