import { finePointer, reducedMotion } from '../motion';

/**
 * Scroll parallax for [data-speed] elements (story collage) and the final CTA
 * photo, plus a gentle pointer drift on the collage. Speed is a fraction of the
 * element's travel through the viewport: 0.2 moves 20% slower than scroll.
 */
export async function initParallax(): Promise<void> {
    if (reducedMotion()) return;
    const { gsap } = await import('../smooth');

    gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
        const speed = Number(el.dataset.speed ?? 0.2);
        gsap.fromTo(
            el,
            { yPercent: speed * 30 },
            {
                yPercent: -speed * 30,
                ease: 'none',
                scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            },
        );
    });

    const ctaPhoto = document.querySelector<HTMLElement>('[data-cta-photo]');
    if (ctaPhoto) {
        gsap.fromTo(
            ctaPhoto,
            { scale: 1.2, yPercent: -6 },
            {
                scale: 1,
                yPercent: 6,
                ease: 'none',
                scrollTrigger: {
                    trigger: ctaPhoto.closest('section'),
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            },
        );
    }

    const howPhotos = document.querySelector<HTMLElement>('[data-how-photos]');
    if (howPhotos) {
        gsap.fromTo(
            howPhotos,
            { y: 60, rotate: -2 },
            {
                y: -60,
                rotate: 1.5,
                ease: 'none',
                scrollTrigger: {
                    trigger: howPhotos.closest('section'),
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            },
        );
    }

    const collage = document.querySelector<HTMLElement>('[data-collage]');
    if (collage && finePointer()) {
        const items = gsap.utils.toArray<HTMLElement>('[data-collage-item]', collage).map((el, i) => ({
            x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3.out' }),
            depth: 6 + i * 4,
        }));
        collage.addEventListener('pointermove', (event) => {
            const rect = collage.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width - 0.5;
            for (const item of items) item.x(nx * item.depth * 2);
        });
        collage.addEventListener('pointerleave', () => items.forEach((item) => item.x(0)));
    }
}
