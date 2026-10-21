/**
 * Photo registry for the {{photo}} Handlebars helper. Files live in
 * src/assets/photos as <name>-<width>.webp (generated from the originals,
 * metadata stripped). Width/height attributes prevent layout shift.
 */

interface Photo {
    alt: string;
    portrait?: boolean;
}

export const photos: Record<string, Photo> = {
    'team-meeting': { alt: 'Four colleagues in a tense discussion around a meeting table' },
    'writing-notes': { alt: 'A woman at her desk writing notes on a clipboard', portrait: true },
};

const widths = (p: Photo) => (p.portrait ? [480, 960, 1280] : [640, 1280, 1920]);

interface Options {
    sizes?: string;
    class?: string;
    eager?: boolean;
    /** Empty alt for purely decorative uses. */
    decorative?: boolean;
    depth?: string | number;
}

export function renderPhoto(name: string, options: Options = {}): string {
    const photo = photos[name];
    if (!photo) throw new Error(`Unknown photo: ${name}`);
    const ws = widths(photo);
    const src = (w: number) => `../assets/photos/${name}-${w}.webp`;
    const largest = ws[ws.length - 1]!;
    const height = Math.round(photo.portrait ? largest * 1.5 : largest / 1.5);
    const attrs = [
        `src="${src(ws[1]!)}"`,
        `srcset="${ws.map((w) => `${src(w)} ${w}w`).join(', ')}"`,
        `sizes="${options.sizes ?? '(min-width: 64rem) 50vw, 100vw'}"`,
        `width="${largest}"`,
        `height="${height}"`,
        `alt="${options.decorative ? '' : photo.alt}"`,
        `loading="${options.eager ? 'eager' : 'lazy'}"`,
        `decoding="async"`,
        options.class ? `class="${options.class}"` : '',
        options.depth !== undefined ? `data-depth="${options.depth}"` : '',
    ];
    return `<img ${attrs.filter(Boolean).join(' ')} />`;
}
