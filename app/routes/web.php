<?php

use App\Http\Controllers\AiDocumentController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\WaitlistController;
use App\Http\Controllers\WebCronController;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Inertia\Inertia;

// Signed links from the waitlist confirmation email.
Route::middleware('signed')->group(function () {
    Route::get('/waitlist/unsubscribe/{signup}', [WaitlistController::class, 'confirmUnsubscribe'])->name('waitlist.unsubscribe');
    Route::post('/waitlist/unsubscribe/{signup}', [WaitlistController::class, 'unsubscribe']);
});
Route::get('/waitlist/unsubscribed', [WaitlistController::class, 'unsubscribed'])->name('waitlist.unsubscribed');

// Design system review page. Never registered outside local development.
if (app()->environment('local')) {
    Route::get('/design', fn () => Inertia::render('design'))->name('design');
}

// AI drafting: only the fields the person chose to send, streamed back as
// server-sent events. Rate limited per address; nothing is stored or logged.
Route::post('/ai/complaint', AiDocumentController::class)
    ->middleware('throttle:ai')
    ->name('ai.complaint');

// Share target fallback: normally the service worker handles this POST and
// keeps the files on the device. Without it (first visit, unsupported
// browser) nothing is accepted here; the person is sent to the vault.
Route::post('/share-target', fn () => redirect('/vault?shared=unavailable', 303))
    ->withoutMiddleware(ValidateCsrfToken::class)
    ->name('share-target');

// Read-only attorney share viewer (P3.2): a minimal page that decrypts in the browser.
Route::get('/s/{id}', [ShareController::class, 'page'])->where('id', '[0-9a-f]{32}')->name('share');

// Hosting without a command line: browser-based setup and a cron URL (off unless their tokens are set).
Route::middleware('throttle:install')->group(function () {
    Route::get('/install', [InstallController::class, 'show']);
    Route::post('/install', [InstallController::class, 'run']);
});
Route::get('/cron/{token}', WebCronController::class)
    ->middleware('throttle:webcron')
    ->withoutMiddleware([StartSession::class, ShareErrorsFromSession::class, ValidateCsrfToken::class]);

// The app: one shell for every path. Screens are routed on the device so the
// app works offline; the server never sees which screen is open.
Route::get('/{path?}', fn () => Inertia::render('app'))
    ->where('path', '^(?!api/|ai/|waitlist/|build/|icons/|ocr/|storage/|s/|install$|cron/|up$|design$).*$')
    ->name('app');
