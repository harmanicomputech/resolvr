import { finePointer, reducedMotion } from '../motion';

/** A gentle tilt of the phone toward the pointer. Everything else in the hero is CSS. */
export function initHero(): void {
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    const stage = hero?.querySelector<HTMLElement>('[data-tilt]');
    if (!hero || !stage || reducedMotion() || !finePointer()) return;

    let frame = 0;
    hero.addEventListener('pointermove', (event) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const rect = hero.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width - 0.5;
            const ny = (event.clientY - rect.top) / rect.height - 0.5;
            stage.style.setProperty('--ry', (-8 + nx * 10).toFixed(2));
            stage.style.setProperty('--rx', (4 - ny * 6).toFixed(2));
        });
    });
    hero.addEventListener('pointerleave', () => {
        stage.style.removeProperty('--rx');
        stage.style.removeProperty('--ry');
    });
}
