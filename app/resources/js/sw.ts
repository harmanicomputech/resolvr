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

/**
 * Web Share Target: a screenshot shared from another app arrives as a POST.
 * The vault is locked inside the worker (it never has the key), so the files
 * wait in a private cache until the app is unlocked, which then encrypts them
 * into the vault and deletes the cache (see app/lib/ingest.ts).
 */
const SHARE_INBOX = 'resolvr-share-inbox';
registerRoute(
    ({ url, request }) => url.pathname === '/share-target' && request.method === 'POST',
    async ({ request }) => {
        try {
            const form = await request.formData();
            const cache = await caches.open(SHARE_INBOX);
            const files = form.getAll('files').filter((f): f is File => f instanceof File);
            await Promise.all(
                files.map((file, i) =>
                    cache.put(
                        `/share-inbox/${Date.now()}-${i}`,
                        new Response(file, {
                            headers: {
                                'content-type': file.type || 'application/octet-stream',
                                'x-file-name': encodeURIComponent(file.name),
                            },
                        }),
                    ),
                ),
            );
        } catch {
            // Nothing usable was shared; open the vault anyway.
        }
        return Response.redirect('/vault?shared=1', 303);
    },
    'POST',
);
