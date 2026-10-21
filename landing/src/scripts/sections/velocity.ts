import { reducedMotion, whenVisible } from '../motion';

/**
 * Kinetic word band: two rows drift in opposite directions; scrolling speeds
 * them up and skews them slightly, then they settle. Paused off-screen.
 */
export async function initVelocity(): Promise<void> {
    const band = document.querySelector<HTMLElement>('[data-velocity]');
    if (!band || reducedMotion()) return;

    const { gsap, ScrollTrigger } = await import('../smooth');
    const rows = Array.from(band.querySelectorAll<HTMLElement>('[data-velocity-row]')).map((el) => ({
        el,
        dir: Number(el.dataset.velocityRow ?? 1),
        x: 0,
        width: el.scrollWidth / (el.dataset.velocityRow === '-1' ? 3 : 2),
    }));

    let boost = 0;
    let skew = 0;
    let visible = false;
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
        const dt = deltaMs / 1000;
        boost *= 0.92;
        skew *= 0.9;
        for (const row of rows) {
            row.x -= row.dir * (40 + boost * 40) * dt;
            // Wrap seamlessly: the row content is repeated.
            if (row.x <= -row.width) row.x += row.width;
            if (row.x > 0) row.x -= row.width;
            row.el.style.transform = `translate3d(${row.x.toFixed(1)}px, 0, 0) skewX(${(skew * row.dir).toFixed(2)}deg)`;
        }
    });
}
