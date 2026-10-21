import { describe, expect, it } from 'vitest';

import { shouldExitOnEscape } from './quick-exit';

const key = (k: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: k, ...init });

describe('shouldExitOnEscape', () => {
    it('exits on a plain Escape press', () => {
        document.body.innerHTML = '';
        expect(shouldExitOnEscape(key('Escape'))).toBe(true);
    });

    it('ignores other keys and held keys', () => {
        expect(shouldExitOnEscape(key('Enter'))).toBe(false);
        expect(shouldExitOnEscape(key('Escape', { repeat: true }))).toBe(false);
    });

    it('lets Escape close the mobile menu instead', () => {
        document.body.innerHTML = '<div class="mobile-menu" data-open="true"></div>';
        expect(shouldExitOnEscape(key('Escape'))).toBe(false);
    });
});
