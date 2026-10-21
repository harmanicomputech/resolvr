import { useEffect, useReducer, useRef } from 'react';

import {
    calcReducer,
    displayText,
    initialCalc,
    pinCandidate,
    type CalcAction,
    type Operator,
} from '../lock/calculator';
import { useSession } from '../session';

/**
 * Stealth mode: a fully working calculator. Typing the passcode and pressing
 * "=" unlocks. Nothing on this screen mentions Resolvr. Passphrase users
 * press and hold "=" to reach the normal lock screen.
 */
export function Calculator({ onReveal }: { onReveal: () => void }) {
    const session = useSession();
    const [state, dispatch] = useReducer(calcReducer, initialCalc);
    const holdTimer = useRef<number | undefined>(undefined);
    const swipeStart = useRef<number | null>(null);

    const equals = () => {
        const candidate = pinCandidate(state);
        dispatch({ type: 'equals' });
        if (candidate && session.pinFormat !== 'phrase') void session.unlock(candidate);
    };

    const act = (action: CalcAction) => (action.type === 'equals' ? equals() : dispatch(action));

    // Keyboard support, like a desktop calculator.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const map: Record<string, CalcAction> = {
                '+': { type: 'operator', operator: '+' },
                '-': { type: 'operator', operator: '-' },
                '*': { type: 'operator', operator: '×' },
                x: { type: 'operator', operator: '×' },
                '/': { type: 'operator', operator: '÷' },
                '.': { type: 'dot' },
                ',': { type: 'dot' },
                '%': { type: 'percent' },
                Escape: { type: 'clear' },
                Backspace: { type: 'backspace' },
                Enter: { type: 'equals' },
                '=': { type: 'equals' },
            };
            const action: CalcAction | undefined = /^\d$/.test(event.key)
                ? { type: 'digit', digit: event.key }
                : map[event.key];
            if (!action) return;
            event.preventDefault();
            act(action);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const text = displayText(state);
    const digits = text.replace(/[^\d]/g, '').length;
    const size = digits > 8 ? 'sm' : digits > 6 ? 'md' : undefined;
    const cleared = state.entry === '0' || state.fresh;
    const op = (operator: Operator, label: string) => (
        <button
            type="button"
            className="calc-key"
            data-kind="operator"
            aria-label={label}
            aria-pressed={state.operator === operator && state.fresh}
            onClick={() => act({ type: 'operator', operator })}
        >
            {operator === '-' ? '−' : operator}
        </button>
    );
    const digit = (d: string) => (
        <button
            type="button"
            className="calc-key"
            data-wide={d === '0' || undefined}
            onClick={() => act({ type: 'digit', digit: d })}
        >
            {d}
        </button>
    );

    return (
        <main className="calculator" aria-label="Calculator">
            <h1 className="sr-only">Calculator</h1>
            <output
                className="calc-display"
                data-size={size}
                aria-live="polite"
                onPointerDown={(e) => (swipeStart.current = e.clientX)}
                onPointerUp={(e) => {
                    if (swipeStart.current !== null && Math.abs(e.clientX - swipeStart.current) > 40)
                        dispatch({ type: 'backspace' });
                    swipeStart.current = null;
                }}
            >
                {text}
            </output>
            <div className="calc-keys">
                <button
                    type="button"
                    className="calc-key"
                    data-kind="function"
                    onClick={() => act({ type: 'clear' })}
                    aria-label={cleared ? 'All clear' : 'Clear'}
                >
                    {cleared ? 'AC' : 'C'}
                </button>
                <button
                    type="button"
                    className="calc-key"
                    data-kind="function"
                    onClick={() => act({ type: 'sign' })}
                    aria-label="Plus minus"
                >
                    +/−
                </button>
                <button
                    type="button"
                    className="calc-key"
                    data-kind="function"
                    onClick={() => act({ type: 'percent' })}
                    aria-label="Percent"
                >
                    %
                </button>
                {op('÷', 'Divide')}
                {digit('7')}
                {digit('8')}
                {digit('9')}
                {op('×', 'Multiply')}
                {digit('4')}
                {digit('5')}
                {digit('6')}
                {op('-', 'Minus')}
                {digit('1')}
                {digit('2')}
                {digit('3')}
                {op('+', 'Plus')}
                {digit('0')}
                <button
                    type="button"
                    className="calc-key"
                    onClick={() => act({ type: 'dot' })}
                    aria-label="Decimal point"
                >
                    .
                </button>
                <button
                    type="button"
                    className="calc-key"
                    data-kind="operator"
                    aria-label="Equals"
                    onClick={equals}
                    onPointerDown={() => (holdTimer.current = window.setTimeout(onReveal, 1200))}
                    onPointerUp={() => window.clearTimeout(holdTimer.current)}
                    onPointerLeave={() => window.clearTimeout(holdTimer.current)}
                >
                    =
                </button>
            </div>
        </main>
    );
}
