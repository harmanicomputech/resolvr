import { spring } from './motion';

/** Soft glow that trails the pointer with spring lag and grows over interactive elements. */
export function initCursor(): void {
    const glow = document.querySelector<HTMLElement>('[data-cursor]');
    if (!glow) return;

    const { stiffness, damping, mass } = spring.follow;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    const vel = { x: 0, y: 0 };
    let running = false;
    let last = 0;

    const step = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
        last = now;
        for (const axis of ['x', 'y'] as const) {
            const force = -stiffness * (pos[axis] - target[axis]) - damping * vel[axis];
            vel[axis] += (force / mass) * dt;
            pos[axis] += vel[axis] * dt;
        }
        glow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        const settled =
            Math.abs(pos.x - target.x) < 0.1 && Math.abs(pos.y - target.y) < 0.1 && Math.hypot(vel.x, vel.y) < 0.1;
        if (settled) running = false;
        else requestAnimationFrame(step);
    };

    window.addEventListener(
        'pointermove',
        (event) => {
            if (event.pointerType !== 'mouse') return;
            target.x = event.clientX;
            target.y = event.clientY;
            glow.setAttribute('data-active', '');
            if (!running) {
                running = true;
                last = performance.now();
                requestAnimationFrame(step);
            }
        },
        { passive: true },
    );

    document.addEventListener('pointerover', (event) => {
        const interactive = (event.target as Element).closest('a, button, summary, input, [data-tile]');
        glow.toggleAttribute('data-hover', Boolean(interactive));
    });
    document.documentElement.addEventListener('pointerleave', () => glow.removeAttribute('data-active'));
}
