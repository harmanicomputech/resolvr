<?php

namespace App\Http\Controllers;

use App\Push\Vapid;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Throwable;

/**
 * /install: set-up and upkeep from the browser, for hosting without a command
 * line. Shows what is ready, runs database migrations, and makes the keys for
 * reminders. Protected by INSTALL_TOKEN; off when that is empty.
 */
class InstallController extends Controller
{
    private const EXTENSIONS = ['bcmath', 'ctype', 'fileinfo', 'mbstring', 'openssl', 'pdo_mysql', 'tokenizer', 'xml', 'sodium'];

    public function show(): View
    {
        $this->enabled();

        return view('install', ['authorised' => false, 'checks' => [], 'output' => null, 'vapid' => null]);
    }

    public function run(Request $request): View
    {
        $this->enabled();
        $data = $request->validate(['token' => ['required', 'string'], 'action' => ['nullable', 'in:check,migrate,vapid,clear']]);
        if (! hash_equals((string) config('resolvr.install_token'), $data['token'])) {
            return view('install', ['authorised' => false, 'checks' => [], 'output' => 'That setup token is not right.', 'vapid' => null]);
        }

        $output = null;
        $vapid = null;
        try {
            match ($data['action'] ?? 'check') {
                'migrate' => $output = $this->artisan('migrate', ['--force' => true]),
                'clear' => $output = $this->artisan('optimize:clear'),
                'vapid' => $vapid = Vapid::generate(),
                default => null,
            };
        } catch (Throwable $e) {
            report($e);
            $output = 'That did not work: '.$e->getMessage();
        }

        return view('install', ['authorised' => true, 'checks' => $this->checks(), 'output' => $output, 'vapid' => $vapid, 'token' => $data['token']]);
    }

    /** @param array<string, mixed> $options */
    private function artisan(string $command, array $options = []): string
    {
        Artisan::call($command, $options);

        return trim(Artisan::output()) ?: 'Done.';
    }

    /** @return list<array{label: string, ok: bool|null, detail: string}> */
    private function checks(): array
    {
        $checks = [
            ['label' => 'PHP 8.3 or newer', 'ok' => version_compare(PHP_VERSION, '8.3.0', '>='), 'detail' => PHP_VERSION],
        ];
        $missing = array_values(array_filter(self::EXTENSIONS, fn ($e) => ! extension_loaded($e)));
        $checks[] = ['label' => 'PHP extensions', 'ok' => $missing === [], 'detail' => $missing ? 'Missing: '.implode(', ', $missing) : 'All present'];
        $checks[] = ['label' => 'Storage is writable', 'ok' => is_writable(storage_path()) && is_writable(base_path('bootstrap/cache')), 'detail' => storage_path()];
        $checks[] = ['label' => 'APP_KEY is set', 'ok' => (bool) config('app.key'), 'detail' => config('app.key') ? 'Set' : 'Add APP_KEY to .env'];
        $checks[] = ['label' => 'Debug mode off', 'ok' => ! config('app.debug'), 'detail' => config('app.debug') ? 'Set APP_DEBUG=false' : 'Off'];

        try {
            DB::connection()->getPdo();
            $pending = $this->pendingMigrations();
            $checks[] = ['label' => 'Database connection', 'ok' => true, 'detail' => config('database.default')];
            $checks[] = ['label' => 'Database is up to date', 'ok' => $pending === 0, 'detail' => $pending ? "{$pending} migration(s) to run" : 'Yes'];
        } catch (Throwable $e) {
            $checks[] = ['label' => 'Database connection', 'ok' => false, 'detail' => 'Check DB_* in .env ('.class_basename($e).')'];
        }

        $last = Cache::get('webcron:last');
        $checks[] = ['label' => 'Scheduled jobs running', 'ok' => $last ? now()->diffInMinutes($last, true) < 10 : null, 'detail' => $last ? "Last run {$last}" : 'Not seen yet (set up the cron URL)'];
        $checks[] = ['label' => 'Email', 'ok' => config('mail.default') !== 'log', 'detail' => (string) config('mail.default')];
        $checks[] = ['label' => 'AI drafting (optional)', 'ok' => config('services.anthropic.key') ? true : null, 'detail' => config('services.anthropic.key') ? 'Key set' : 'Not set: drafting says it is not available'];
        $checks[] = ['label' => 'Reminders (optional)', 'ok' => Vapid::fromConfig() ? true : null, 'detail' => Vapid::fromConfig() ? 'Keys set' : 'Not set: use "Make reminder keys" below'];

        return $checks;
    }

    private function pendingMigrations(): int
    {
        $migrator = app('migrator');
        if (! $migrator->repositoryExists()) {
            return count($migrator->getMigrationFiles(database_path('migrations')));
        }
        $ran = $migrator->getRepository()->getRan();

        return count(array_diff(array_keys($migrator->getMigrationFiles(database_path('migrations'))), $ran));
    }

    private function enabled(): void
    {
        abort_if((string) config('resolvr.install_token') === '', 404);
    }
}
