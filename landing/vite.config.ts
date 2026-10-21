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

/** Serve /story as /story.html in dev, matching the .htaccess rewrite in production. */
function cleanUrls(): Plugin {
    return {
        name: 'resolvr:clean-urls',
        configureServer(server) {
            server.middlewares.use((req, _res, next) => {
                const url = req.url?.split('?')[0] ?? '/';
                if (url !== '/' && !url.includes('.') && existsSync(resolve(pagesDir, `${url.slice(1)}.html`))) {
                    req.url = `${url}.html`;
                }
                next();
            });
        },
    };
}

/** Preload the display serif (hero LCP text) so it is usually ready before first paint. */
function preloadFonts(): Plugin {
    return {
        name: 'resolvr:preload-fonts',
        apply: 'build',
        transformIndexHtml: {
            order: 'post',
            handler(_html, ctx) {
                const files = Object.keys(ctx.bundle ?? {}).filter((f) => /instrument-serif-latin-400-(normal|italic).*\.woff2$/.test(f));
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
