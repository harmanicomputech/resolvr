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

const DISPLAY_KEY = 'resolvr:display';
type Display = Pick<Settings, 'reducedMotion' | 'textScale'>;

/** Text size and reduced motion, mirrored to localStorage so the lock screen matches too. */
export function applyDisplay(display: Display): void {
    const root = document.documentElement;
    root.style.fontSize = display.textScale === 1 ? '' : `${Math.round(display.textScale * 100)}%`;
    if (display.reducedMotion === 'reduce') root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
    try {
        localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
    } catch {
        // Storage blocked: applies for this visit only.
    }
}

export function savedDisplay(): Display {
    try {
        const value = JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? 'null') as Partial<Display> | null;
        return {
            reducedMotion: value?.reducedMotion === 'reduce' ? 'reduce' : 'system',
            textScale: typeof value?.textScale === 'number' ? Math.min(1.4, Math.max(0.85, value.textScale)) : 1,
        };
    } catch {
        return { reducedMotion: 'system', textScale: 1 };
    }
}

export function useDisplay(settings: Settings | null): Display {
    const display = settings
        ? { reducedMotion: settings.reducedMotion, textScale: settings.textScale }
        : savedDisplay();
    const { reducedMotion, textScale } = display;
    useEffect(() => applyDisplay({ reducedMotion, textScale }), [reducedMotion, textScale]);
    return display;
}
