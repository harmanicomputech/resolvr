<?php

use App\Backups\BackupStore;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// DirectAdmin runs `schedule:run` from cron every minute and has no long-lived
// workers, so the scheduler drains the database queue (e.g. waitlist emails).
Schedule::command('queue:work --stop-when-empty --tries=3 --max-time=50')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Web push reminders (no payload; see App\Push) and tidying of unfinished backup uploads.
Schedule::command('reminders:send')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => BackupStore::fromConfig()->pruneUploads())->daily()->name('prune-backup-uploads');
Schedule::command('shares:prune')->hourly();
