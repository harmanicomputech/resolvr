import { useEffect, useRef } from 'react';

import type { Settings } from '@/lib/model/schema';

/**
 * Lock after inactivity, and (optionally) the moment the app is hidden:
 * switching tabs or apps, or turning the screen off.
 */
export function useAutoLock(settings: Settings | null, lock: () => void): void {
    useEffect(() => {
        if (!settings) return;
        let timer: number | undefined;
        const minutes = settings.autoLockMinutes;
        const reset = () => {
            window.clearTimeout(timer);
            if (minutes > 0) timer = window.setTimeout(lock, minutes * 60_000);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'hidden' && settings.lockOnHide) lock();
        };
        const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
        document.addEventListener('visibilitychange', onVisibility);
        reset();
        return () => {
            window.clearTimeout(timer);
            events.forEach((e) => window.removeEventListener(e, reset));
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [settings, lock]);
}

/**
 * The panic gesture: a firm shake of the phone, or Escape pressed twice
 * quickly on a keyboard, switches straight to the calculator.
 * (Triple-tapping the logo is wired in the app shell with usePanicTap.)
 */
export function usePanic(enabled: boolean, panic: () => void): void {
    useEffect(() => {
        if (!enabled) return;
        let lastEscape = 0;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            const now = Date.now();
            if (now - lastEscape < 450) panic();
            lastEscape = now;
        };
        let shakes: number[] = [];
        const onMotion = (event: DeviceMotionEvent) => {
            const a = event.accelerationIncludingGravity;
            if (!a?.x || !a.y || !a.z) return;
            const force = Math.hypot(a.x, a.y, a.z);
            if (force < 28) return;
            const now = Date.now();
            shakes = [...shakes.filter((t) => now - t < 1000), now];
            if (shakes.length >= 3) {
                shakes = [];
                panic();
            }
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('devicemotion', onMotion);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('devicemotion', onMotion);
        };
    }, [enabled, panic]);
}

/** Returns a click handler that calls `panic` on three quick taps. */
export function usePanicTap(enabled: boolean, panic: () => void): () => void {
    const taps = useRef<number[]>([]);
    return () => {
        if (!enabled) return;
        const now = Date.now();
        taps.current = [...taps.current.filter((t) => now - t < 700), now];
        if (taps.current.length >= 3) {
            taps.current = [];
            panic();
        }
    };
}
