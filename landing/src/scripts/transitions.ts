import { duration, ease, reducedMotion } from './motion';

/**
 * Page transitions. Browsers with cross-document View Transitions use the CSS
 * in main.css; others get a short Motion fade on leave and enter.
 */
export async function initPageTransitions(): Promise<void> {
    const crossDocument =
        typeof (globalThis as { CSSViewTransitionRule?: unknown }).CSSViewTransitionRule !== 'undefined';
    if (crossDocument || reducedMotion()) return;

    // Only browsers without cross-document view transitions download Motion.
    const { animate } = await import('motion');
    const main = document.getElementById('main');
    if (main)
        animate(
            main,
            { opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'] },
            { duration: duration.slow, ease: ease.outExpo },
        );

    document.addEventListener('click', (event) => {
        const link = (event.target as Element).closest('a');
        if (!link || !main || event.defaultPrevented || event.button !== 0) return;
        if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            link.target ||
            link.hasAttribute('download')
        )
            return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;

        event.preventDefault();
        animate(main, { opacity: 0, filter: 'blur(6px)' }, { duration: duration.fast, ease: ease.inOutQuart }).then(
            () => {
                location.href = url.href;
            },
        );
    });

    // Restore if the page comes back from the back/forward cache.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && main) main.style.cssText = '';
    });
}
