import '../styles/main.css';

import { initAlpine } from './alpine';
import { reducedMotion } from './motion';
import { initNav, initProgress } from './nav';
import { initReveal } from './reveal';
import { initPhotos } from './sections/photos';
import { initWaitlist } from './sections/waitlist';
import { initThemeToggle } from './theme';
import { initPageTransitions } from './transitions';

document.documentElement.classList.add('js');
const motionOK = !reducedMotion();
document.documentElement.classList.toggle('motion', motionOK);

initThemeToggle();
initAlpine();
initNav();
initProgress();
initReveal();
initPhotos();
// Eager: a fast submit must never fall through to a native form post.
initWaitlist();
void initPageTransitions();

const has = (selector: string) => document.querySelector(selector) !== null;

// Small section behaviours load only on pages that use them.
if (has('[data-hero]')) void import('./sections/hero').then((m) => m.initHero());
if (has('[data-bento]')) void import('./sections/bento').then((m) => m.initBento());
if (has('[data-faq]')) void import('./sections/faq').then((m) => m.initFaq());
if (has('[data-toc]')) void import('./sections/toc').then((m) => m.initToc());
// Scroll effects (smooth scroll, parallax, reveals) only when motion is welcome.
if (motionOK) {
    void (async () => {
        await (await import('./effects')).initEffects();
        await (await import('./designed')).initDesigned();
    })();
}
