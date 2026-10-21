import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { finePointer } from './motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll effects for the landing site. Only loaded when the visitor has not
 * asked for reduced motion. Driven by data attributes in the markup:
 *
 *   [data-speed="0.3"]   parallax: moves at a fraction of scroll (negative = opposite)
 *   .section-title       words rise in when the heading enters
 *   [data-stagger]       children enter one after another
 *   .parallax-img        image drifts inside its frame
 *   [data-draw]          line draws as its section scrolls through
 *   [data-count]         number counts up once
 *   [data-scrub-text]    words light up as you read down
 *   [data-scale-in]      panel grows into place
 */
export function initEffects(): void {
    smoothScroll();
    parallax();
    titles();
    staggers();
    imageParallax();
    drawLines();
    counters();
    scrubText();
    scaleIns();
    if (finePointer()) tilt();

    // Fonts change line breaks; measure again once they are in.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function smoothScroll(): void {
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -96 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.addEventListener('resolvr:scroll-lock', (event) => {
        if ((event as CustomEvent<boolean>).detail) lenis.stop();
        else lenis.start();
    });
}

function parallax(): void {
    gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
        const speed = Number(el.dataset.speed ?? 0.2);
        const section = el.closest('section, .hero') ?? el;
        gsap.fromTo(
            el,
            { y: () => -speed * 120 },
            {
                y: () => speed * 120,
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                    invalidateOnRefresh: true,
                },
            },
        );
    });

    // The hero content lifts and fades a little as you scroll away from it.
    const copy = document.querySelector('.hero-copy');
    if (copy) {
        gsap.to(copy, {
            y: -60,
            opacity: 0.3,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
    }
}

/** Wrap each word of a heading for a mask-up reveal, keeping inline spans (e.g. .muted). */
function splitWords(root: HTMLElement): HTMLElement[] {
    const inners: HTMLElement[] = [];
    const walk = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                const frag = document.createDocumentFragment();
                for (const part of (child.textContent ?? '').split(/(\s+)/)) {
                    if (!part) continue;
                    if (/^\s+$/.test(part)) {
                        frag.append(document.createTextNode(part));
                        continue;
                    }
                    const outer = document.createElement('span');
                    outer.className = 'tw';
                    const inner = document.createElement('span');
                    inner.textContent = part;
                    outer.append(inner);
                    frag.append(outer);
                    inners.push(inner);
                }
                child.replaceWith(frag);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child);
            }
        }
    };
    walk(root);
    return inners;
}

function titles(): void {
    gsap.utils.toArray<HTMLElement>('.section-title, .page-title, .final-cta-title').forEach((title) => {
        const words = splitWords(title);
        gsap.from(words, {
            yPercent: 110,
            rotate: 3,
            duration: 1,
            ease: 'expo.out',
            stagger: 0.05,
            scrollTrigger: { trigger: title, start: 'top 85%' },
        });
    });

    gsap.utils.toArray<HTMLElement>('.section-head .eyebrow, .section-lead').forEach((el) => {
        gsap.from(el, {
            opacity: 0,
            y: 16,
            duration: 0.8,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
        });
    });
}

function staggers(): void {
    gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
        const items = Array.from(group.children).filter((el) => !el.matches('[aria-hidden="true"]')) as HTMLElement[];
        gsap.set(items, { opacity: 0, y: 48, scale: 0.97 });
        ScrollTrigger.batch(items, {
            start: 'top 88%',
            once: true,
            onEnter: (batch) =>
                gsap.to(batch, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.9,
                    ease: 'expo.out',
                    stagger: 0.09,
                    clearProps: 'transform,opacity',
                }),
        });
    });
}

function imageParallax(): void {
    gsap.utils.toArray<HTMLElement>('.parallax-img').forEach((img) => {
        gsap.fromTo(
            img,
            { yPercent: -8 },
            {
                yPercent: 8,
                ease: 'none',
                scrollTrigger: {
                    trigger: img.closest('.photo') ?? img,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            },
        );
    });
}

function drawLines(): void {
    gsap.utils.toArray<HTMLElement>('[data-draw]').forEach((line) => {
        gsap.fromTo(
            line,
            { '--draw': 0 },
            {
                '--draw': 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: line.closest('section') ?? line,
                    start: 'top 70%',
                    end: 'center 45%',
                    scrub: 0.6,
                },
            },
        );
    });
}

function counters(): void {
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count ?? 0);
        const value = { n: 0 };
        el.textContent = '0';
        ScrollTrigger.create({
            trigger: el,
            start: 'top 90%',
            once: true,
            onEnter: () =>
                gsap.to(value, {
                    n: target,
                    duration: 1.6,
                    ease: 'power3.out',
                    onUpdate: () => (el.textContent = String(Math.round(value.n))),
                }),
        });
    });
}

function scrubText(): void {
    gsap.utils.toArray<HTMLElement>('[data-scrub-text]').forEach((block) => {
        const text = block.textContent ?? '';
        block.setAttribute('aria-label', text.trim());
        block.textContent = '';
        const words = text
            .trim()
            .split(/\s+/)
            .map((word, i, all) => {
                const span = document.createElement('span');
                span.className = 'sw';
                span.setAttribute('aria-hidden', 'true');
                span.textContent = word + (i < all.length - 1 ? ' ' : '');
                block.append(span);
                return span;
            });
        gsap.set(words, { '--lit': '0%' });
        gsap.to(words, {
            '--lit': '100%',
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: block, start: 'top 80%', end: 'bottom 45%', scrub: true },
        });
    });
}

function scaleIns(): void {
    gsap.utils.toArray<HTMLElement>('[data-scale-in]').forEach((el) => {
        gsap.fromTo(
            el,
            { scale: 0.9, borderRadius: '48px' },
            {
                scale: 1,
                borderRadius: '24px',
                ease: 'none',
                scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 55%', scrub: true },
            },
        );
    });
}

function tilt(): void {
    document.querySelectorAll<HTMLElement>('.tile, .icon-card, .stat-card, .price-card').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--tx', (((event.clientX - rect.left) / rect.width - 0.5) * 6).toFixed(2));
            card.style.setProperty('--ty', ((0.5 - (event.clientY - rect.top) / rect.height) * 6).toFixed(2));
        });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--tx', '0');
            card.style.setProperty('--ty', '0');
        });
    });
}
