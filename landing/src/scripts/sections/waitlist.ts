import { reducedMotion } from '../motion';

const APP_URL = (import.meta.env.VITE_APP_URL || 'https://app.resolvrapp.com').replace(/\/$/, '');

export type WaitlistResult = { ok: true } | { ok: false; message: string };

/** Loose client-side check; the server validates properly. */
export function validEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export async function submitWaitlist(
    email: string,
    company: string,
    fetcher: typeof fetch = fetch,
): Promise<WaitlistResult> {
    try {
        const response = await fetcher(`${APP_URL}/api/waitlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email: email.trim(), company, source: location.pathname }),
            credentials: 'omit',
            mode: 'cors',
        });
        if (response.ok) return { ok: true };
        if (response.status === 422) return { ok: false, message: 'Please check your email address and try again.' };
        if (response.status === 429)
            return { ok: false, message: 'Too many attempts. Please wait a minute and try again.' };
        return { ok: false, message: "We couldn't add you just now. Please try again shortly." };
    } catch {
        return { ok: false, message: "You seem to be offline. Please try again when you're connected." };
    }
}

/**
 * Waitlist form: inline validation, optimistic success (check draws straight
 * away), rolled back with a calm message if the server says no.
 */
export function initWaitlist(): void {
    document.querySelectorAll<HTMLFormElement>('[data-waitlist]').forEach((form) => {
        const input = form.querySelector<HTMLInputElement>('input[type="email"]')!;
        const honeypot = form.querySelector<HTMLInputElement>('input[name="company"]');
        const error = form.querySelector<HTMLElement>('[data-waitlist-error]')!;
        const success = form.querySelector<HTMLElement>('[data-waitlist-success]')!;
        const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

        const showError = (message: string) => {
            error.textContent = message;
            input.setAttribute('aria-invalid', message ? 'true' : 'false');
        };

        input.addEventListener('blur', () => {
            if (input.value && !validEmail(input.value)) showError('That email address looks incomplete.');
        });
        input.addEventListener('input', () => {
            if (error.textContent && validEmail(input.value)) showError('');
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!validEmail(input.value)) {
                showError('Enter an email address, like name@example.com.');
                input.focus();
                return;
            }
            showError('');
            button.disabled = true;

            // Optimistic: show success now.
            form.setAttribute('data-state', 'success');
            success.hidden = false;
            celebrate(form);

            const result = await submitWaitlist(input.value, honeypot?.value ?? '');
            button.disabled = false;
            if (!result.ok) {
                form.removeAttribute('data-state');
                success.hidden = true;
                showError(result.message);
                input.focus();
            }
        });
    });
}

/** A brief, small burst in brand colours. Skipped entirely under reduced motion. */
function celebrate(form: HTMLElement): void {
    const canvas = form.querySelector<HTMLCanvasElement>('[data-confetti]');
    if (!canvas || reducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const styles = getComputedStyle(document.documentElement);
    const colours = ['--aurora-1', '--aurora-2', '--aurora-3'].map((name) => styles.getPropertyValue(name).trim());
    const pieces = Array.from({ length: 48 }, () => ({
        x: w * 0.15,
        y: h * 0.5,
        vx: 120 + Math.random() * 260,
        vy: -260 - Math.random() * 260,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 10,
        s: 4 + Math.random() * 4,
        c: colours[Math.floor(Math.random() * colours.length)] ?? 'white',
    }));

    const start = performance.now();
    let last = start;
    const frame = (now: number) => {
        const dt = (now - last) / 1000;
        last = now;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, w, h);
        for (const p of pieces) {
            p.vy += 700 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.r += p.vr * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - t / 1.4);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.r);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
            ctx.restore();
        }
        if (t < 1.4) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(frame);
}
