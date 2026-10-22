<?php

namespace App\Providers;

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
        //
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
    }
}
