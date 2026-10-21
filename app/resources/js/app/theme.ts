import { useEffect } from 'react';

import type { Settings } from '@/lib/model/schema';

const THEME_KEY = 'resolvr:theme';

/** Apply the chosen theme to <html>. Light is the default; the choice is mirrored to localStorage so the lock screen matches. */
export function applyTheme(theme: Settings['theme']): void {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) document.querySelector('meta[data-theme-color]')?.setAttribute('content', bg);
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // Storage blocked: the theme still applies for this visit.
    }
}

export function savedTheme(): Settings['theme'] {
    try {
        const value = localStorage.getItem(THEME_KEY);
        return value === 'dark' || value === 'system' ? value : 'light';
    } catch {
        return 'light';
    }
}

export function useTheme(theme: Settings['theme'] | undefined): void {
    useEffect(() => applyTheme(theme ?? savedTheme()), [theme]);
}
