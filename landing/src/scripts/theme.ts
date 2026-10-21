/**
 * Light is the default. The toggle switches to dark and remembers the choice;
 * public/theme-init.js applies it before first paint on the next visit.
 */
const KEY = 'resolvr-theme';

export function initThemeToggle(): void {
    const root = document.documentElement;
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');

    const sync = () => {
        const dark = root.classList.contains('dark');
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(dark)));
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07090d' : '#f7f5f0');
    };

    buttons.forEach((button) =>
        button.addEventListener('click', () => {
            const dark = !root.classList.contains('dark');
            // Briefly enable colour transitions so the switch feels smooth, not jarring.
            root.classList.add('theme-transition');
            root.classList.toggle('dark', dark);
            window.setTimeout(() => root.classList.remove('theme-transition'), 400);
            try {
                localStorage.setItem(KEY, dark ? 'dark' : 'light');
            } catch {
                // Private mode: the choice lasts for this page only.
            }
            sync();
        }),
    );
    sync();
}
