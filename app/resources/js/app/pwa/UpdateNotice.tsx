import { useEffect, useRef } from 'react';

import { useToast } from '../components/toaster';

/**
 * Registers the service worker and shows a calm "Update available" toast when
 * a new version is ready. Reloading applies it; nothing updates mid-task.
 */
export function UpdateNotice() {
    const toast = useToast();
    const started = useRef(false);

    useEffect(() => {
        if (started.current || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
        started.current = true;
        // Registered by hand: the worker lives at the site root (/sw.js), not under /build/.
        void import('workbox-window').then(({ Workbox }) => {
            const wb = new Workbox('/sw.js', { scope: '/' });
            wb.addEventListener('waiting', () => {
                toast({
                    title: 'Update available',
                    description: 'A new version of Resolvr is ready.',
                    tone: 'info',
                    duration: 0,
                    action: {
                        label: 'Reload',
                        onClick: () => {
                            wb.addEventListener('controlling', () => window.location.reload());
                            wb.messageSkipWaiting();
                        },
                    },
                });
            });
            void wb.register();
        });
    }, [toast]);

    return null;
}
