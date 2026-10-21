import { reducedMotion, whenVisible } from '../motion';

/**
 * Kinetic word band: two rows drift in opposite directions; scrolling speeds
 * them up and skews them slightly, then they settle. Starts only when the band
 * is near the viewport, pauses off-screen, and never forces a layout read.
 */
export function initVelocity(): void {
    const band = document.querySelector<HTMLElement>('[data-velocity]');
    if (!band || reducedMotion()) return;

    const near = new IntersectionObserver(
        ([entry]) => {
            if (!entry?.isIntersecting) return;
            near.disconnect();
            void start(band);
        },
        { rootMargin: '50% 0px' },
    );
    near.observe(band);
}

async function start(band: HTMLElement): Promise<void> {
    const { gsap, ScrollTrigger } = await import('../smooth');

    const rows = Array.from(band.querySelectorAll<HTMLElement>('[data-velocity-row]')).map((el) => ({
        el,
        dir: Number(el.dataset.velocityRow ?? 1),
        // The content is repeated (2x top, 3x bottom); wrap after one copy.
        copies: el.dataset.velocityRow === '-1' ? 3 : 2,
        width: 0,
        x: 0,
    }));

    // Widths arrive asynchronously from ResizeObserver: no forced synchronous layout.
    const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const row = rows.find((r) => r.el === entry.target);
            if (row) row.width = entry.contentRect.width / row.copies;
        }
    });
    rows.forEach((row) => ro.observe(row.el));

    let boost = 0;
    let skew = 0;
    let visible = true;
    whenVisible(band, (v) => (visible = v), '100px');

    ScrollTrigger.create({
        trigger: band,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
            boost = Math.min(18, Math.abs(self.getVelocity()) / 120);
            skew = gsap.utils.clamp(-8, 8, self.getVelocity() / -250);
        },
    });

    gsap.ticker.add((_time, deltaMs) => {
        if (!visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        boost *= 0.92;
        skew *= 0.9;
        for (const row of rows) {
            if (!row.width) continue;
            row.x -= row.dir * (40 + boost * 40) * dt;
            if (row.x <= -row.width) row.x += row.width;
            if (row.x > 0) row.x -= row.width;
            row.el.style.transform = `translate3d(${row.x.toFixed(1)}px, 0, 0) skewX(${(skew * row.dir).toFixed(2)}deg)`;
        }
    });
}
