import '../styles/main.css';

import { initAlpine } from './alpine';
import { initCursor } from './cursor';
import { finePointer, reducedMotion } from './motion';
import { initNav, initProgress } from './nav';
import { initQuickExit } from './quick-exit';
import { initReveal } from './reveal';
import { initPhotos } from './sections/photos';
import { initWaitlist } from './sections/waitlist';
import { initPageTransitions } from './transitions';

document.documentElement.classList.add('js');

// Safety first: quick exit must work even if anything below fails.
initQuickExit();
initAlpine();
initNav();
initProgress();
initReveal();
initPhotos();
// Eager: a fast submit must never fall through to a native form post.
initWaitlist();
void initPageTransitions();

const motionOK = !reducedMotion();
if (motionOK && finePointer()) initCursor();

const has = (selector: string) => document.querySelector(selector) !== null;

// Section behaviour loads only on pages that have the section. Modules run one
// at a time with a yield in between, so start-up never blocks input for long.
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Init = () => Promise<unknown>;
const sections: [selector: string, load: Init][] = [
    ['[data-hero]', () => import('./sections/hero').then((m) => m.initHero())],
    ['[data-moments]', () => import('./sections/moments').then((m) => m.initMoments())],
    ['[data-problem]', () => import('./sections/problem').then((m) => m.initProblem())],
    ['[data-bento]', () => import('./sections/bento').then((m) => m.initBento())],
    ['[data-velocity]', () => import('./sections/velocity').then((m) => m.initVelocity())],
    ['[data-how]', () => import('./sections/how').then((m) => m.initHow())],
    ['[data-security]', () => import('./sections/shield').then((m) => m.initShield())],
    ['[data-founder]', () => import('./sections/founder').then((m) => m.initFounder())],
    ['[data-marquee]', () => import('./sections/marquee').then((m) => m.initMarquee())],
    ['[data-faq]', () => import('./sections/faq').then((m) => m.initFaq())],
    ['[data-toc]', () => import('./sections/toc').then((m) => m.initToc())],
    [
        '[data-speed], [data-cta-photo], [data-how-photos]',
        () => import('./sections/parallax').then((m) => m.initParallax()),
    ],
];

void (async () => {
    const needsScroll =
        motionOK && has('[data-hero], [data-problem], [data-how], [data-founder], [data-moments], [data-collage]');
    if (needsScroll) {
        const { initSmoothScroll } = await import('./smooth');
        initSmoothScroll();
    }

    for (const [selector, load] of sections) {
        if (!has(selector)) continue;
        try {
            await load();
        } catch (error) {
            console.warn(error);
        }
        await yieldToMain();
    }
    if (has('[data-magnetic]') && motionOK && finePointer())
        await import('./sections/magnetic').then((m) => m.initMagnetic());

    // Pins were created by async modules: sort them into DOM order, then measure once fonts settle.
    if (needsScroll) {
        const { ScrollTrigger } = await import('./smooth');
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
        void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    }
})();
