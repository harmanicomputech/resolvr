/*
 * Resolvr privacy policy: small enhancements only. The page reads fully
 * without JavaScript.
 *
 * Edit COMPANY once: it fills the operator's legal name, address, email and
 * the effective date wherever the page shows them.
 */
const COMPANY = {
    // e.g. 'Example Holdings LLC'. Leave empty to say "a Texas limited liability company".
    legalEntity: '',
    // e.g. '123 Main St, Austin, TX 78701, USA'. Leave empty to omit.
    address: '',
    email: 'resolvrapp@resolvrapp.com',
    effective: '7 November 2026',
};

(() => {
    const fill = (name, fn) => document.querySelectorAll(`[data-fill="${name}"]`).forEach(fn);

    fill('effective', (el) => (el.textContent = COMPANY.effective));
    fill('email-link', (el) => {
        el.textContent = COMPANY.email;
        el.href = `mailto:${COMPANY.email}`;
    });
    if (COMPANY.legalEntity) {
        fill('entity-sentence', (el) => {
            el.textContent = `is operated as a DBA of ${COMPANY.legalEntity}, a Texas limited liability company${COMPANY.address ? `, ${COMPANY.address}` : ''}.`;
        });
    }
    if (COMPANY.address) fill('address-line', (el) => (el.textContent = ` Post: ${COMPANY.address}.`));

    // Theme: follows the device until the reader chooses, then remembers it.
    const root = document.documentElement;
    const toggle = document.querySelector('[data-theme-toggle]');
    let saved = null;
    try {
        saved = localStorage.getItem('resolvr-policy-theme');
    } catch {}
    const apply = (dark) => {
        root.classList.toggle('dark', dark);
        toggle.setAttribute('aria-pressed', String(dark));
        toggle.textContent = dark ? 'Light mode' : 'Dark mode';
    };
    apply(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    toggle.addEventListener('click', () => {
        const dark = !root.classList.contains('dark');
        apply(dark);
        try {
            localStorage.setItem('resolvr-policy-theme', dark ? 'dark' : 'light');
        } catch {}
    });

    // Contents: highlight the section being read.
    const links = new Map([...document.querySelectorAll('.toc a')].map((a) => [a.getAttribute('href').slice(1), a]));
    const observer = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                links.forEach((a) => a.removeAttribute('aria-current'));
                links.get(e.target.id)?.setAttribute('aria-current', 'true');
            }
        },
        { rootMargin: '0px 0px -70% 0px' },
    );
    document.querySelectorAll('.policy section').forEach((s) => observer.observe(s));

    // Back to top, after scrolling a while.
    const top = document.querySelector('.to-top');
    addEventListener('scroll', () => (top.hidden = scrollY < 800), { passive: true });

    document.querySelector('[data-print]').addEventListener('click', () => print());
})();
