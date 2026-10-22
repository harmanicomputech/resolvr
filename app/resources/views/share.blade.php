<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <meta name="referrer" content="no-referrer">
        <meta name="color-scheme" content="light dark">
        <link rel="icon" href="/icons/resolvr-32.png" sizes="32x32">
        <title>Shared record · Resolvr</title>
        @vite(['resources/css/app.css', 'resources/js/share-viewer.ts'])
    </head>
    {{-- Read-only attorney share (P3.2). Everything is decrypted in this browser; see share-viewer.ts. --}}
    <body class="antialiased bg-bg text-fg">
        <main id="share" data-share-id="{{ $id }}" class="mx-auto max-w-3xl px-4 py-8 sm:py-12" aria-live="polite">
            <p class="text-sm text-fg-muted">Opening the shared record…</p>
        </main>
        <noscript><p class="p-6 text-center">This page needs JavaScript to decrypt the record in your browser.</p></noscript>
    </body>
</html>
