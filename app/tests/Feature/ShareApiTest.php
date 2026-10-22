<?php

use App\Models\Share;
use App\Models\ShareView;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->root = sys_get_temp_dir().'/resolvr-shares-'.uniqid();
    config(['services.shares.path' => $this->root, 'services.backups.chunk_bytes' => 8]);
});

afterEach(fn () => File::deleteDirectory($this->root));

function makeShare($test, string $bytes, string $expiresIn = '24h'): array
{
    $start = $test->postJson('/api/shares', ['size' => strlen($bytes), 'sha256' => hash('sha256', $bytes), 'expiresIn' => $expiresIn])->assertCreated();
    ['id' => $id, 'token' => $token, 'upload' => $upload] = $start->json();
    foreach (str_split($bytes, 8) as $i => $chunk) {
        $test->call('PUT', "/api/shares/{$id}/uploads/{$upload}/{$i}", [], [], [], [
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
            'CONTENT_TYPE' => 'application/octet-stream',
        ], $chunk)->assertNoContent();
    }
    $test->postJson("/api/shares/{$id}/uploads/{$upload}/complete", [], ['Authorization' => "Bearer {$token}"])->assertOk();

    return [$id, $token];
}

test('stores ciphertext, serves it to anyone with the id, and logs each view', function () {
    $this->withoutVite();
    [$id, $token] = makeShare($this, 'sealed bytes here!');
    $this->get("/s/{$id}")->assertOk()->assertSee('data-share-id="'.$id.'"', false)->assertHeader('X-Robots-Tag', 'noindex, nofollow');

    $res = $this->get("/api/shares/{$id}/content", ['User-Agent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36'])->assertOk();
    expect(file_get_contents($res->baseResponse->getFile()->getPathname()))->toBe('sealed bytes here!');
    $res->assertHeader('X-Share-Expires-At');

    $this->getJson("/api/shares/{$id}", ['Authorization' => "Bearer {$token}"])
        ->assertOk()
        ->assertJsonPath('open', true)
        ->assertJsonPath('views.0.device', 'Chrome on Windows');
    expect(ShareView::count())->toBe(1);
});

test('only the owner token can see the log or revoke', function () {
    [$id] = makeShare($this, 'x');
    $other = ['Authorization' => 'Bearer '.str_repeat('Q', 43)];
    $this->getJson("/api/shares/{$id}", $other)->assertForbidden();
    $this->deleteJson("/api/shares/{$id}", [], $other)->assertForbidden();
});

test('revoking deletes the file and the link answers 410', function () {
    [$id, $token] = makeShare($this, 'secret');
    $this->deleteJson("/api/shares/{$id}", [], ['Authorization' => "Bearer {$token}"])->assertNoContent();
    expect(is_file($this->root."/{$id}.bin"))->toBeFalse();
    $this->getJson("/api/shares/{$id}/content")->assertStatus(410)->assertJsonPath('message', 'The person who shared this has turned the link off.');
});

test('links expire and the prune command removes old ones', function () {
    [$id] = makeShare($this, 'secret', '24h');
    $this->travel(25)->hours();
    $this->getJson("/api/shares/{$id}/content")->assertStatus(410)->assertJsonPath('message', 'This link has expired.');
    $this->artisan('shares:prune')->assertSuccessful();
    expect(is_file($this->root."/{$id}.bin"))->toBeFalse()->and(Share::count())->toBe(1);
    $this->travel(31)->days();
    $this->artisan('shares:prune')->assertSuccessful();
    expect(Share::count())->toBe(0);
});

test('rejects unknown links, bad expiry and oversize bundles', function () {
    $this->getJson('/api/shares/'.str_repeat('a', 32).'/content')->assertNotFound();
    $this->postJson('/api/shares', ['size' => 10, 'sha256' => str_repeat('0', 64), 'expiresIn' => '1y'])->assertUnprocessable();
    config(['services.shares.max_bytes' => 5]);
    $this->postJson('/api/shares', ['size' => 10, 'sha256' => str_repeat('0', 64), 'expiresIn' => '7d'])->assertUnprocessable();
});
