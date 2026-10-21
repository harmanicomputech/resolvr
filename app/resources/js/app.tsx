import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { setNonce } from 'get-nonce';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

// Radix (via react-remove-scroll) injects a <style> tag; give it the CSP nonce.
const nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;
if (nonce) setNonce(nonce);

const appName = import.meta.env.VITE_APP_NAME || 'Resolvr';

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    // The built-in bar injects an inline <style>, which our CSP blocks. A token-styled one comes with the app shell.
    progress: false,
});
