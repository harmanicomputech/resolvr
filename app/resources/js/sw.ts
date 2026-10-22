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
 * - Share target (evidence shared from other apps) and reminder pushes.
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
        denylist: [/^\/api\//, /^\/s\//, /^\/install$/, /^\/cron\//, /^\/waitlist\//, /^\/up$/, /^\/design$/, /^\/share-target$/],
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

/**
 * Reminders. Pushes arrive empty (the server knows nothing to say), so the
 * words are chosen here from a plaintext preference in IndexedDB `meta`:
 * plain, or disguised as a generic note when the user asked for that or
 * stealth mode is on. Nothing about incidents is ever shown.
 */
function readMeta(key: string): Promise<unknown> {
    return new Promise((resolve) => {
        const open = indexedDB.open('resolvr');
        open.onerror = () => resolve(undefined);
        // No database yet: do not create an empty one here.
        open.onupgradeneeded = () => open.transaction?.abort();
        open.onsuccess = () => {
            const db = open.result;
            try {
                const get = db.transaction('meta', 'readonly').objectStore('meta').get(key);
                get.onsuccess = () => resolve((get.result as { value?: unknown } | undefined)?.value);
                get.onerror = () => resolve(undefined);
            } catch {
                resolve(undefined); // no vault on this device yet
            } finally {
                db.close();
            }
        };
    });
}

self.addEventListener('push', (event) => {
    event.waitUntil(
        (async () => {
            const [style, stealth] = await Promise.all([readMeta('reminderStyle'), readMeta('stealth')]);
            const disguised = style === 'disguised' || stealth === true;
            const icon = disguised ? '/icons/calculator-192.png' : '/icons/resolvr-192.png';
            await self.registration.showNotification(disguised ? 'Reminder' : 'Resolvr', {
                body: disguised
                    ? 'Time to jot down today’s notes.'
                    : 'A quiet moment to note anything from today, while it is fresh.',
                icon,
                badge: icon,
                tag: 'resolvr-reminder',
                silent: false,
            });
        })(),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
            if (open) await open.focus();
            else await self.clients.openWindow('/');
        })(),
    );
});
