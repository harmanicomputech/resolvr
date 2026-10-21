import { useId, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { cloneElement } from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>) {
    return <input className={cn('input', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return <textarea className={cn('textarea', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
    return <select className={cn('select', className)} {...props} />;
}

interface FieldProps {
    label: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    className?: string;
    /** A single Input, Textarea or Select. Its id and aria attributes are wired up for you. */
    children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
}

/** Label + control + hint/error with accessible wiring. */
export function Field({ label, hint, error, className, children }: FieldProps) {
    const id = useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('field', className)}>
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
            {hint && (
                <p className="field-hint" id={hintId}>
                    {hint}
                </p>
            )}
            {error && (
                <p className="field-error" id={errorId} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
