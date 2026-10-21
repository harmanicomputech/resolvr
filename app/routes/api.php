<?php

use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

// Public API used by the marketing site (resolvrapp.com). CORS: config/cors.php.
Route::post('/waitlist', [WaitlistController::class, 'store'])
    ->middleware('throttle:waitlist')
    ->name('waitlist.store');
