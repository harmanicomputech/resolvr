/** Highlight the table-of-contents entry for the section being read. */
export function initToc(): void {
    const toc = document.querySelector<HTMLElement>('[data-toc]');
    if (!toc) return;
    const links = new Map<string, HTMLAnchorElement>();
    toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => links.set(a.hash.slice(1), a));

    const io = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                links.forEach((a) => a.removeAttribute('aria-current'));
                links.get(entry.target.id)?.setAttribute('aria-current', 'true');
            }
        },
        { rootMargin: '-15% 0px -75% 0px' },
    );
    links.forEach((_, id) => {
        const heading = document.getElementById(id);
        if (heading) io.observe(heading);
    });
}
