<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

beforeEach(fn () => $this->withoutVite());

test('the installer and cron URL are off until their tokens are set', function () {
    config(['resolvr.install_token' => null, 'resolvr.cron_token' => null]);
    $this->get('/install')->assertNotFound();
    $this->post('/install', ['token' => 'x'])->assertNotFound();
    $this->get('/cron/anything')->assertNotFound();
});

test('the installer needs the right token, then shows checks and runs actions', function () {
    config(['resolvr.install_token' => 'setup-secret']);
    $this->get('/install')->assertOk()->assertSee('Setup token');
    $this->post('/install', ['token' => 'wrong'])->assertOk()->assertSee('That setup token is not right.')->assertDontSee('Checks');

    $this->post('/install', ['token' => 'setup-secret'])
        ->assertOk()
        ->assertSee('PHP 8.3 or newer')
        ->assertSee('Database connection')
        ->assertSee('Set up or update the database');

    $this->post('/install', ['token' => 'setup-secret', 'action' => 'migrate'])->assertOk()->assertSee('Database is up to date');

    $this->post('/install', ['token' => 'setup-secret', 'action' => 'vapid'])
        ->assertOk()
        ->assertSee('VAPID_PUBLIC_KEY=', false)
        ->assertSee('VAPID_PRIVATE_KEY=', false);
});

test('the cron URL runs the scheduled jobs in-process and records when', function () {
    config(['resolvr.cron_token' => 'cron-secret']);
    $this->get('/cron/wrong')->assertNotFound();

    $this->get('/cron/cron-secret')->assertOk()->assertSee('queue')->assertSee('reminders')->assertSee('shares');
    expect(Cache::get('webcron:last'))->not->toBeNull();

    // Hourly and daily jobs run once per period, not every minute.
    $this->get('/cron/cron-secret')->assertOk()->assertDontSee('shares');
});

test('queued waitlist emails go out through the cron URL', function () {
    config(['resolvr.cron_token' => 'cron-secret', 'queue.default' => 'database']);
    $this->postJson('/api/waitlist', ['email' => 'someone@example.com'])->assertSuccessful();
    expect(DB::table('jobs')->count())->toBe(1);
    $this->get('/cron/cron-secret')->assertOk();
    expect(DB::table('jobs')->count())->toBe(0);
});
