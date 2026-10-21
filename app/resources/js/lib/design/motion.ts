/**
 * Motion tokens for JavaScript animation (Motion, GSAP). Mirrors tokens.css.
 * Shared by app/ and landing/.
 *
 * Rules: motion explains hierarchy or state; nothing loops forever except
 * ambient background; under prefers-reduced-motion everything becomes a
 * short opacity fade (use `reducedMotion()` to branch).
 */

/** Durations in seconds (Motion and GSAP both take seconds). */
export const duration = {
    instant: 0.12,
    fast: 0.2,
    base: 0.32,
    slow: 0.56,
    slower: 0.9,
} as const;

/** Cubic-bezier control points. */
export const ease = {
    /** Entrances: fast start, long settle. */
    outExpo: [0.16, 1, 0.3, 1],
    /** Page and section transitions. */
    inOutQuart: [0.76, 0, 0.24, 1],
    /** Small state changes (hover, colour). */
    standard: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** GSAP equivalents of `ease`. */
export const gsapEase = {
    outExpo: 'expo.out',
    inOutQuart: 'power4.inOut',
    standard: 'power2.out',
} as const;

/** Spring configs for interactive elements (Motion `transition={{ type: 'spring', ...spring.press }}`). */
export const spring = {
    /** Buttons, toggles: quick, barely any overshoot. */
    press: { stiffness: 400, damping: 30, mass: 1 },
    /** Cards, sheets, layout changes. */
    gentle: { stiffness: 260, damping: 30, mass: 1 },
    /** Cursor followers, magnetic buttons. */
    follow: { stiffness: 150, damping: 20, mass: 0.6 },
} as const;

/** Stagger between siblings, in seconds. */
export const stagger = {
    tight: 0.03,
    base: 0.06,
    loose: 0.1,
} as const;

export function reducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
