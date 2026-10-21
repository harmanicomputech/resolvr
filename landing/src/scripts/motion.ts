// Re-export the shared motion tokens so landing code has one import path.
export { duration, ease, gsapEase, reducedMotion, spring, stagger } from '../../../app/resources/js/lib/design/motion';

/** Fine pointer + hover: desktop-style interactions (cursor glow, tilt, magnetic buttons). */
export function finePointer(): boolean {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Skip heavy ambient effects on data saver or very low-end devices. */
export function lowPower(): boolean {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    return (
        Boolean(nav.connection?.saveData) ||
        (nav.deviceMemory !== undefined && nav.deviceMemory < 4) ||
        (navigator.hardwareConcurrency ?? 8) < 4
    );
}

/** Run `fn` while `el` is on screen; `fn` receives true/false on enter/leave. */
export function whenVisible(el: Element, fn: (visible: boolean) => void, rootMargin = '0px'): IntersectionObserver {
    const io = new IntersectionObserver(([entry]) => fn(Boolean(entry?.isIntersecting)), { rootMargin });
    io.observe(el);
    return io;
}
