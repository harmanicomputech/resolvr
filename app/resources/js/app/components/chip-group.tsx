import { Check } from 'lucide-react';

import { Chip } from '@/components/ui/chip';

interface ChipGroupProps {
    label: string;
    options: readonly string[] | readonly { value: string; label: string }[];
    value: string[];
    onChange: (value: string[]) => void;
    hideLabel?: boolean;
}

/** Multi-select chips with a visible tick, announced as a group of toggle buttons. */
export function ChipGroup({ label, options, value, onChange, hideLabel }: ChipGroupProps) {
    const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    return (
        <fieldset>
            <legend className={hideLabel ? 'sr-only' : 'mb-2 text-sm font-medium text-fg'}>{label}</legend>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                    const selected = value.includes(item.value);
                    return (
                        <Chip
                            key={item.value}
                            selected={selected}
                            onSelectedChange={(on) =>
                                onChange(on ? [...value, item.value] : value.filter((v) => v !== item.value))
                            }
                        >
                            {selected && <Check className="size-3.5" aria-hidden />}
                            {item.label}
                        </Chip>
                    );
                })}
            </div>
        </fieldset>
    );
}
