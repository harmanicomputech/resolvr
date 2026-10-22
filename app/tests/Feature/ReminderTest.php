<?php

use App\Models\ReminderSubscription;
use App\Push\ReminderSender;
use App\Push\Vapid;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    $keys = Vapid::generate();
    config(['services.webpush.public_key' => $keys['public'], 'services.webpush.private_key' => $keys['private']]);
    $this->id = str_repeat('ef', 16);
    $this->auth = ['Authorization' => 'Bearer '.str_repeat('R', 43)];
});

function subscribe($test, array $overrides = []): TestResponse
{
    return $test->putJson("/api/reminders/{$test->id}", array_merge([
        'endpoint' => 'https://push.example.com/send/abc',
        'timezone' => 'Europe/London',
        'time' => '19:30',
        'days' => '1111100',
    ], $overrides), $test->auth);
}

test('publishes the public key', function () {
    $this->getJson('/api/reminders/key')->assertOk()->assertJsonPath('publicKey', config('services.webpush.public_key'));
});

test('stores a schedule and works out the next reminder in the user time zone', function () {
    CarbonImmutable::setTestNow('2026-10-23 20:00:00'); // Friday, 21:00 in London (BST)
    subscribe($this)->assertOk();
    // Next weekday 19:30 London is Monday 26 Oct (after the clocks go back: GMT).
    expect(ReminderSubscription::find($this->id)->next_due_at->toIso8601String())->toBe('2026-10-26T19:30:00+00:00');
    CarbonImmutable::setTestNow();
});

test('only the token holder can change or remove it', function () {
    subscribe($this)->assertOk();
    $this->putJson("/api/reminders/{$this->id}", ['endpoint' => 'https://evil.example/x', 'timezone' => 'UTC', 'time' => '01:00', 'days' => '1111111'], ['Authorization' => 'Bearer '.str_repeat('Z', 43)])->assertForbidden();
    $this->deleteJson("/api/reminders/{$this->id}", [], $this->auth)->assertNoContent();
    expect(ReminderSubscription::count())->toBe(0);
});

test('rejects bad schedules', function () {
    subscribe($this, ['days' => '0000000'])->assertUnprocessable();
    subscribe($this, ['timezone' => 'Mars/Base'])->assertUnprocessable();
    subscribe($this, ['endpoint' => 'http://insecure.example/x'])->assertUnprocessable();
});

test('sends empty, signed pushes and drops dead subscriptions', function () {
    CarbonImmutable::setTestNow('2026-10-26 19:31:00');
    subscribe($this);
    ReminderSubscription::query()->update(['next_due_at' => '2026-10-26 19:30:00']);
    ReminderSubscription::create(['id' => str_repeat('01', 16), 'token_hash' => 'x', 'endpoint' => 'https://push.example.com/gone', 'timezone' => 'UTC', 'time' => '09:00', 'days' => '1111111', 'next_due_at' => '2026-10-26 09:00:00']);
    Http::fake([
        'push.example.com/send/*' => Http::response('', 201),
        'push.example.com/gone' => Http::response('', 410),
    ]);

    $result = (new ReminderSender(Vapid::fromConfig()))->sendDue();

    expect($result)->toBe(['sent' => 1, 'removed' => 1, 'failed' => 0]);
    Http::assertSent(function (Request $request) {
        if (! str_contains($request->url(), '/send/')) {
            return false;
        }
        [$scheme, $rest] = explode(' ', $request->header('Authorization')[0], 2);
        preg_match('/t=([^,]+), k=(.+)/', $rest, $m);
        [$h, $p, $sig] = explode('.', $m[1]);
        $claims = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
        $raw = base64_decode(strtr($sig, '-_', '+/'));

        return $scheme === 'vapid' && $request->body() === '' && $claims['aud'] === 'https://push.example.com'
            && strlen($raw) === 64 && $request->header('Urgency')[0] === 'low';
    });
    $sub = ReminderSubscription::find($this->id);
    expect($sub->next_due_at->toIso8601String())->toBe('2026-10-27T19:30:00+00:00');
    CarbonImmutable::setTestNow();
});

test('the signature verifies against the public key', function () {
    $keys = Vapid::generate();
    $vapid = new Vapid($keys['public'], base64_decode($keys['private']), 'mailto:a@b.c');
    preg_match('/t=([^,]+)/', $vapid->authorization('https://fcm.googleapis.com/fcm/send/x'), $m);
    [$h, $p, $sig] = explode('.', $m[1]);
    $raw = base64_decode(strtr($sig, '-_', '+/'));
    $int = fn ($b) => (ord(ltrim($b, "\0")[0] ?? "\0") & 0x80 ? "\0" : '').ltrim($b, "\0");
    [$r, $s] = [$int(substr($raw, 0, 32)), $int(substr($raw, 32))];
    $der = "\x30".chr(4 + strlen($r) + strlen($s))."\x02".chr(strlen($r)).$r."\x02".chr(strlen($s)).$s;
    $pub = openssl_pkey_get_details(openssl_pkey_get_private(base64_decode($keys['private'])))['key'];
    expect(openssl_verify("{$h}.{$p}", $der, $pub, OPENSSL_ALGO_SHA256))->toBe(1);
});
