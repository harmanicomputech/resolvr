import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import handlebars from 'vite-plugin-handlebars';

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

export default defineConfig({
    root: pagesDir,
    publicDir: resolve(here, 'public'),
    plugins: [
        cleanUrls(),
        handlebars({
            partialDirectory: resolve(here, 'src/partials'),
            context(pagePath) {
                const name = pagePath.replace(/^\//, '').replace(/\.html$/, '') || 'index';
                return { site, page: pages[name], year: new Date().getFullYear() };
            },
        }),
        tailwindcss(),
    ],
    server: {
        port: 5174,
        // Allow importing the shared tokens from ../app.
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
