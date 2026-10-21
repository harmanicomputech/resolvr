import { duration, finePointer, gsapEase, lowPower, reducedMotion, stagger } from '../motion';
import { splitWords } from './split';

/**
 * Hero: word mask-up, sheen, aurora + particles, 3-layer mouse parallax,
 * phone tilt, and a scroll hand-off where the phone scales down and pins.
 */
export async function initHero(): Promise<void> {
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    if (!hero) return;

    const sheen = hero.querySelector<HTMLElement>('.hero-sheen');
    if (reducedMotion()) {
        // Static: everything visible, no ambient effects.
        return;
    }

    const { gsap, ScrollTrigger } = await import('../smooth');

    // 1. Headline words mask up, then the rest fades in.
    const title = hero.querySelector<HTMLElement>('[data-split]');
    const words = title ? splitWords(title) : [];
    const fades = hero.querySelectorAll<HTMLElement>('[data-hero-fade], .hero-eyebrow');
    const tl = gsap.timeline({ defaults: { ease: gsapEase.outExpo } });
    tl.from(words, { yPercent: 110, duration: duration.slower, stagger: stagger.base })
        .from(fades, { opacity: 0, y: 16, duration: duration.slow, stagger: stagger.loose }, '-=0.6')
        .from('.hero-stage', { opacity: 0, y: 40, rotateX: 20, duration: 1.2 }, 0.2)
        .from('.orbit-card', { opacity: 0, scale: 0.9, duration: duration.slow, stagger: 0.12 }, 0.7)
        .add(() => sheen?.setAttribute('data-sheen', ''), 0.6);
    sheen?.addEventListener('pointerenter', () => {
        sheen.removeAttribute('data-sheen');
        void sheen.offsetWidth;
        sheen.setAttribute('data-sheen', '');
    });

    // 2. Ambient background, only on capable devices and once the page has settled.
    if (!lowPower()) {
        const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 400));
        idle(async () => {
            const aurora = hero.querySelector<HTMLCanvasElement>('[data-aurora]');
            const particles = hero.querySelector<HTMLCanvasElement>('[data-particles]');
            if (aurora) (await import('./aurora')).startAurora(aurora);
            if (particles) (await import('./particles')).startParticles(particles);
        });
    }

    // 3. Pointer parallax (max 12px) and phone tilt.
    if (finePointer()) {
        const stage = hero.querySelector<HTMLElement>('[data-tilt]');
        const opts = { duration: 0.8, ease: 'power3.out' };
        // Orbit cards read --px/--py in CSS (they already use transform); other layers move directly.
        const layers = Array.from(hero.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => {
            const card = el.classList.contains('orbit-card');
            if (card) gsap.set(el, { '--px': 0, '--py': 0 });
            return {
                max: Math.min(12, 5 * Number(el.dataset.depth ?? 1)),
                x: gsap.quickTo(el, card ? '--px' : 'x', opts),
                y: gsap.quickTo(el, card ? '--py' : 'y', opts),
            };
        });
        if (stage) gsap.set(stage, { '--rx': 8, '--ry': -14 });
        const rx = stage ? gsap.quickTo(stage, '--rx', { duration: 0.9, ease: 'power3.out' }) : null;
        const ry = stage ? gsap.quickTo(stage, '--ry', { duration: 0.9, ease: 'power3.out' }) : null;

        hero.addEventListener('pointermove', (event) => {
            const rect = hero.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width - 0.5;
            const ny = (event.clientY - rect.top) / rect.height - 0.5;
            for (const layer of layers) {
                // nx, ny are in [-0.5, 0.5], so 2 * max keeps movement within ±max px.
                layer.x(nx * layer.max * 2);
                layer.y(ny * layer.max * 2);
            }
            rx?.(8 - ny * 10);
            ry?.(-14 + nx * 16);
        });
        hero.addEventListener('pointerleave', () => {
            for (const layer of layers) {
                layer.x(0);
                layer.y(0);
            }
            rx?.(8);
            ry?.(-14);
        });
    }

    // 4. Scroll hand-off: copy lifts away, phone scales down while the hero pins briefly.
    const mm = gsap.matchMedia();
    mm.add('(min-width: 64rem)', () => {
        gsap.timeline({
            scrollTrigger: { trigger: hero, start: 'top top', end: '+=45%', scrub: 0.6, pin: true, anticipatePin: 1 },
        })
            .to('.hero-copy', { y: -60, opacity: 0, ease: 'none' }, 0)
            .to('.hero-visual', { scale: 0.82, y: -30, ease: 'none' }, 0)
            .to('.orbit-card', { opacity: 0, ease: 'none' }, 0.2);
    });
    mm.add('(max-width: 63.99rem)', () => {
        gsap.to('.hero-visual', {
            scale: 0.9,
            opacity: 0.6,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'center center', end: 'bottom top', scrub: true },
        });
    });
    ScrollTrigger.refresh();
}
