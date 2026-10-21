<?php

use App\Mail\WaitlistConfirmation;
use App\Models\WaitlistSignup;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

beforeEach(function () {
    Mail::fake();
});

test('a new email is stored and a confirmation is queued', function () {
    $this->postJson('/api/waitlist', ['email' => ' Person@Example.com ', 'source' => '/'])
        ->assertStatus(202)
        ->assertExactJson(['status' => 'ok']);

    $signup = WaitlistSignup::sole();
    expect($signup->email)->toBe('person@example.com')
        ->and($signup->source)->toBe('/')
        ->and($signup->confirmation_sent_at)->not->toBeNull();

    Mail::assertQueued(WaitlistConfirmation::class, fn ($mail) => $mail->hasTo('person@example.com'));
});

test('signing up twice gives the same answer and sends one email', function () {
    $this->postJson('/api/waitlist', ['email' => 'a@example.com'])->assertStatus(202);
    $this->postJson('/api/waitlist', ['email' => 'A@example.com'])->assertStatus(202)->assertExactJson(['status' => 'ok']);

    expect(WaitlistSignup::count())->toBe(1);
    Mail::assertQueuedCount(1);
});

test('the honeypot silently drops bots', function () {
    $this->postJson('/api/waitlist', ['email' => 'bot@example.com', 'company' => 'Acme'])
        ->assertStatus(202)
        ->assertExactJson(['status' => 'ok']);

    expect(WaitlistSignup::count())->toBe(0);
    Mail::assertNothingQueued();
});

test('invalid emails are rejected', function (mixed $email) {
    $this->postJson('/api/waitlist', ['email' => $email])->assertStatus(422)->assertJsonValidationErrors('email');
})->with([null, '', 'not-an-email', 'a@', str_repeat('a', 190).'@example.com']);

test('the endpoint is rate limited per IP', function () {
    foreach (range(1, 5) as $i) {
        $this->postJson('/api/waitlist', ['email' => "p{$i}@example.com"])->assertStatus(202);
    }

    $this->postJson('/api/waitlist', ['email' => 'p6@example.com'])->assertStatus(429);
});

test('no IP address or user agent is stored', function () {
    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])
        ->postJson('/api/waitlist', ['email' => 'private@example.com'], ['User-Agent' => 'TestAgent'])
        ->assertStatus(202);

    $row = json_encode(WaitlistSignup::sole()->getAttributes());
    expect($row)->not->toContain('203.0.113.9')->not->toContain('TestAgent');
});

test('the confirmation email has a working unsubscribe link and the disclaimer', function () {
    $signup = WaitlistSignup::factory()->create();
    $html = (new WaitlistConfirmation($signup))->render();

    expect($html)->toContain('Not legal advice')->toContain('/waitlist/unsubscribe/'.$signup->id);
});

test('unsubscribing needs a valid signature and a POST', function () {
    $signup = WaitlistSignup::factory()->create();

    $this->get("/waitlist/unsubscribe/{$signup->id}")->assertForbidden();

    $url = URL::signedRoute('waitlist.unsubscribe', ['signup' => $signup->id]);
    $this->get($url)->assertOk()->assertSee('Leave the waitlist?');
    expect(WaitlistSignup::count())->toBe(1);

    $this->withoutMiddleware(ValidateCsrfToken::class)
        ->post($url)
        ->assertRedirect(route('waitlist.unsubscribed'));
    expect(WaitlistSignup::count())->toBe(0);
});
