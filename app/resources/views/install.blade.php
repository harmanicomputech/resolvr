<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>Set up Resolvr</title>
        @vite(['resources/css/app.css'])
    </head>
    {{-- Browser-based setup for hosting without a command line (InstallController). --}}
    <body class="antialiased bg-bg text-fg">
        <main class="mx-auto max-w-2xl space-y-6 px-4 py-10">
            <header>
                <p class="font-display text-sm font-semibold text-accent-text">Resolvr</p>
                <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight">Set up and upkeep</h1>
                <p class="mt-2 text-sm text-fg-muted">For hosting without a command line. Turn this page off by clearing <span class="mono">INSTALL_TOKEN</span> in <span class="mono">.env</span> once everything is ready.</p>
            </header>

            @if ($output)
                <pre class="card overflow-x-auto p-4 text-xs whitespace-pre-wrap" role="status">{{ $output }}</pre>
            @endif

            @if (! $authorised)
                <form method="post" action="/install" class="card space-y-4 p-5">
                    @csrf
                    <div class="field">
                        <label class="field-label" for="token">Setup token (INSTALL_TOKEN in .env)</label>
                        <input class="input" id="token" name="token" type="password" autocomplete="off" required autofocus>
                    </div>
                    <button class="btn" data-variant="primary" type="submit">Continue</button>
                </form>
            @else
                <section class="card p-5" aria-labelledby="checks">
                    <h2 id="checks" class="font-display text-lg font-semibold">Checks</h2>
                    <ul class="mt-3 divide-y divide-hairline text-sm">
                        @foreach ($checks as $check)
                            <li class="flex items-start gap-3 py-2.5">
                                <span class="w-14 shrink-0 font-medium {{ $check['ok'] === true ? 'text-success-text' : ($check['ok'] === false ? 'text-danger-text' : 'text-fg-muted') }}">
                                    {{ $check['ok'] === true ? 'Ready' : ($check['ok'] === false ? 'Fix' : 'Optional') }}
                                </span>
                                <span class="min-w-0 flex-1">
                                    <span class="block text-fg">{{ $check['label'] }}</span>
                                    <span class="block break-words text-fg-muted">{{ $check['detail'] }}</span>
                                </span>
                            </li>
                        @endforeach
                    </ul>
                </section>

                @if ($vapid)
                    <section class="card space-y-2 p-5" aria-labelledby="vapid">
                        <h2 id="vapid" class="font-display text-lg font-semibold">Reminder keys</h2>
                        <p class="text-sm text-fg-muted">Copy both lines into <span class="mono">.env</span> (File Manager → Edit), then reload this page. Keep the private key secret.</p>
                        <pre class="mono overflow-x-auto rounded-(--radius-md) bg-raised p-3 text-xs whitespace-pre-wrap break-all">VAPID_PUBLIC_KEY={{ $vapid['public'] }}
VAPID_PRIVATE_KEY={{ $vapid['private'] }}</pre>
                    </section>
                @endif

                <section class="card space-y-3 p-5" aria-labelledby="actions">
                    <h2 id="actions" class="font-display text-lg font-semibold">Actions</h2>
                    @foreach ([
                        ['migrate', 'Set up or update the database', 'Run after the first upload and after every update. Safe to run again.'],
                        ['vapid', 'Make reminder keys', 'Only needed once, if you want reminders.'],
                        ['clear', 'Clear cached settings', 'Use after editing .env if a change does not seem to apply.'],
                        ['check', 'Check again', ''],
                    ] as [$action, $label, $hint])
                        <form method="post" action="/install" class="flex flex-wrap items-center gap-3">
                            @csrf
                            <input type="hidden" name="token" value="{{ $token }}">
                            <input type="hidden" name="action" value="{{ $action }}">
                            <button class="btn" data-size="sm" @if ($action === 'migrate') data-variant="primary" @endif type="submit">{{ $label }}</button>
                            <span class="text-sm text-fg-muted">{{ $hint }}</span>
                        </form>
                    @endforeach
                </section>

                <section class="card space-y-2 p-5 text-sm" aria-labelledby="cron">
                    <h2 id="cron" class="font-display text-lg font-semibold">Scheduled jobs</h2>
                    <p class="text-fg-muted">Have this address opened every minute. In the hosting panel's Cron Jobs, add <span class="mono">curl -fsS URL</span> (or <span class="mono">wget -q -O /dev/null URL</span>); if the panel only takes PHP, use a free service such as cron-job.org instead.</p>
                    <p class="mono rounded-(--radius-md) bg-raised p-3 text-xs break-all">{{ rtrim(config('app.url'), '/') }}/cron/{{ config('resolvr.cron_token') ? 'CRON_TOKEN from .env' : '(set CRON_TOKEN in .env first)' }}</p>
                </section>
            @endif
        </main>
    </body>
</html>
