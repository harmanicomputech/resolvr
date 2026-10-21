import '../styles/main.css';

import { initAlpine } from './alpine';
import { initCursor } from './cursor';
import { finePointer, reducedMotion } from './motion';
import { initNav, initProgress } from './nav';
import { initQuickExit } from './quick-exit';
import { initReveal } from './reveal';
import { initPhotos } from './sections/photos';
import { initPageTransitions } from './transitions';

document.documentElement.classList.add('js');

// Safety first: quick exit must work even if anything below fails.
initQuickExit();
initAlpine();
initNav();
initProgress();
initReveal();
initPhotos();
initPageTransitions();

const motionOK = !reducedMotion();
if (motionOK && finePointer()) initCursor();

const has = (selector: string) => document.querySelector(selector) !== null;

// Section behaviour loads only on pages that have the section.
void (async () => {
    const needsScroll =
        motionOK && has('[data-hero], [data-problem], [data-how], [data-founder], [data-moments], [data-collage]');
    if (needsScroll) {
        const { initSmoothScroll } = await import('./smooth');
        initSmoothScroll();
    }

    const tasks: Promise<unknown>[] = [];
    if (has('[data-moments]')) tasks.push(import('./sections/moments').then((m) => m.initMoments()));
    if (has('[data-velocity]')) tasks.push(import('./sections/velocity').then((m) => m.initVelocity()));
    if (has('[data-speed], [data-cta-photo], [data-how-photos]'))
        tasks.push(import('./sections/parallax').then((m) => m.initParallax()));
    if (has('[data-hero]')) tasks.push(import('./sections/hero').then((m) => m.initHero()));
    if (has('[data-problem]')) tasks.push(import('./sections/problem').then((m) => m.initProblem()));
    if (has('[data-bento]')) tasks.push(import('./sections/bento').then((m) => m.initBento()));
    if (has('[data-how]')) tasks.push(import('./sections/how').then((m) => m.initHow()));
    if (has('[data-security]')) tasks.push(import('./sections/shield').then((m) => m.initShield()));
    if (has('[data-founder]')) tasks.push(import('./sections/founder').then((m) => m.initFounder()));
    if (has('[data-marquee]')) tasks.push(import('./sections/marquee').then((m) => m.initMarquee()));
    if (has('[data-faq]')) tasks.push(import('./sections/faq').then((m) => m.initFaq()));
    if (has('[data-waitlist]')) tasks.push(import('./sections/waitlist').then((m) => m.initWaitlist()));
    if (has('[data-toc]')) tasks.push(import('./sections/toc').then((m) => m.initToc()));
    if (has('[data-magnetic]') && motionOK && finePointer())
        tasks.push(import('./sections/magnetic').then((m) => m.initMagnetic()));

    const results = await Promise.allSettled(tasks);
    for (const result of results) if (result.status === 'rejected') console.warn(result.reason);

    // Pins were created out of DOM order by async modules: sort, then measure again once fonts settle.
    if (needsScroll) {
        const { ScrollTrigger } = await import('./smooth');
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
        void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    }
})();
