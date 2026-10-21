import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ComponentProps<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Render the child element (e.g. an Inertia <Link>) with button styling. */
    asChild?: boolean;
}

export function Button({ variant = 'glass', size = 'md', asChild, className, type, ...props }: ButtonProps) {
    const Component = asChild ? Slot : 'button';
    return (
        <Component
            className={cn('btn', className)}
            data-variant={variant}
            data-size={size === 'md' ? undefined : size}
            type={asChild ? undefined : (type ?? 'button')}
            {...props}
        />
    );
}
