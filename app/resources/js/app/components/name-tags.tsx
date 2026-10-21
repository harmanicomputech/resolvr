import { UserPlus, X } from 'lucide-react';
import { useId, useState } from 'react';

import { normalizeName } from '@/lib/model/people';
import { cn } from '@/lib/utils';

interface NameTagsProps {
    label: string;
    hint?: string;
    value: string[];
    onChange: (names: string[]) => void;
    suggestions: string[];
    placeholder?: string;
}

/** Type a name and press Enter (or pick a suggestion from people already in the record). */
export function NameTags({ label, hint, value, onChange, suggestions, placeholder = 'Type a name' }: NameTagsProps) {
    const id = useId();
    const [text, setText] = useState('');
    const [active, setActive] = useState(0);
    const taken = new Set(value.map(normalizeName));
    const q = normalizeName(text);
    const matches = q
        ? suggestions.filter((s) => normalizeName(s).includes(q) && !taken.has(normalizeName(s))).slice(0, 5)
        : [];

    const add = (name: string) => {
        const clean = name.trim();
        if (clean && !taken.has(normalizeName(clean))) onChange([...value, clean]);
        setText('');
        setActive(0);
    };

    return (
        <div className="field">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            {value.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-2" aria-label={`${label}: added`}>
                    {value.map((name) => (
                        <li key={name} className="chip gap-1 pr-1" data-selected>
                            {name}
                            <button
                                type="button"
                                className="grid size-5 place-items-center rounded-full hover:bg-raised"
                                onClick={() => onChange(value.filter((v) => v !== name))}
                                aria-label={`Remove ${name}`}
                            >
                                <X className="size-3" aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="relative">
                <input
                    id={id}
                    className="input pr-10"
                    value={text}
                    placeholder={placeholder}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={matches.length > 0}
                    aria-controls={`${id}-list`}
                    aria-activedescendant={matches[active] ? `${id}-opt-${active}` : undefined}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    onChange={(e) => {
                        setText(e.target.value);
                        setActive(0);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' && matches.length) {
                            e.preventDefault();
                            setActive((active + 1) % matches.length);
                        } else if (e.key === 'ArrowUp' && matches.length) {
                            e.preventDefault();
                            setActive((active - 1 + matches.length) % matches.length);
                        } else if (e.key === 'Enter' || e.key === ',') {
                            if (!text.trim()) return;
                            e.preventDefault();
                            add(matches[active] ?? text);
                        } else if (e.key === 'Backspace' && !text && value.length) {
                            onChange(value.slice(0, -1));
                        }
                    }}
                    onBlur={() => text.trim() && add(text)}
                />
                <button
                    type="button"
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-(--radius-sm) text-fg-subtle hover:text-fg"
                    onClick={() => add(text)}
                    aria-label="Add name"
                    tabIndex={-1}
                >
                    <UserPlus className="size-4" aria-hidden />
                </button>
                {matches.length > 0 && (
                    <ul
                        id={`${id}-list`}
                        role="listbox"
                        className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-(--radius-md) border border-hairline bg-surface py-1 shadow-(--shadow-floating)"
                    >
                        {matches.map((m, i) => (
                            <li
                                key={m}
                                id={`${id}-opt-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className={cn(
                                    'cursor-pointer px-3 py-2 text-sm',
                                    i === active ? 'bg-accent-tint text-fg' : 'text-fg-muted',
                                )}
                                onMouseDown={(e) => (e.preventDefault(), add(m))}
                            >
                                {m}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {hint && (
                <p id={`${id}-hint`} className="field-hint">
                    {hint}
                </p>
            )}
        </div>
    );
}
