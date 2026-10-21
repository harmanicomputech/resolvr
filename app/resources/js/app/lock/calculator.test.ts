import { describe, expect, it } from 'vitest';

import {
    calcReducer,
    displayText,
    formatNumber,
    initialCalc,
    pinCandidate,
    type CalcAction,
    type CalcState,
} from './calculator';

const press = (keys: string, state: CalcState = initialCalc): CalcState =>
    [...keys].reduce((s, key) => {
        const action: CalcAction =
            key === '='
                ? { type: 'equals' }
                : key === '.'
                  ? { type: 'dot' }
                  : key === 'C'
                    ? { type: 'clear' }
                    : key === '±'
                      ? { type: 'sign' }
                      : key === '%'
                        ? { type: 'percent' }
                        : '+-×÷'.includes(key)
                          ? { type: 'operator', operator: key as '+' }
                          : { type: 'digit', digit: key };
        return calcReducer(s, action);
    }, state);

describe('calculator', () => {
    it('does arithmetic', () => {
        expect(displayText(press('12+30='))).toBe('42');
        expect(displayText(press('7×6='))).toBe('42');
        expect(displayText(press('1÷3='))).toBe('0.33333333');
        expect(displayText(press('0.1+0.2='))).toBe('0.3');
        expect(displayText(press('5-8='))).toBe('-3');
    });

    it('chains operators and repeats equals', () => {
        expect(displayText(press('2+3×4='))).toBe('20');
        expect(displayText(press('2+3=='))).toBe('8');
    });

    it('handles clear, sign, percent and errors', () => {
        expect(displayText(press('12C'))).toBe('0');
        expect(displayText(press('12±'))).toBe('-12');
        expect(displayText(press('50%'))).toBe('0.5');
        expect(displayText(press('1÷0='))).toBe('Error');
        expect(displayText(press('1÷0=C'))).toBe('0');
    });

    it('groups thousands and caps digits', () => {
        expect(displayText(press('1234567'))).toBe('1,234,567');
        expect(displayText(press('12345678901'))).toBe('123,456,789');
        expect(formatNumber(123456789 * 1000)).toBe('1.23457e11');
    });

    it('reports a passcode only when "=" follows plain digits', () => {
        expect(pinCandidate(press('2468'))).toBe('2468');
        expect(pinCandidate(press('12+2468'))).toBeNull();
        expect(pinCandidate(press('24.68'))).toBeNull();
        expect(pinCandidate(press('123'))).toBeNull();
        expect(pinCandidate(press('5+5=2468'))).toBe('2468');
    });
});
