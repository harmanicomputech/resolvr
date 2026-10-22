import { useEffect, type RefObject } from 'react';

/**
 * Opt-in parallax: tilting the phone nudges the dashboard cards a few pixels
 * (via --tilt-x/--tilt-y, -1…1, on `ref`). Off under reduced motion, and it
 * stops listening as soon as it is turned off or the screen unmounts.
 */
export function useTilt(enabled: boolean, ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const el = ref.current;
        const reduce =
            document.documentElement.dataset.motion === 'reduce' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!enabled || !el || reduce) return;
        let frame = 0;
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        const onTilt = (e: DeviceOrientationEvent) => {
            if (e.beta === null || e.gamma === null) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                // Phones are usually held about 40° from flat; measure from there.
                el.style.setProperty('--tilt-x', clamp((e.gamma ?? 0) / 25).toFixed(3));
                el.style.setProperty('--tilt-y', clamp(((e.beta ?? 40) - 40) / 25).toFixed(3));
            });
        };
        window.addEventListener('deviceorientation', onTilt);
        return () => {
            window.removeEventListener('deviceorientation', onTilt);
            cancelAnimationFrame(frame);
            el.style.removeProperty('--tilt-x');
            el.style.removeProperty('--tilt-y');
        };
    }, [enabled, ref]);
}

/** iOS asks for permission to read motion sensors; call from a tap. */
export async function requestTiltPermission(): Promise<boolean> {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (typeof D?.requestPermission !== 'function') return true;
    try {
        return (await D.requestPermission()) === 'granted';
    } catch {
        return false;
    }
}
