import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends ComponentProps<'div'> {
    /** Glass surface (for floating UI over imagery or the aurora). */
    glass?: boolean;
    interactive?: boolean;
}

export function Card({ glass, interactive, className, ...props }: CardProps) {
    return (
        <div
            className={cn(glass ? 'glass' : 'card', 'p-5', className)}
            data-interactive={interactive || undefined}
            {...props}
        />
    );
}
