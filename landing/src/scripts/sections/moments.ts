import { finePointer, reducedMotion } from '../motion';

/**
 * "Moments" gallery. Desktop with motion: the section pins and vertical scroll
 * drives the track sideways, each photo slides inside its frame (parallax),
 * cards tilt toward the pointer. Touch or reduced motion: a native swipeable row.
 */
export async function initMoments(): Promise<void> {
    const section = document.querySelector<HTMLElement>('[data-moments]');
    if (!section) return;
    const track = section.querySelector<HTMLElement>('[data-moments-track]')!;
    const progress = section.querySelector<HTMLElement>('[data-moments-progress]');

    if (finePointer() && !reducedMotion()) initTilt(section);

    if (reducedMotion()) {
        track.addEventListener(
            'scroll',
            () => setProgress(progress, track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)),
            { passive: true },
        );
        return;
    }

    const { gsap } = await import('../smooth');
    const mm = gsap.matchMedia();

    mm.add('(min-width: 48rem)', () => {
        section.setAttribute('data-pinned', '');
        const distance = () => track.scrollWidth - window.innerWidth;

        const tween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: () => `+=${distance()}`,
                pin: section.querySelector('.moments-pin'),
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => setProgress(progress, self.progress),
            },
        });

        // Each photo drifts inside its frame as its card crosses the viewport.
        gsap.utils.toArray<HTMLElement>('.moment-img', section).forEach((img) => {
            gsap.fromTo(
                img,
                { xPercent: -7 },
                {
                    xPercent: 7,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: img.closest('.moment'),
                        containerAnimation: tween,
                        start: 'left right',
                        end: 'right left',
                        scrub: true,
                    },
                },
            );
        });

        return () => section.removeAttribute('data-pinned');
    });

    mm.add('(max-width: 47.99rem)', () => {
        const onScroll = () =>
            setProgress(progress, track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth));
        track.addEventListener('scroll', onScroll, { passive: true });
        return () => track.removeEventListener('scroll', onScroll);
    });
}

function setProgress(bar: HTMLElement | null, value: number): void {
    bar?.parentElement?.style.setProperty('--moments-progress', String(Math.min(1, Math.max(0, value))));
}

function initTilt(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-tilt-card]').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width;
            const ny = (event.clientY - rect.top) / rect.height;
            card.style.setProperty('--ry', ((nx - 0.5) * 8).toFixed(2));
            card.style.setProperty('--rx', ((0.5 - ny) * 6).toFixed(2));
            card.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
            card.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
        });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--rx', '0');
            card.style.setProperty('--ry', '0');
        });
    });
}
