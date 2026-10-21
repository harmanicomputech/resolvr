import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import handlebars from 'vite-plugin-handlebars';

import { renderIcon } from './build/icons';
import { renderPhoto } from './build/photos';
import { jsonLd, sitemap } from './build/seo';
import * as content from './src/content';
import { pages, site } from './src/pages.config';

const here = fileURLToPath(new URL('.', import.meta.url));
const pagesDir = resolve(here, 'src/pages');

/**
 * Internal links. Production uses clean URLs (/security, /#features), which the
 * .htaccess rewrites to the .html files. LINK_STYLE=relative (used for previews
 * hosted outside the domain) emits relative .html links that work anywhere.
 */
const relativeLinks = process.env.LINK_STYLE === 'relative';

export function link(page: string, hash?: unknown): string {
    const anchor = typeof hash === 'string' ? `#${hash}` : '';
    if (relativeLinks) return `${page}.html${anchor}`;
    return page === 'index' ? `/${anchor}` : `/${page}${anchor}`;
}

/** Serve /story as /story.html in dev and preview, matching the .htaccess rewrite in production. */
function cleanUrls(): Plugin {
    const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
        const url = req.url?.split('?')[0] ?? '/';
        const page = url.replace(/^\/|\/$/g, '');
        if (page && !page.includes('.') && existsSync(resolve(pagesDir, `${page}.html`))) {
            req.url = `/${page}.html${req.url?.slice(url.length) ?? ''}`;
        }
        next();
    };
    return {
        name: 'resolvr:clean-urls',
        configureServer(server) {
            server.middlewares.use(rewrite);
        },
        configurePreviewServer(server) {
            server.middlewares.use(rewrite);
        },
    };
}

/** Preload Inter (body) and Poppins 600 (headlines, including the LCP) so they are usually ready before first paint. */
function preloadFonts(): Plugin {
    return {
        name: 'resolvr:preload-fonts',
        apply: 'build',
        transformIndexHtml: {
            order: 'post',
            handler(_html, ctx) {
                const files = Object.keys(ctx.bundle ?? {}).filter((f) => /(inter-latin-wght-normal|poppins-latin-600-normal).*\.woff2$/.test(f));
                return files.map((f) => ({
                    tag: 'link',
                    attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${f}`, crossorigin: '' },
                    injectTo: 'head-prepend' as const,
                }));
            },
        },
    };
}

/** Emit sitemap.xml from the page list. */
function sitemapPlugin(): Plugin {
    return {
        name: 'resolvr:sitemap',
        apply: 'build',
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
        },
    };
}

export default defineConfig({
    root: pagesDir,
    publicDir: resolve(here, 'public'),
    envDir: here,
    plugins: [
        cleanUrls(),
        handlebars({
            partialDirectory: [resolve(here, 'src/partials'), resolve(here, 'src/partials/sections')],
            context(pagePath) {
                const name = pagePath.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                return {
                    site,
                    page: { ...pages[name], name, jsonLd: jsonLd(name) },
                    year: new Date().getFullYear(),
                    ...content,
                };
            },
            helpers: {
                icon: (name: string, className?: unknown) => renderIcon(name, typeof className === 'string' ? className : undefined),
                photo: (name: string, options: { hash?: Record<string, unknown> }) =>
                    renderPhoto(name, (options?.hash ?? {}) as Parameters<typeof renderPhoto>[1]),
                link: (page: string, hash: unknown) => link(page, hash),
                inc: (value: number) => value + 1,
                pad: (value: number) => String(value + 1).padStart(2, '0'),
                eq: (a: unknown, b: unknown) => a === b,
                json: (value: unknown) => JSON.stringify(value),
            },
        }),
        tailwindcss(),
        preloadFonts(),
        sitemapPlugin(),
    ],
    server: {
        port: 5174,
        // Allow importing the shared tokens and fonts from ../app.
        fs: { allow: [resolve(here, '..')] },
    },
    build: {
        outDir: resolve(here, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: Object.fromEntries(Object.keys(pages).map((name) => [name, resolve(pagesDir, `${name}.html`)])),
        },
    },
});
