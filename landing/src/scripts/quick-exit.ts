/**
 * Quick exit: leave instantly for a neutral page. location.replace() swaps the
 * current history entry, so Back does not return here. Earlier entries in the
 * tab's history can't be removed by a web page; the footer says so plainly.
 */
export const NEUTRAL_URL = 'https://www.google.com/search?q=weather';

export function quickExit(): void {
    try {
        document.title = 'Weather';
        document.body.replaceChildren();
    } catch {
        // Navigation below is what matters.
    }
    window.location.replace(NEUTRAL_URL);
}

/** Escape triggers quick exit unless it is closing something (menu, dialog). */
export function shouldExitOnEscape(event: KeyboardEvent, doc: Document = document): boolean {
    if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return false;
    return !doc.querySelector('.mobile-menu[data-open="true"], dialog[open]');
}

export function initQuickExit(): void {
    document.querySelectorAll<HTMLElement>('[data-quick-exit]').forEach((button) => {
        button.addEventListener('click', quickExit);
    });
    document.addEventListener('keydown', (event) => {
        if (shouldExitOnEscape(event)) quickExit();
    });
}
