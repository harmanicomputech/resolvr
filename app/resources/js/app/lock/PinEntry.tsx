import { Delete } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

import { haptic } from '../lib/haptics';
import type { PinFormat } from '../session';

export interface PinEntryHandle {
    /** Shake, buzz and clear: the passcode was wrong. */
    reject(): void;
    clear(): void;
}

interface PinEntryProps {
    format: PinFormat;
    /** Called when a full PIN is entered, or a passphrase is submitted. */
    onComplete: (pin: string) => void;
    disabled?: boolean;
    label: string;
    ref?: Ref<PinEntryHandle>;
    className?: string;
}

const length = (format: PinFormat) => (format === 'pin6' ? 6 : 4);
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * PIN dots with an on-screen keypad (and physical keyboard support), or a
 * passphrase field. Dots fill with a small spring; a wrong entry shakes.
 */
export function PinEntry({ format, onComplete, disabled, label, ref, className }: PinEntryProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState(false);
    const controls = useAnimationControls();
    const reduce = useReducedMotion();
    const phraseRef = useRef<HTMLInputElement>(null);
    const resetTimer = useRef<number | undefined>(undefined);

    useImperativeHandle(ref, () => ({
        reject() {
            haptic('error');
            setError(true);
            if (!reduce) void controls.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.42 } });
            resetTimer.current = window.setTimeout(() => {
                setValue('');
                setError(false);
                phraseRef.current?.focus();
            }, 450);
        },
        clear() {
            setValue('');
            setError(false);
        },
    }));

    const press = useCallback(
        (digit: string) => {
            // Typing straight after a wrong entry starts a fresh one.
            const current = error ? '' : value;
            if (disabled || current.length >= length(format)) return;
            window.clearTimeout(resetTimer.current);
            setError(false);
            haptic('tap');
            const next = current + digit;
            setValue(next);
            if (next.length === length(format)) window.setTimeout(() => onComplete(next), 120);
        },
        [disabled, error, format, onComplete, value],
    );
    const back = useCallback(() => !disabled && setValue((v) => v.slice(0, -1)), [disabled]);

    useEffect(() => {
        if (format === 'phrase') return;
        const onKey = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement) return;
            if (/^\d$/.test(event.key)) press(event.key);
            else if (event.key === 'Backspace') back();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [format, press, back]);

    if (format === 'phrase') {
        return (
            <motion.form
                animate={controls}
                className={cn('mx-auto flex w-full max-w-xs flex-col gap-3', className)}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (value.length >= 8) onComplete(value);
                }}
            >
                <label className="sr-only" htmlFor="passphrase">
                    {label}
                </label>
                <Input
                    ref={phraseRef}
                    id="passphrase"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={value}
                    disabled={disabled}
                    aria-invalid={error || undefined}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Passphrase"
                />
                <Button type="submit" variant="primary" disabled={disabled || value.length < 8}>
                    Continue
                </Button>
            </motion.form>
        );
    }

    return (
        <div className={cn('flex flex-col items-center gap-10', className)}>
            <motion.div
                animate={controls}
                className="pin-dots"
                data-error={error || undefined}
                role="img"
                aria-label={`${label}: ${value.length} of ${length(format)} entered`}
            >
                {Array.from({ length: length(format) }, (_, i) => (
                    <motion.span
                        key={i}
                        className="pin-dot"
                        data-filled={i < value.length || undefined}
                        animate={reduce ? undefined : { scale: i === value.length - 1 ? [1, 1.35, 1] : 1 }}
                        transition={{ duration: 0.22 }}
                    />
                ))}
            </motion.div>
            <div className="keypad" role="group" aria-label="Keypad">
                {KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        className="keypad-key"
                        onClick={() => press(key)}
                        disabled={disabled}
                    >
                        {key}
                    </button>
                ))}
                <span aria-hidden />
                <button type="button" className="keypad-key" onClick={() => press('0')} disabled={disabled}>
                    0
                </button>
                <button
                    type="button"
                    className="keypad-key"
                    data-quiet
                    onClick={back}
                    disabled={disabled || !value}
                    aria-label="Delete last digit"
                >
                    <Delete className="size-6" aria-hidden />
                </button>
            </div>
        </div>
    );
}
