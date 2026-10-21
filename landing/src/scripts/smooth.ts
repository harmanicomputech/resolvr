import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function initSmoothScroll(): Lenis {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, anchors: { offset: -96 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    window.addEventListener('resolvr:scroll-lock', (event) => {
        if ((event as CustomEvent<boolean>).detail) lenis?.stop();
        else lenis?.start();
    });
    return lenis;
}

export { gsap, ScrollTrigger };
