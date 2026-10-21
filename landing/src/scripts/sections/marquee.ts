import { whenVisible } from '../motion';

/** Pause the marquee off-screen, and give it a real pause control (WCAG 2.2.2). */
export function initMarquee(): void {
    const marquee = document.querySelector<HTMLElement>('[data-marquee]');
    const toggle = document.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
    if (!marquee) return;

    let userPaused = false;
    const apply = (visible = true) => marquee.toggleAttribute('data-paused', userPaused || !visible);

    whenVisible(marquee, apply);
    toggle?.addEventListener('click', () => {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.querySelector('[data-label]')!.textContent = userPaused ? 'Play' : 'Pause';
        apply();
    });
}
