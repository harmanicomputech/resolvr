/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

/**
 * Resolvr service worker.
 *
 * - Precaches the built app (JS, CSS, fonts, icons).
 * - Every page is the same app shell (client-side routing), so navigations
 *   try the network and fall back to the cached shell when offline.
 * - Never caches API responses: AI drafts and backups are always live.
 * - Share target and push handlers are added by later features.
 */
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

const SHELL_CACHE = 'resolvr-shell-v1';
const SHELL_URL = '/';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.add(new Request(SHELL_URL, { credentials: 'same-origin' }))),
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

/** Network first with a short timeout, then the cached shell. */
async function shell({ request }: { request: Request }): Promise<Response> {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await Promise.race([
            fetch(request),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            void cache.put(SHELL_URL, response.clone());
        }
        return response;
    } catch {
        const cached = await cache.match(SHELL_URL);
        return cached ?? Response.error();
    }
}

registerRoute(
    new NavigationRoute(shell, {
        // Server-handled pages that are not the app.
        denylist: [/^\/api\//, /^\/waitlist\//, /^\/up$/, /^\/design$/, /^\/share-target$/],
    }),
);

// Icons and manifests rarely change; serve from cache.
registerRoute(({ url }) => url.pathname.startsWith('/icons/'), new CacheFirst({ cacheName: 'resolvr-icons' }));
