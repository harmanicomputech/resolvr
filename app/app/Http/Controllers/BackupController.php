<?php

namespace App\Http\Controllers;

use App\Backups\BackupStore;
use App\Backups\IncompleteUpload;
use App\Models\Backup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * End-to-end encrypted backups. There are no accounts: a backup is named by
 * an id and guarded by a token, both derived from the user's recovery phrase
 * on their device. The server keeps a hash of the token and the ciphertext,
 * and cannot open either.
 */
class BackupController extends Controller
{
    public function __construct(private readonly BackupStore $store) {}

    public function show(Request $request, string $id): JsonResponse
    {
        $backup = $this->authorised($request, $id);

        return response()->json($this->describe($backup));
    }

    public function content(Request $request, string $id): BinaryFileResponse
    {
        $backup = $this->authorised($request, $id);

        return response()->file($this->store->path($backup->id), [
            'Content-Type' => 'application/octet-stream',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function begin(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'size' => ['required', 'integer', 'min:1'],
            'sha256' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
        ]);
        $config = config('services.backups');
        abort_if($data['size'] > $config['max_bytes'], 413, 'This backup is larger than the server allows.');

        $token = $this->token($request);
        $backup = Backup::find($id);
        if ($backup) {
            abort_unless($backup->allows($token), 403);
        }
        $used = (int) Backup::query()->where('id', '!=', $id)->sum('size');
        abort_if($used + $data['size'] > $config['total_bytes'], 507, 'The backup service is full right now. Please try again later.');

        $backup ??= Backup::create(['id' => $id, 'token_hash' => hash('sha256', $token)]);
        $upload = $this->store->begin($backup, $data['size'], $data['sha256'], $config['chunk_bytes']);

        return response()->json(['upload' => $upload, 'chunkSize' => $config['chunk_bytes']], 201);
    }

    public function chunk(Request $request, string $id, string $upload, int $index): Response
    {
        $backup = $this->owned($request, $id);
        $meta = $this->pending($backup, $upload);
        abort_unless($index >= 0 && $index < $meta['chunks'], 422, 'Unexpected part.');
        $bytes = $request->getContent();
        abort_if(strlen($bytes) === 0 || strlen($bytes) > config('services.backups.chunk_bytes'), 413);
        $this->store->putChunk($upload, $index, $bytes);

        return response()->noContent();
    }

    public function complete(Request $request, string $id, string $upload): JsonResponse
    {
        $backup = $this->owned($request, $id);
        $this->pending($backup, $upload);
        try {
            $this->store->complete($backup, $upload);
        } catch (IncompleteUpload $e) {
            $this->store->discard($upload);
            abort(422, $e->getMessage().' Please try again.');
        }

        return response()->json($this->describe($backup->refresh()));
    }

    public function destroy(Request $request, string $id): Response
    {
        $backup = Backup::find($id);
        if ($backup) {
            abort_unless($backup->allows($this->token($request)), 403);
            $this->store->delete($backup);
        }

        return response()->noContent();
    }

    /** A finished backup the caller may read. */
    private function authorised(Request $request, string $id): Backup
    {
        $backup = $this->owned($request, $id);
        abort_if($backup->sha256 === null || ! is_file($this->store->path($id)), 404);

        return $backup;
    }

    private function owned(Request $request, string $id): Backup
    {
        $token = $this->token($request);
        $backup = Backup::find($id);
        abort_unless($backup, 404);
        abort_unless($backup->allows($token), 403);

        return $backup;
    }

    /** @return array{backup: string, size: int, sha256: string, chunks: int} */
    private function pending(Backup $backup, string $upload): array
    {
        $meta = preg_match('/^[0-9a-f-]{36}$/', $upload) ? $this->store->upload($upload) : null;
        abort_unless($meta && $meta['backup'] === $backup->id, 404);

        return $meta;
    }

    private function token(Request $request): string
    {
        $token = (string) $request->bearerToken();
        abort_unless(preg_match('/^[A-Za-z0-9_-]{43}$/', $token), 401);

        return $token;
    }

    /** @return array{size: int, sha256: string|null, updatedAt: string|null} */
    private function describe(Backup $backup): array
    {
        return ['size' => $backup->size, 'sha256' => $backup->sha256, 'updatedAt' => $backup->updated_at?->toIso8601String()];
    }
}
