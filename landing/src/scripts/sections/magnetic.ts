/** Buttons lean toward the pointer a few pixels, springing back on leave. */
export async function initMagnetic(): Promise<void> {
    const { gsap } = await import('../smooth');

    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        el.addEventListener('pointermove', (event) => {
            const rect = el.getBoundingClientRect();
            x((event.clientX - rect.left - rect.width / 2) * 0.25);
            y((event.clientY - rect.top - rect.height / 2) * 0.35);
        });
        el.addEventListener('pointerleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
        });
    });
}
