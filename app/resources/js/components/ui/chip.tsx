import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Static tag. */
export function Tag({ className, ...props }: ComponentProps<'span'>) {
    return <span className={cn('chip', className)} {...props} />;
}

interface ChipProps extends Omit<ComponentProps<'button'>, 'onChange'> {
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
}

/** Toggleable chip for multi-select (incident types, impacts). */
export function Chip({ selected = false, onSelectedChange, className, onClick, ...props }: ChipProps) {
    return (
        <button
            type="button"
            className={cn('chip', className)}
            aria-pressed={selected}
            onClick={(event) => {
                onClick?.(event);
                onSelectedChange?.(!selected);
            }}
            {...props}
        />
    );
}
