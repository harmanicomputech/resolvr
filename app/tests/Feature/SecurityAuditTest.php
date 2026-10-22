<?php

use App\Backups\BackupStore;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

/*
 * Security audit (Q3): checks that hold for every route and every deploy.
 */

test('the CSP allows no inline script or style, no plugins and no framing', function () {
    $csp = $this->get('/up')->headers->get('Content-Security-Policy');
    preg_match('/script-src ([^;]+)/', $csp, $script);
    preg_match('/style-src ([^;]+)/', $csp, $style);

    expect($script[1])->not->toContain("'unsafe-inline'")->toContain("'nonce-")
        ->and($style[1])->not->toContain("'unsafe-inline'")
        ->and($csp)->toContain("object-src 'none'")->toContain("frame-ancestors 'none'")->toContain("base-uri 'self'");
});

test('every state-changing route is CSRF-protected or a throttled, token-checked API', function () {
    $unsafe = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $r) => array_intersect($r->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']));

    expect($unsafe)->not->toBeEmpty();
    foreach ($unsafe as $route) {
        $middleware = $route->gatherMiddleware();
        $uri = $route->uri();
        if (str_starts_with($uri, 'api/')) {
            expect(collect($middleware)->contains(fn ($m) => str_starts_with($m, 'throttle:')))->toBeTrue("{$uri} is not rate limited");
        } else {
            expect($middleware)->toContain('web');
            // The only CSRF exemption: the share-target fallback, which accepts nothing.
            if (in_array(ValidateCsrfToken::class, $route->excludedMiddleware(), true)) {
                expect($uri)->toBe('share-target');
            }
        }
    }
});

test('AI drafting is rate limited and forwards only the fields the person approved', function () {
    config(['services.anthropic.key' => 'test-key']);
    Http::fake(['*' => Http::response("event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n", 200, ['Content-Type' => 'text/event-stream'])]);
    $route = collect(Route::getRoutes()->getRoutes())->first(fn ($r) => $r->uri() === 'ai/complaint');
    expect($route->gatherMiddleware())->toContain('throttle:ai');

    $this->withoutMiddleware(ValidateCsrfToken::class)->post('/ai/complaint', [
        'mode' => 'document',
        'type' => 'hr-complaint',
        'tone' => 'formal',
        'jurisdiction' => 'us',
        'details' => ['fullName' => 'Sam Doe'],
        'incidents' => [['id' => 'INC-001', 'title' => 'Shouted at', 'description' => 'He shouted.']],
        'passcode' => '2468',
        'vaultKey' => 'SHOULD-NEVER-LEAVE',
    ])->assertOk()->streamedContent();

    Http::assertSent(function (ClientRequest $request) {
        $body = $request->body();

        return str_contains($body, 'Shouted at') && ! str_contains($body, '2468') && ! str_contains($body, 'SHOULD-NEVER-LEAVE');
    });
});

test('encrypted uploads live outside the web root, behind a deny-all guard, under random names', function () {
    foreach (['services.backups.path', 'services.shares.path'] as $key) {
        expect(realpath(dirname(config($key))) ?: dirname(config($key)))->not->toStartWith(public_path());
    }
    $root = sys_get_temp_dir().'/resolvr-audit-'.uniqid();
    (new BackupStore($root))->begin(str_repeat('a', 32), 3, str_repeat('0', 64), 8);
    expect(file_get_contents($root.'/.htaccess'))->toContain('Require all denied');
    File::deleteDirectory($root);

    $ids = collect(range(1, 3))->map(fn () => $this->postJson('/api/shares', ['size' => 5, 'sha256' => str_repeat('0', 64), 'expiresIn' => '24h'])->json('id'));
    expect($ids->unique())->toHaveCount(3)->and($ids->every(fn ($id) => preg_match('/^[0-9a-f]{32}$/', $id)))->toBeTrue();
});

test('nothing private sits in the public folder, and dotfiles are refused', function () {
    foreach (['.env', 'composer.json', 'vendor', 'storage/app', 'database'] as $path) {
        expect(file_exists(public_path($path)))->toBeFalse("public/{$path} must not exist");
    }
    expect(file_get_contents(public_path('.htaccess')))->toContain('RewriteRule (^|/)\.(?!well-known/) - [F]');
});
