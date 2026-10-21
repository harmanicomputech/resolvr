/** Navbar: compact + blurred after 40px, hides on scroll down, returns on scroll up. */
export function initNav(): void {
    const nav = document.querySelector<HTMLElement>('[data-nav]');
    if (!nav) return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
        ticking = false;
        const y = window.scrollY;
        nav.toggleAttribute('data-scrolled', y > 40);

        const menuOpen = document.documentElement.hasAttribute('data-menu-open');
        const focused = nav.contains(document.activeElement);
        const goingDown = y > lastY + 4;
        const goingUp = y < lastY - 4;
        if (goingDown && y > 160 && !menuOpen && !focused) nav.setAttribute('data-hidden', '');
        else if (goingUp || y <= 160) nav.removeAttribute('data-hidden');
        lastY = y;
    };

    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        },
        { passive: true },
    );
    nav.addEventListener('focusin', () => nav.removeAttribute('data-hidden'));
    update();
}

/** Aurora hairline showing how far through the page you are. */
export function initProgress(): void {
    const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
    if (!bar) return;
    let ticking = false;
    const update = () => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty('--progress', String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        },
        { passive: true },
    );
    window.addEventListener('resize', update, { passive: true });
    update();
}
