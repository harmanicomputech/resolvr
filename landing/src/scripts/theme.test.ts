import { beforeEach, describe, expect, it } from 'vitest';

import { initThemeToggle } from './theme';

describe('theme toggle', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        localStorage.clear();
        document.body.innerHTML = '<button data-theme-toggle aria-pressed="false"></button>';
    });

    it('starts light and toggles to dark, remembering the choice', () => {
        initThemeToggle();
        const button = document.querySelector('button')!;
        expect(button.getAttribute('aria-pressed')).toBe('false');

        button.click();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(button.getAttribute('aria-pressed')).toBe('true');
        expect(localStorage.getItem('resolvr-theme')).toBe('dark');

        button.click();
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('resolvr-theme')).toBe('light');
    });
});
