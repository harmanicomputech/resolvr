/**
 * A working four-function calculator, modelled on the stock phone calculator.
 * Pure and framework-free so it can be unit-tested.
 *
 * Stealth unlock: typing the passcode as a number and pressing "=" with no
 * calculation pending reports it as `pinCandidate`; the screen then tries it
 * quietly. A wrong guess behaves exactly like a normal calculator.
 */

export type Operator = '+' | '-' | '×' | '÷';

export interface CalcState {
    /** The number being typed or shown, unformatted (e.g. "-12.5"). */
    entry: string;
    accumulator: number | null;
    operator: Operator | null;
    /** True right after an operator or "=": the next digit starts a new number. */
    fresh: boolean;
    /** For repeated "=": the last operator and operand. */
    repeat: { operator: Operator; operand: number } | null;
    /** Digits typed since the last clear, operator or "=". */
    typed: string;
    error: boolean;
}

export type CalcAction =
    | { type: 'digit'; digit: string }
    | { type: 'dot' }
    | { type: 'clear' }
    | { type: 'sign' }
    | { type: 'percent' }
    | { type: 'operator'; operator: Operator }
    | { type: 'equals' }
    | { type: 'backspace' };

export const initialCalc: CalcState = {
    entry: '0',
    accumulator: null,
    operator: null,
    fresh: false,
    repeat: null,
    typed: '',
    error: false,
};

const MAX_DIGITS = 9;

function apply(a: number, op: Operator, b: number): number {
    switch (op) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '×':
            return a * b;
        case '÷':
            return b === 0 ? NaN : a / b;
    }
}

/** Format a result the way a phone calculator does: 9 significant digits, exponent when huge or tiny. */
export function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return 'Error';
    if (value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 1e9 || abs < 1e-8) {
        return value
            .toExponential(5)
            .replace(/\.?0+e/, 'e')
            .replace('e+', 'e');
    }
    const intDigits = Math.max(1, Math.floor(Math.log10(abs)) + 1);
    const fixed = value.toFixed(Math.max(0, MAX_DIGITS - intDigits));
    return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/** Add thousands separators for display. */
export function displayText(state: CalcState): string {
    if (state.error) return 'Error';
    const [int = '0', frac] = state.entry.split('.');
    const negative = int.startsWith('-');
    const digits = negative ? int.slice(1) : int;
    if (/e/.test(state.entry)) return state.entry;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${negative ? '-' : ''}${grouped}${frac !== undefined ? `.${frac}` : ''}`;
}

const value = (state: CalcState) => Number(state.entry);

export function calcReducer(state: CalcState, action: CalcAction): CalcState {
    if (state.error && action.type !== 'clear' && action.type !== 'digit') return state;
    const base = state.error ? initialCalc : state;

    switch (action.type) {
        case 'digit': {
            const typed = (base.fresh ? '' : base.typed) + action.digit;
            if (base.fresh || base.entry === '0' || base.entry === '-0') {
                const sign = !base.fresh && base.entry === '-0' ? '-' : '';
                return { ...base, entry: sign + action.digit, fresh: false, typed };
            }
            if (base.entry.replace(/[-.]/g, '').length >= MAX_DIGITS) return base;
            return { ...base, entry: base.entry + action.digit, typed };
        }
        case 'dot':
            if (base.fresh) return { ...base, entry: '0.', fresh: false, typed: '' };
            if (base.entry.includes('.')) return base;
            return { ...base, entry: `${base.entry}.`, typed: '' };
        case 'backspace': {
            if (base.fresh) return base;
            const entry = base.entry.slice(0, -1);
            return { ...base, entry: entry === '' || entry === '-' ? '0' : entry, typed: base.typed.slice(0, -1) };
        }
        case 'clear':
            // "C" clears the current entry; "AC" (entry already 0) clears everything.
            if (!base.error && base.entry !== '0' && !base.fresh) return { ...base, entry: '0', typed: '' };
            return initialCalc;
        case 'sign':
            if (base.fresh) return { ...base, entry: '-0', fresh: false, typed: '' };
            return { ...base, entry: base.entry.startsWith('-') ? base.entry.slice(1) : `-${base.entry}`, typed: '' };
        case 'percent':
            return { ...base, entry: formatNumber(value(base) / 100), typed: '' };
        case 'operator': {
            if (base.operator && !base.fresh && base.accumulator !== null) {
                const result = apply(base.accumulator, base.operator, value(base));
                if (!Number.isFinite(result)) return { ...initialCalc, error: true };
                return {
                    ...base,
                    accumulator: result,
                    entry: formatNumber(result),
                    operator: action.operator,
                    fresh: true,
                    typed: '',
                    repeat: null,
                };
            }
            return {
                ...base,
                accumulator: value(base),
                operator: action.operator,
                fresh: true,
                typed: '',
                repeat: null,
            };
        }
        case 'equals': {
            if (base.operator && base.accumulator !== null) {
                const operand = value(base);
                const result = apply(base.accumulator, base.operator, operand);
                if (!Number.isFinite(result)) return { ...initialCalc, error: true };
                return {
                    ...base,
                    entry: formatNumber(result),
                    accumulator: null,
                    operator: null,
                    fresh: true,
                    typed: '',
                    repeat: { operator: base.operator, operand },
                };
            }
            if (base.repeat) {
                const result = apply(value(base), base.repeat.operator, base.repeat.operand);
                if (!Number.isFinite(result)) return { ...initialCalc, error: true };
                return { ...base, entry: formatNumber(result), fresh: true, typed: '' };
            }
            return { ...base, fresh: true, typed: '' };
        }
    }
}

/** The passcode candidate when "=" is pressed: digits typed with no calculation pending. */
export function pinCandidate(state: CalcState): string | null {
    return !state.operator && /^\d{4,12}$/.test(state.typed) ? state.typed : null;
}
