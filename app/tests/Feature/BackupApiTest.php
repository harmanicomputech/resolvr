<?php

use App\Models\Backup;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    $this->root = sys_get_temp_dir().'/resolvr-backups-'.uniqid();
    config(['services.backups.path' => $this->root, 'services.backups.chunk_bytes' => 8]);
    $this->id = str_repeat('ab', 16);
    $this->token = str_repeat('T', 43);
    $this->auth = ['Authorization' => 'Bearer '.$this->token];
});

afterEach(fn () => File::deleteDirectory($this->root));

function uploadBackup($test, string $bytes, ?array $headers = null): TestResponse
{
    $headers ??= $test->auth;
    $start = $test->postJson("/api/backups/{$test->id}/uploads", ['size' => strlen($bytes), 'sha256' => hash('sha256', $bytes)], $headers);
    $start->assertCreated();
    $upload = $start->json('upload');
    foreach (str_split($bytes, $start->json('chunkSize')) as $i => $chunk) {
        $test->call('PUT', "/api/backups/{$test->id}/uploads/{$upload}/{$i}", [], [], [], [
            'HTTP_AUTHORIZATION' => $headers['Authorization'],
            'CONTENT_TYPE' => 'application/octet-stream',
        ], $chunk)->assertNoContent();
    }

    return $test->postJson("/api/backups/{$test->id}/uploads/{$upload}/complete", [], $headers);
}

test('stores ciphertext in chunks and hands it back', function () {
    $bytes = random_bytes(29);
    uploadBackup($this, $bytes)->assertOk()->assertJson(['size' => 29, 'sha256' => hash('sha256', $bytes)]);

    expect(Backup::find($this->id)->token_hash)->toBe(hash('sha256', $this->token));
    $this->getJson("/api/backups/{$this->id}", $this->auth)->assertOk()->assertJsonPath('size', 29);
    $download = $this->get("/api/backups/{$this->id}/content", $this->auth)->assertOk();
    expect(file_get_contents($download->baseResponse->getFile()->getPathname()))->toBe($bytes);
    expect(is_file($this->root.'/.htaccess'))->toBeTrue();
});

test('a new upload replaces the old file only when complete', function () {
    uploadBackup($this, 'first version!!');
    $start = $this->postJson("/api/backups/{$this->id}/uploads", ['size' => 20, 'sha256' => str_repeat('0', 64)], $this->auth);
    $this->postJson("/api/backups/{$this->id}/uploads/{$start->json('upload')}/complete", [], $this->auth)->assertStatus(422);
    $this->getJson("/api/backups/{$this->id}", $this->auth)->assertJsonPath('size', 15);
});

test('another token cannot read, replace or delete it', function () {
    uploadBackup($this, 'secret bytes');
    $other = ['Authorization' => 'Bearer '.str_repeat('X', 43)];
    $this->getJson("/api/backups/{$this->id}", $other)->assertForbidden();
    $this->get("/api/backups/{$this->id}/content", $other)->assertForbidden();
    $this->postJson("/api/backups/{$this->id}/uploads", ['size' => 3, 'sha256' => str_repeat('0', 64)], $other)->assertForbidden();
    $this->deleteJson("/api/backups/{$this->id}", [], $other)->assertForbidden();
    $this->getJson("/api/backups/{$this->id}")->assertUnauthorized();
});

test('unknown backups are 404 and deleting removes the file', function () {
    $this->getJson("/api/backups/{$this->id}", $this->auth)->assertNotFound();
    uploadBackup($this, 'bye');
    $this->deleteJson("/api/backups/{$this->id}", [], $this->auth)->assertNoContent();
    expect(Backup::count())->toBe(0)->and(is_file($this->root."/{$this->id}.bin"))->toBeFalse();
});

test('enforces the size limits', function () {
    config(['services.backups.max_bytes' => 10]);
    $this->postJson("/api/backups/{$this->id}/uploads", ['size' => 11, 'sha256' => str_repeat('0', 64)], $this->auth)->assertStatus(413);
    config(['services.backups.max_bytes' => 100, 'services.backups.total_bytes' => 10]);
    Backup::create(['id' => str_repeat('cd', 16), 'token_hash' => 'x', 'size' => 8]);
    $this->postJson("/api/backups/{$this->id}/uploads", ['size' => 5, 'sha256' => str_repeat('0', 64)], $this->auth)->assertStatus(507);
});
