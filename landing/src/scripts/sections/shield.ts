import { whenVisible } from '../motion';

/** Rings turn slowly (paused off-screen) and lock into place once the shield is centred. */
export function initShield(): void {
    const shield = document.querySelector<HTMLElement>('.shield');
    if (!shield) return;

    whenVisible(shield, (visible) => shield.toggleAttribute('data-paused', !visible));

    const lock = new IntersectionObserver(
        ([entry]) => {
            if (entry?.isIntersecting) {
                shield.setAttribute('data-locked', '');
                lock.disconnect();
            }
        },
        { rootMargin: '-35% 0px -35% 0px' },
    );
    lock.observe(shield);
}
