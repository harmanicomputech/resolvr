<?php

namespace App\Providers;

use App\Backups\BackupStore;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(BackupStore::class, fn () => BackupStore::fromConfig());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The waitlist is public: a handful of attempts per minute, a cap per day.
        RateLimiter::for('waitlist', fn (Request $request) => [
            Limit::perMinute(5)->by('waitlist-min:'.$request->ip()),
            Limit::perDay(50)->by('waitlist-day:'.$request->ip()),
        ]);

        // AI drafting costs money per call and has no accounts behind it, so it is
        // limited per address: a few drafts an hour is plenty for real use.
        RateLimiter::for('ai', fn (Request $request) => [
            Limit::perHour(12)->by('ai-hour:'.$request->ip()),
            Limit::perDay(40)->by('ai-day:'.$request->ip()),
        ]);

        // Backups move in 4 MB chunks, so allow a steady stream per address
        // while keeping guessing at ids and tokens pointless.
        RateLimiter::for('backups', fn (Request $request) => [
            Limit::perMinute(120)->by('backups-min:'.$request->ip()),
            Limit::perDay(3000)->by('backups-day:'.$request->ip()),
        ]);

        RateLimiter::for('shares', fn (Request $request) => Limit::perHour(30)->by('shares:'.$request->ip()));
        RateLimiter::for('share-views', fn (Request $request) => Limit::perMinute(20)->by('share-views:'.$request->ip()));

        RateLimiter::for('install', fn (Request $request) => Limit::perMinute(10)->by('install:'.$request->ip()));
        RateLimiter::for('webcron', fn (Request $request) => Limit::perMinute(6)->by('webcron:'.$request->ip()));

        RateLimiter::for('reminders', fn (Request $request) => Limit::perMinute(10)->by('reminders:'.$request->ip()));
    }
}
