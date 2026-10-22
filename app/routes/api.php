<?php

use App\Http\Controllers\BackupController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

// Public API used by the marketing site (resolvrapp.com). CORS: config/cors.php.
Route::post('/waitlist', [WaitlistController::class, 'store'])
    ->middleware('throttle:waitlist')
    ->name('waitlist.store');

// End-to-end encrypted backups (P2.12): ciphertext only, bearer token from the recovery phrase.
Route::middleware('throttle:backups')->prefix('backups/{id}')->where(['id' => '[0-9a-f]{32}'])->group(function () {
    Route::get('/', [BackupController::class, 'show']);
    Route::get('/content', [BackupController::class, 'content']);
    Route::delete('/', [BackupController::class, 'destroy']);
    Route::post('/uploads', [BackupController::class, 'begin']);
    Route::put('/uploads/{upload}/{index}', [BackupController::class, 'chunk'])->whereNumber('index');
    Route::post('/uploads/{upload}/complete', [BackupController::class, 'complete']);
});

// Web push reminder schedules (P2.12).
Route::get('/reminders/key', [ReminderController::class, 'key']);
Route::middleware('throttle:reminders')->where(['id' => '[0-9a-f]{32}'])->group(function () {
    Route::put('/reminders/{id}', [ReminderController::class, 'upsert']);
    Route::delete('/reminders/{id}', [ReminderController::class, 'destroy']);
});

// Read-only attorney shares (P3.2): ciphertext only; the key lives in the link's #fragment.
Route::post('/shares', [ShareController::class, 'create'])->middleware('throttle:shares');
Route::middleware('throttle:backups')->prefix('shares/{id}')->where(['id' => '[0-9a-f]{32}'])->group(function () {
    Route::get('/', [ShareController::class, 'show']);
    Route::delete('/', [ShareController::class, 'revoke']);
    Route::put('/uploads/{upload}/{index}', [ShareController::class, 'chunk'])->whereNumber('index');
    Route::post('/uploads/{upload}/complete', [ShareController::class, 'complete']);
});
Route::get('/shares/{id}/content', [ShareController::class, 'content'])
    ->where('id', '[0-9a-f]{32}')
    ->middleware('throttle:share-views');
