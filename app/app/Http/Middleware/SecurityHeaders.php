<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds a strict Content Security Policy and the standard hardening headers.
 *
 * Scripts and styles emitted by @vite carry a per-request nonce, so no inline
 * script runs unless Laravel rendered it.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        $headers = $response->headers;
        $headers->set('Content-Security-Policy', $this->contentSecurityPolicy($nonce));
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('Referrer-Policy', 'no-referrer');
        $headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $headers->set('Permissions-Policy', implode(', ', [
            'camera=(self)',
            'microphone=(self)',
            'geolocation=()',
            'payment=()',
            'usb=()',
            'interest-cohort=()',
        ]));

        if ($request->isSecure() && app()->isProduction()) {
            $headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        }

        return $response;
    }

    private function contentSecurityPolicy(string $nonce): string
    {
        $scriptSrc = ["'self'", "'nonce-{$nonce}'", "'wasm-unsafe-eval'"];
        $styleSrc = ["'self'", "'nonce-{$nonce}'"];
        // data: lets the PDF layout engine load its WebAssembly; a data: URL cannot send anything anywhere.
        $connectSrc = ["'self'", 'data:'];

        // The Vite dev server injects styles and talks over a websocket.
        if (Vite::isRunningHot()) {
            $hot = rtrim((string) file_get_contents(Vite::hotFile()));
            $ws = preg_replace('#^http#', 'ws', $hot);
            $scriptSrc[] = $hot;
            $styleSrc = ["'self'", "'unsafe-inline'", $hot];
            $connectSrc = [...$connectSrc, $hot, $ws];
        }

        $directives = [
            'default-src' => ["'self'"],
            'script-src' => $scriptSrc,
            'style-src' => $styleSrc,
            'img-src' => ["'self'", 'data:', 'blob:'],
            'media-src' => ["'self'", 'blob:'],
            'font-src' => ["'self'"],
            'connect-src' => $connectSrc,
            'worker-src' => ["'self'", 'blob:'],
            'manifest-src' => ["'self'"],
            'object-src' => ["'none'"],
            'base-uri' => ["'self'"],
            'form-action' => ["'self'"],
            'frame-ancestors' => ["'none'"],
        ];

        $policy = collect($directives)
            ->map(fn (array $sources, string $directive) => $directive.' '.implode(' ', $sources))
            ->implode('; ');

        return app()->isProduction() ? $policy.'; upgrade-insecure-requests' : $policy;
    }
}
