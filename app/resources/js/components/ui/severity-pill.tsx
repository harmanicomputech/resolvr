import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const severities = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];

const labels: Record<Severity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
};

interface SeverityPillProps extends ComponentProps<'span'> {
    severity: Severity;
}

/** Colour is never the only signal: the label is always present. */
export function SeverityPill({ severity, className, ...props }: SeverityPillProps) {
    return (
        <span className={cn('sev', className)} data-severity={severity} {...props}>
            {labels[severity]}
        </span>
    );
}
