/** Fade-and-rise for [data-reveal] elements as they enter, staggered among siblings. */
export function initReveal(): void {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!items.length) return;

    const io = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const el = entry.target as HTMLElement;
                const siblings = el.parentElement
                    ? Array.from(el.parentElement.querySelectorAll(':scope > [data-reveal]'))
                    : [];
                el.style.setProperty('--reveal-delay', `${Math.max(0, siblings.indexOf(el)) * 60}ms`);
                el.setAttribute('data-revealed', '');
                io.unobserve(el);
            }
        },
        { rootMargin: '0px 0px -10% 0px' },
    );
    items.forEach((item) => io.observe(item));
}
