/**
 * Ambient aurora: a small fragment shader on a low-resolution canvas.
 * Runs at ~30fps, pauses off-screen and in background tabs, and simply never
 * starts if WebGL is unavailable (the CSS glow underneath remains).
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 r;
uniform float t;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform vec3 bg;

float n(vec2 p){ return sin(p.x) * sin(p.y); }
float fbm(vec2 p){
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
}

void main(){
    vec2 uv = gl_FragCoord.xy / r;
    vec2 p = vec2(uv.x * r.x / r.y, uv.y) * 2.2;
    float s = t * 0.05;
    float f1 = fbm(p + vec2(s, -s * 0.7) + fbm(p * 0.8 - s));
    float f2 = fbm(p * 1.3 + vec2(-s * 0.6, s) + 3.1);
    float band = smoothstep(0.15, 0.95, uv.y + 0.25 * f1);
    vec3 col = mix(c1, c2, smoothstep(-0.4, 0.6, f1));
    col = mix(col, c3, smoothstep(-0.2, 0.8, f2) * 0.7);
    float glow = (0.55 + 0.45 * f1) * band * (1.0 - uv.y * 0.35);
    vec3 outc = mix(bg, col, clamp(glow * 0.55, 0.0, 0.6));
    gl_FragColor = vec4(outc, 1.0);
}`;

function cssColor(name: string): [number, number, number] {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const rgb = getComputedStyle(probe)
        .color.match(/[\d.]+/g)
        ?.map(Number) ?? [0, 0, 0];
    probe.remove();
    return [rgb[0]! / 255, rgb[1]! / 255, rgb[2]! / 255];
}

export function startAurora(canvas: HTMLCanvasElement): () => void {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return () => {};

    const compile = (type: number, src: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform3fv(u('c1'), cssColor('--aurora-1'));
    gl.uniform3fv(u('c2'), cssColor('--aurora-2'));
    gl.uniform3fv(u('c3'), cssColor('--aurora-3'));
    gl.uniform3fv(u('bg'), cssColor('--bg'));
    const uRes = u('r');
    const uTime = u('t');

    // Render at half resolution: the aurora is soft, so nobody can tell.
    const resize = () => {
        const scale = 0.5;
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let visible = true;
    let frame = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (!visible || document.hidden || now - last < 33) return;
        last = now;
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.setAttribute('data-ready', '');
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
