import type { Category } from '@/lib/timeline/layout';
import type { Severity } from '@/lib/model/catalog';

export const categoryFill: Record<Category, string> = {
    harassment: 'var(--chart-cat-1)',
    discrimination: 'var(--chart-cat-3)',
    retaliation: 'var(--chart-cat-2)',
    other: 'var(--chart-cat-other)',
};

/** Node radius by severity (size carries severity; colour carries the kind of treatment). */
export const severityRadius: Record<Severity, number> = { low: 5, medium: 7, high: 9, critical: 11 };

export const DAY = 86_400_000;
