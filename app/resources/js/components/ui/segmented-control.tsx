import * as ToggleGroup from '@radix-ui/react-toggle-group';

import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
    value: T;
    onValueChange: (value: T) => void;
    options: readonly { value: T; label: string }[];
    label: string;
    className?: string;
}

/** Single-choice control. Always has a value: clicking the active option does nothing. */
export function SegmentedControl<T extends string>({
    value,
    onValueChange,
    options,
    label,
    className,
}: SegmentedControlProps<T>) {
    return (
        <ToggleGroup.Root
            type="single"
            value={value}
            onValueChange={(next) => next && onValueChange(next as T)}
            aria-label={label}
            className={cn('segmented', className)}
        >
            {options.map((option) => (
                <ToggleGroup.Item key={option.value} value={option.value}>
                    {option.label}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    );
}
