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
    }
}
