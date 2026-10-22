<?php

namespace App\Http\Controllers;

use App\Backups\BackupStore;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * The scheduler for hosts without a command line. A request to
 * /cron/{CRON_TOKEN} (every minute) runs the same jobs as `schedule:run`,
 * in this PHP process rather than as separate CLI processes, and within a
 * short time budget so it fits typical web request limits.
 */
class WebCronController extends Controller
{
    public function __invoke(string $token): Response
    {
        $expected = (string) config('resolvr.cron_token');
        abort_if($expected === '' || ! hash_equals($expected, $token), 404);

        $lock = Cache::lock('webcron:running', 55);
        if (! $lock->get()) {
            return response('busy', 202);
        }
        $ran = [];
        try {
            // Waitlist emails and other queued work.
            $this->run($ran, 'queue', fn () => Artisan::call('queue:work', [
                '--stop-when-empty' => true, '--max-time' => 20, '--tries' => 3,
            ]));
            $this->run($ran, 'reminders', fn () => Artisan::call('reminders:send'));
            if (Cache::add('webcron:hourly', true, 3600)) {
                $this->run($ran, 'shares', fn () => Artisan::call('shares:prune'));
            }
            if (Cache::add('webcron:daily', true, 86400)) {
                $this->run($ran, 'uploads', fn () => BackupStore::fromConfig()->pruneUploads());
            }
            Cache::forever('webcron:last', now()->toIso8601String());
        } finally {
            $lock->release();
        }

        return response('ok '.implode(',', $ran), 200, ['Content-Type' => 'text/plain', 'Cache-Control' => 'no-store']);
    }

    /** @param list<string> $ran */
    private function run(array &$ran, string $name, callable $job): void
    {
        try {
            $job();
            $ran[] = $name;
        } catch (Throwable $e) {
            report($e);
            $ran[] = "{$name}:failed";
        }
    }
}
