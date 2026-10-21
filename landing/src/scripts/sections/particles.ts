/** Slow-drifting particle field. Few particles, low frame rate, pauses off-screen. */
export function startParticles(canvas: HTMLCanvasElement, count = 70): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const color = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || 'white';

    const dots = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 0.004,
        vy: -0.002 - Math.random() * 0.006,
        a: 0.15 + Math.random() * 0.45,
    }));

    let visible = true;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        ctx.clearRect(0, 0, w, h);
        for (const d of dots) {
            d.x = (d.x + d.vx * dt + 1) % 1;
            d.y = (d.y + d.vy * dt + 1) % 1;
            ctx.globalAlpha = d.a;
            ctx.beginPath();
            ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    };
    frame = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([entry]) => (visible = Boolean(entry?.isIntersecting)));
    io.observe(canvas);

    return () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
    };
}
