<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="robots" content="noindex, nofollow">
        <meta name="color-scheme" content="dark light">
        <meta name="csp-nonce" content="{{ Vite::cspNonce() }}">
        <meta name="theme-color" content="#f7f5f0" data-theme-color>
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Resolvr" data-app-title>
        {{-- Swapped for the calculator set when stealth mode is on (resources/js/app/pwa/stealth.ts). --}}
        <link rel="manifest" href="/manifest.webmanifest" data-manifest>
        <link rel="icon" href="/icons/resolvr-32.png" sizes="32x32" data-favicon>
        <link rel="apple-touch-icon" href="/icons/resolvr-apple-180.png" data-touch-icon>

        <title inertia>{{ config('app.name', 'Resolvr') }}</title>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="antialiased">
        @inertia
    </body>
</html>
