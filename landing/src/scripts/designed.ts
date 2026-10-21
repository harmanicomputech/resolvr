import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { finePointer } from './motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Signature interactions (loaded with effects.ts, never under reduced motion):
 * hero spotlight, magnetic buttons, the live phone, the pinned statement,
 * the scroll-story stepper, self-drawing icons, card edge glow, custom cursor
 * and the footer wordmark.
 */
export async function initDesigned(): Promise<void> {
    const steps = [livePhone, statement, stepper, drawIcons, footerMark];
    if (finePointer()) steps.push(heroSpot, magnetic, cardGlow, cursor);
    // One small task at a time so set-up never blocks input.
    for (const step of steps) {
        step();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
}

function heroSpot(): void {
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    const spot = hero?.querySelector<HTMLElement>('[data-hero-spot]');
    if (!hero || !spot) return;
    const x = gsap.quickTo(spot, '--sx', { duration: 0.8, ease: 'power3.out' });
    const y = gsap.quickTo(spot, '--sy', { duration: 0.8, ease: 'power3.out' });
    gsap.set(spot, { '--sx': 70, '--sy': 35 });
    hero.addEventListener('pointermove', (event) => {
        const rect = hero.getBoundingClientRect();
        x(((event.clientX - rect.left) / rect.width) * 100);
        y(((event.clientY - rect.top) / rect.height) * 100);
    });
}

function magnetic(): void {
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        el.addEventListener('pointermove', (event) => {
            const rect = el.getBoundingClientRect();
            x((event.clientX - rect.left - rect.width / 2) * 0.3);
            y((event.clientY - rect.top - rect.height / 2) * 0.4);
        });
        el.addEventListener('pointerleave', () =>
            gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' }),
        );
    });
}

/** The hero phone behaves like the real app: bars grow, numbers count, new incidents arrive. */
function livePhone(): void {
    const phone = document.querySelector<HTMLElement>('[data-live-phone]');
    if (!phone) return;
    const list = phone.querySelector<HTMLElement>('.screen-list');
    const toast = phone.querySelector<HTMLElement>('[data-phone-toast]');
    const values = Array.from(phone.querySelectorAll<HTMLElement>('.screen-value'));

    window.setTimeout(() => {
        phone.setAttribute('data-live', '');
        values.forEach((el) => {
            const target = Number(el.textContent);
            const v = { n: 0 };
            gsap.to(v, {
                n: target,
                duration: 1.6,
                ease: 'power3.out',
                onUpdate: () => (el.textContent = String(Math.round(v.n))),
            });
        });
    }, 600);

    if (!list || !toast) return;
    const incidents = [
        ['Mocked in group chat', 'high'],
        ['Leave request refused', 'medium'],
        ['Shouted at in corridor', 'critical'],
        ['Left off team email', 'low'],
    ] as const;
    let next = 15;
    let i = 0;
    let visible = true;
    new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting))).observe(phone);

    window.setInterval(() => {
        if (!visible || document.hidden) return;
        const [title, severity] = incidents[i++ % incidents.length]!;
        const id = `INC-0${next++}`;
        const row = document.createElement('li');
        row.setAttribute('data-enter', '');
        row.setAttribute('data-new', '');
        row.innerHTML = `<span class="mono"></span><span></span><span class="sev" data-severity="${severity}"></span>`;
        const [idEl, titleEl, sevEl] = Array.from(row.children) as HTMLElement[];
        idEl!.textContent = id;
        titleEl!.textContent = title;
        sevEl!.textContent =
            severity === 'critical'
                ? 'Crit'
                : severity === 'medium'
                  ? 'Med'
                  : severity[0]!.toUpperCase() + severity.slice(1);
        list.prepend(row);
        list.lastElementChild?.remove();
        requestAnimationFrame(() => row.removeAttribute('data-enter'));
        window.setTimeout(() => row.removeAttribute('data-new'), 1600);

        const label = toast.querySelector('b');
        if (label) label.textContent = id;
        toast.setAttribute('data-show', '');
        window.setTimeout(() => toast.removeAttribute('data-show'), 1800);
    }, 4200);
}

/** Pinned statement: each word lights up as you scroll; key words light in the accent. */
function statement(): void {
    const section = document.querySelector<HTMLElement>('[data-statement]');
    const text = section?.querySelector<HTMLElement>('[data-statement-text]');
    if (!section || !text) return;

    const content = text.textContent ?? '';
    text.textContent = '';
    // Screen readers get one clean sentence; the animated words are hidden from them.
    const plain = document.createElement('span');
    plain.className = 'sr-only';
    plain.textContent = content;
    text.append(plain);
    const keys = new Set(['timestamped.', 'encrypted.', 'visible.', 'ready.']);
    const words = content.split(/\s+/).map((word) => {
        const span = document.createElement('span');
        span.className = 'lw';
        span.setAttribute('aria-hidden', 'true');
        if (keys.has(word)) span.setAttribute('data-key', '');
        span.textContent = word;
        text.append(span, document.createTextNode(' '));
        return span;
    });

    gsap.set(words, { '--lit': '0%' });
    gsap.to(words, {
        '--lit': '100%',
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=140%',
            scrub: 0.5,
            pin: section.querySelector('.statement-pin'),
            anticipatePin: 1,
        },
    });
}

/** How it works: steps scroll by while the phone stays put and changes screen. */
function stepper(): void {
    const section = document.querySelector<HTMLElement>('[data-how]');
    if (!section) return;
    const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-how-step]'));
    const screens = Array.from(section.querySelectorAll<HTMLElement>('[data-how-screen]'));
    const rail = section.querySelector<HTMLElement>('.how-steps');

    const activate = (index: number) => {
        steps.forEach((s, i) => s.toggleAttribute('data-active', i === index));
        screens.forEach((s, i) => s.toggleAttribute('data-active', i === index));
    };
    activate(0);

    steps.forEach((step, i) =>
        ScrollTrigger.create({
            trigger: step,
            start: 'top 60%',
            end: 'bottom 60%',
            onToggle: (self) => self.isActive && activate(i),
        }),
    );

    if (rail) {
        gsap.fromTo(
            rail,
            { '--how-progress': 0 },
            {
                '--how-progress': 1,
                ease: 'none',
                scrollTrigger: { trigger: rail, start: 'top 60%', end: 'bottom 80%', scrub: true },
            },
        );
    }

    // The phone floats gently while you read.
    const device = section.querySelector('.how-device');
    if (device) {
        gsap.fromTo(
            device,
            { rotate: -3, y: 30 },
            {
                rotate: 3,
                y: -30,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
            },
        );
    }
}

/** Icons draw their strokes the first time they scroll into view. */
function drawIcons(): void {
    const badges = Array.from(document.querySelectorAll<HTMLElement>('.icon-badge')).filter(
        (b) => !b.closest('.hero, .screen'),
    );
    badges.forEach((badge) => {
        badge.setAttribute('data-draw-icon', '');
        badge
            .querySelectorAll('path, line, polyline, rect, circle, ellipse, polygon')
            .forEach((shape) => shape.setAttribute('pathLength', '1'));
    });
    ScrollTrigger.batch(badges, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => batch.forEach((b, i) => window.setTimeout(() => b.setAttribute('data-drawn', ''), i * 90)),
    });
}

function cardGlow(): void {
    document
        .querySelectorAll<HTMLElement>('.icon-card, .stat-card, .price-card, .see-col, .founder-card')
        .forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
                card.style.setProperty('--my', `${event.clientY - rect.top}px`);
            });
        });
}

function cursor(): void {
    const root = document.querySelector<HTMLElement>('[data-cursor]');
    const dot = root?.querySelector<HTMLElement>('.cursor-dot');
    const ring = root?.querySelector<HTMLElement>('.cursor-ring');
    if (!root || !dot || !ring) return;

    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
    gsap.set([dot, ring], { x: -100, y: -100 });

    window.addEventListener(
        'pointermove',
        (event) => {
            if (event.pointerType !== 'mouse') return;
            gsap.set(dot, { x: event.clientX, y: event.clientY });
            ringX(event.clientX);
            ringY(event.clientY);
            root.removeAttribute('data-hidden');
        },
        { passive: true },
    );
    document.addEventListener('pointerover', (event) => {
        root.toggleAttribute(
            'data-hover',
            Boolean((event.target as Element).closest('a, button, summary, input, [data-tile]')),
        );
    });
    document.documentElement.addEventListener('pointerleave', () => root.setAttribute('data-hidden', ''));
}

function footerMark(): void {
    const mark = document.querySelector<HTMLElement>('[data-footer-mark]');
    if (!mark) return;
    gsap.fromTo(
        mark,
        { yPercent: 45, letterSpacing: '0.02em' },
        {
            yPercent: 0,
            letterSpacing: '-0.06em',
            ease: 'none',
            scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true },
        },
    );
}
