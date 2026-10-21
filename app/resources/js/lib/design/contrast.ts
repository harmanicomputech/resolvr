/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours. */

export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb {
    const value = hex.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`Not a #rrggbb colour: ${hex}`);
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

function channel(c: number): number {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
    const [l1, l2] = [luminance(parseHex(a)), luminance(parseHex(b))].sort((x, y) => y - x) as [number, number];
    return (l1 + 0.05) / (l2 + 0.05);
}

/** Alpha-composite `fg` at `alpha` over `bg` (both #rrggbb) and return #rrggbb. */
export function mix(fg: string, bg: string, alpha: number): string {
    const f = parseHex(fg);
    const b = parseHex(bg);
    return (
        '#' +
        f
            .map((c, i) => Math.round(c * alpha + b[i]! * (1 - alpha)))
            .map((c) => c.toString(16).padStart(2, '0'))
            .join('')
    );
}
