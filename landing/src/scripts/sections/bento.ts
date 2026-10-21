/**
 * Bento tiles: cursor spotlight, demos that loop while hovered (desktop) or
 * play once when scrolled into view (touch).
 */
export function initBento(): void {
    const tiles = document.querySelectorAll<HTMLElement>('[data-tile]');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    tiles.forEach((tile) => {
        tile.addEventListener('pointermove', (event) => {
            const rect = tile.getBoundingClientRect();
            tile.style.setProperty('--mx', `${event.clientX - rect.left}px`);
            tile.style.setProperty('--my', `${event.clientY - rect.top}px`);
        });

        if (hover) {
            tile.addEventListener('pointerenter', () => tile.setAttribute('data-playing', ''));
            tile.addEventListener('pointerleave', () => tile.removeAttribute('data-playing'));
            tile.addEventListener('focusin', () => tile.setAttribute('data-playing', ''));
            tile.addEventListener('focusout', () => tile.removeAttribute('data-playing'));
        }
    });

    if (!hover) {
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.setAttribute('data-playing', 'once');
                    io.unobserve(entry.target);
                }
            },
            { threshold: 0.55 },
        );
        tiles.forEach((tile) => io.observe(tile));
    }
}
