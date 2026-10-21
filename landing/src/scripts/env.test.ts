import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './env';

describe('prefersReducedMotion', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reads the media query', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
        expect(prefersReducedMotion()).toBe(true);
    });
});
