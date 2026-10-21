import { duration, ease, reducedMotion } from '../motion';

/** Smooth height animation for native <details>. Works without JS as plain disclosure. */
export function initFaq(): void {
    if (reducedMotion()) return;

    document.querySelectorAll<HTMLDetailsElement>('[data-faq] details').forEach((details) => {
        const summary = details.querySelector('summary');
        const body = details.querySelector<HTMLElement>('.faq-body');
        if (!summary || !body) return;
        let running: Animation | null = null;
        const easing = `cubic-bezier(${ease.outExpo.join(',')})`;

        summary.addEventListener('click', (event) => {
            event.preventDefault();
            running?.cancel();

            if (!details.open) {
                details.open = true;
                const h = body.scrollHeight;
                running = body.animate(
                    { height: ['0px', `${h}px`], opacity: [0, 1] },
                    { duration: duration.base * 1000, easing },
                );
            } else {
                const h = body.offsetHeight;
                running = body.animate(
                    { height: [`${h}px`, '0px'], opacity: [1, 0] },
                    { duration: duration.fast * 1000, easing },
                );
                running.onfinish = () => (details.open = false);
            }
        });
    });
}
