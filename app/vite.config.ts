import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/share-viewer.ts'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        // The service worker and manifest are built here and written to public/,
        // so the host serves them as static files at the site root (scope "/").
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'sw.ts',
            outDir: 'public',
            base: '/',
            scope: '/',
            buildBase: '/build/',
            injectRegister: false,
            registerType: 'prompt',
            // The manifests are static files in public/ (manifest.webmanifest and the
            // stealth manifest-calculator.webmanifest), swapped at runtime by pwa/stealth.ts.
            manifest: false,
            injectManifest: {
                globDirectory: 'public/build',
                globPatterns: ['**/*.{js,css,woff2,png,svg,webp,wasm}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                // Files live under /build/ but the worker is served from the root.
                modifyURLPrefix: { '': '/build/' },
            },
            devOptions: { enabled: false },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
