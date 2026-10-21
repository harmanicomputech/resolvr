import { describe, expect, it } from 'vitest';

import { normalizeName, splitNames } from './people';

describe('normalizeName', () => {
    it('ignores case, punctuation, accents and extra spaces', () => {
        expect(normalizeName('  J. Smith ')).toBe('j smith');
        expect(normalizeName('José  Álvarez')).toBe('jose alvarez');
        expect(normalizeName("O'Neil-Brown")).toBe('o neil brown');
    });
});

describe('splitNames', () => {
    it('splits on commas, semicolons, new lines and "and"', () => {
        expect(splitNames('Ann, Bo and Cy; Di\nEd & Flo')).toEqual(['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']);
        expect(splitNames('')).toEqual([]);
    });
});
