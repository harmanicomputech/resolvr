import { icons } from 'lucide';

type IconNode = [tag: string, attrs: Record<string, string | number>][];

function toPascal(name: string): string {
    return name.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());
}

/** Render a Lucide icon to an inline SVG string at build time (1.5px stroke, decorative by default). */
export function renderIcon(name: string, className = 'size-5'): string {
    const node = (icons as Record<string, IconNode>)[toPascal(name)];
    if (!node) throw new Error(`Unknown Lucide icon: ${name}`);
    const children = node
        .map(
            ([tag, attrs]) =>
                `<${tag} ${Object.entries(attrs)
                    .map(([k, v]) => `${k}="${v}"`)
                    .join(' ')}/>`,
        )
        .join('');
    return `<svg class="lucide ${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${children}</svg>`;
}
