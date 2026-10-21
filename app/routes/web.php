<?php

use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('home'))->name('home');

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
