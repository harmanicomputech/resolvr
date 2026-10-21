import { reducedMotion } from '../motion';

/**
 * Pinned scroll story: three statements blur in and out while scattered
 * fragments drift apart, then on the last beat the fragments snap together
 * into one organised timeline card.
 */
export async function initProblem(): Promise<void> {
    const section = document.querySelector<HTMLElement>('[data-problem]');
    if (!section || reducedMotion()) return; // Static layout: list of statements + card.

    const { gsap } = await import('../smooth');
    section.setAttribute('data-animate', '');

    const pin = section.querySelector<HTMLElement>('.problem-pin')!;
    const statements = gsap.utils.toArray<HTMLElement>('[data-statement]', section);
    const fragments = gsap.utils.toArray<HTMLElement>('[data-fragment]', section);
    const card = section.querySelector<HTMLElement>('[data-problem-timeline]');

    gsap.set(statements, { opacity: 0, filter: 'blur(16px)', y: 24 });

    const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: section, start: 'top top', end: '+=260%', scrub: 0.8, pin, anticipatePin: 1 },
    });

    statements.forEach((statement, i) => {
        const at = i * 2;
        tl.to(statement, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.8 }, at);
        if (i < statements.length - 1)
            tl.to(statement, { opacity: 0, filter: 'blur(16px)', y: -24, duration: 0.8 }, at + 1.4);
    });

    // Fragments drift outward across the first beats...
    fragments.forEach((fragment, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        tl.to(fragment, { x: dir * (40 + i * 18), y: (i - 2) * 22, rotate: dir * (6 + i * 2), duration: 4.4 }, 0);
    });

    // ...then snap together into the card on the final beat.
    const last = (statements.length - 1) * 2;
    tl.to(statements.at(-1)!, { opacity: 0, filter: 'blur(12px)', y: -40, duration: 0.6 }, last + 1.2)
        .to(
            fragments,
            {
                x: 0,
                y: 0,
                left: '50%',
                top: '50%',
                xPercent: -50,
                yPercent: -50,
                rotate: 0,
                scale: 0.4,
                opacity: 0,
                duration: 0.9,
                ease: 'power2.in',
            },
            last + 1.2,
        )
        .fromTo(
            card,
            { opacity: 0, scale: 0.85, y: 30 },
            { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' },
            last + 1.8,
        )
        .to({}, { duration: 0.6 });
}
