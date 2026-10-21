import Alpine from '@alpinejs/csp';

import { rollTo } from './roll';

/*
 * Alpine's CSP build: no inline expressions, so every component is registered
 * here and markup only references property and method names.
 */

interface MenuData {
    open: boolean;
    readonly expanded: string;
    toggle(): void;
    close(): void;
    $el: HTMLElement;
}

Alpine.data('menu', () => ({
    open: false,

    get expanded() {
        return String(this.open);
    },

    toggle(this: MenuData) {
        if (this.open) this.close();
        else setMenu(this, true);
    },

    close(this: MenuData) {
        if (this.open) setMenu(this, false);
    },
}));

function setMenu(data: MenuData, open: boolean): void {
    data.open = open;
    const menu = document.getElementById('mobile-menu');
    const toggle = document.querySelector<HTMLElement>('.menu-toggle');
    if (!menu) return;
    menu.toggleAttribute('inert', !open);
    document.documentElement.toggleAttribute('data-menu-open', open);
    window.dispatchEvent(new CustomEvent('resolvr:scroll-lock', { detail: open }));
    // Wait for Alpine to apply data-open (the menu is visibility: hidden until then).
    void Alpine.nextTick(() => {
        if (open) menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
        else toggle?.focus({ preventScroll: true });
    });
}

Alpine.data('pricing', () => ({
    period: 'monthly' as 'monthly' | 'yearly',

    setPeriod(this: { period: string; $el: HTMLElement }, event: Event) {
        const button = event.currentTarget as HTMLElement;
        const period = button.dataset.period === 'yearly' ? 'yearly' : 'monthly';
        if (period === this.period) return;
        this.period = period;

        const root = button.closest('.pricing') ?? document;
        root.querySelectorAll<HTMLElement>('[data-period]').forEach((b) =>
            b.setAttribute('aria-pressed', String(b === button)),
        );
        root.querySelectorAll<HTMLElement>('.price-amount').forEach((amount) => {
            const value = Number(amount.dataset[period] ?? 0);
            rollTo(amount, value);
            const label = amount.parentElement?.querySelector('[data-period-label]');
            if (label) label.textContent = value === 0 ? 'forever' : period === 'yearly' ? '/ year' : '/ month';
        });
    },
}));

/** Start Alpine when the browser is idle (or on first tap, whichever comes first). */
export function initAlpine(): void {
    window.Alpine = Alpine;
    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        Alpine.start();
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    idle(start, { timeout: 1500 });
    document.addEventListener('pointerdown', start, { once: true, capture: true });
    document.addEventListener('keydown', start, { once: true, capture: true });
}

declare global {
    interface Window {
        Alpine: typeof Alpine;
    }
}
