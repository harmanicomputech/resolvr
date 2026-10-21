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
    'desk-conversation': { alt: 'Two coworkers talking across a desk, one with his back to the camera' },
    'panel-interview': { alt: 'A man sitting across a table from two colleagues in a bright office' },
    'hr-meeting': { alt: 'An employee talking with an HR representative across a desk' },
    'writing-notes': { alt: 'A woman at her desk writing notes on a clipboard', portrait: true },
    'laptop-overhead': { alt: 'Three colleagues seen from above, looking at a laptop together' },
    'laptop-review': { alt: 'Two people reviewing something on a laptop in a quiet room' },
    'document-review': { alt: 'Two colleagues going through papers in a folder', portrait: true },
    'team-briefing': { alt: 'A team listening as a colleague presents a document' },
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
