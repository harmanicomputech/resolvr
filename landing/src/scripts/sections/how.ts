import { reducedMotion } from '../motion';

/**
 * Sticky stepper: the active step is full contrast, the device crossfades to
 * its screen, the progress line fills and each number counts in once.
 */
export async function initHow(): Promise<void> {
    const section = document.querySelector<HTMLElement>('[data-how]');
    if (!section) return;

    const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-how-step]'));
    const screens = Array.from(section.querySelectorAll<HTMLElement>('[data-how-screen]'));
    const counted = new Set<number>();

    const activate = (index: number) => {
        steps.forEach((step, i) => {
            step.toggleAttribute('data-active', i === index);
            step.toggleAttribute('data-done', i < index);
        });
        screens.forEach((screen, i) => screen.toggleAttribute('data-active', i === index));
        if (!counted.has(index)) {
            counted.add(index);
            countIn(steps[index]?.querySelector('.how-num'), index + 1);
        }
    };
    activate(0);

    if (reducedMotion()) {
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) activate(steps.indexOf(entry.target as HTMLElement));
                }
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        steps.forEach((step) => io.observe(step));
        return;
    }

    const { gsap, ScrollTrigger } = await import('../smooth');
    const list = section.querySelector<HTMLElement>('.how-steps')!;
    const bar = section.querySelector<HTMLElement>('[data-how-progress]');

    steps.forEach((step, i) => {
        ScrollTrigger.create({
            trigger: step,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => self.isActive && activate(i),
        });
    });

    if (bar) {
        gsap.set(list, { '--how-progress': 0 });
        gsap.to(list, {
            '--how-progress': 1,
            ease: 'none',
            scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: true },
        });
    }
}

function countIn(el: Element | null | undefined, to: number): void {
    if (!el || reducedMotion()) return;
    const start = performance.now();
    const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 500);
        el.textContent = String(Math.round(t * to)).padStart(2, '0');
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
