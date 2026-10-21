import '../styles/main.css';

import { initAlpine } from './alpine';
import { initNav, initProgress } from './nav';
import { initQuickExit } from './quick-exit';
import { initReveal } from './reveal';
import { initPhotos } from './sections/photos';
import { initWaitlist } from './sections/waitlist';
import { initThemeToggle } from './theme';
import { initPageTransitions } from './transitions';

document.documentElement.classList.add('js');

// Safety first: quick exit must work even if anything below fails.
initQuickExit();
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
