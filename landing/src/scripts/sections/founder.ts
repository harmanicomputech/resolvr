import { reducedMotion } from '../motion';

/** Pull-quote reveals line by line; the portrait drifts slightly on scroll. */
export async function initFounder(): Promise<void> {
    const section = document.querySelector<HTMLElement>('[data-founder]');
    if (!section || reducedMotion()) return;

    const { gsap } = await import('../smooth');
    const lines = gsap.utils.toArray<HTMLElement>('[data-line] > span', section);

    gsap.from(lines, {
        opacity: 0,
        y: 18,
        filter: 'blur(8px)',
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.14,
        scrollTrigger: { trigger: section, start: 'top 70%' },
    });

    const portrait = section.querySelector<HTMLElement>('[data-parallax]');
    if (portrait) {
        const amount = Number(portrait.dataset.parallax ?? 0.1) * 100;
        gsap.fromTo(
            portrait,
            { yPercent: amount / 2 },
            {
                yPercent: -amount / 2,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
            },
        );
    }
}
