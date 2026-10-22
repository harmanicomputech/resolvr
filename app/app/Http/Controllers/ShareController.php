<?php

namespace App\Http\Controllers;

use App\Backups\BackupStore;
use App\Backups\IncompleteUpload;
use App\Models\Share;
use App\Models\ShareView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Read-only attorney shares (P3.2). The browser encrypts the bundle with a
 * random key and puts the key only in the link's #fragment, which browsers
 * never send to a server. We hold ciphertext, an expiry, and a view log.
 */
class ShareController extends Controller
{
    private const EXPIRY = ['24h' => 24, '7d' => 168];

    private BackupStore $store;

    public function __construct()
    {
        $this->store = BackupStore::forShares();
    }

    /** The viewer page. It decrypts in the reader's browser. */
    public function page(string $id): Response
    {
        return response()
            ->view('share', ['id' => $id])
            ->header('Cache-Control', 'no-store')
            ->header('X-Robots-Tag', 'noindex, nofollow')
            ->header('Referrer-Policy', 'no-referrer');
    }

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate([
            'size' => ['required', 'integer', 'min:1', 'max:'.config('services.shares.max_bytes')],
            'sha256' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
            'expiresIn' => ['required', 'in:24h,7d'],
        ]);
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $share = Share::create([
            'id' => bin2hex(random_bytes(16)),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHours(self::EXPIRY[$data['expiresIn']]),
        ]);
        $chunk = (int) config('services.backups.chunk_bytes');
        $upload = $this->store->begin($share->id, $data['size'], $data['sha256'], $chunk);

        return response()->json([
            'id' => $share->id,
            'token' => $token,
            'upload' => $upload,
            'chunkSize' => $chunk,
            'expiresAt' => $share->expires_at->toIso8601String(),
        ], 201);
    }

    public function chunk(Request $request, string $id, string $upload, int $index): Response
    {
        $share = $this->owned($request, $id);
        $meta = $this->pending($share, $upload);
        abort_unless($index >= 0 && $index < $meta['chunks'], 422, 'Unexpected part.');
        $bytes = $request->getContent();
        abort_if(strlen($bytes) === 0 || strlen($bytes) > config('services.backups.chunk_bytes'), 413);
        $this->store->putChunk($upload, $index, $bytes);

        return response()->noContent();
    }

    public function complete(Request $request, string $id, string $upload): JsonResponse
    {
        $share = $this->owned($request, $id);
        $this->pending($share, $upload);
        try {
            $meta = $this->store->finish($share->id, $upload);
        } catch (IncompleteUpload $e) {
            $this->store->discard($upload);
            abort(422, $e->getMessage().' Please try again.');
        }
        $share->forceFill(['size' => $meta['size'], 'sha256' => $meta['sha256']])->save();

        return response()->json($this->describe($share));
    }

    /** For the owner: expiry, state and who opened it when. */
    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json($this->describe($this->owned($request, $id)));
    }

    /** Revoke: the file is deleted at once; the view log stays for the owner. */
    public function revoke(Request $request, string $id): Response
    {
        $share = $this->owned($request, $id);
        $share->forceFill(['revoked_at' => now()])->save();
        $this->store->deleteFile($share->id);

        return response()->noContent();
    }

    /** For the reader: the ciphertext, while the link is open. Each fetch is logged. */
    public function content(Request $request, string $id): BinaryFileResponse|JsonResponse
    {
        $share = Share::find($id);
        abort_unless($share && $share->sha256, 404, 'This link is not valid.');
        if (! $share->isOpen()) {
            return response()->json([
                'message' => $share->revoked_at ? 'The person who shared this has turned the link off.' : 'This link has expired.',
            ], 410);
        }
        ShareView::create([
            'share_id' => $share->id,
            'viewed_at' => now(),
            'device' => ShareView::describe($request->userAgent()),
        ]);

        return response()->file($this->store->path($share->id), [
            'Content-Type' => 'application/octet-stream',
            'Cache-Control' => 'no-store',
            'X-Share-Expires-At' => $share->expires_at->toIso8601String(),
        ]);
    }

    private function owned(Request $request, string $id): Share
    {
        $token = (string) $request->bearerToken();
        abort_unless(preg_match('/^[A-Za-z0-9_-]{43}$/', $token), 401);
        $share = Share::find($id);
        abort_unless($share, 404);
        abort_unless($share->allows($token), 403);

        return $share;
    }

    /** @return array{backup: string, size: int, sha256: string, chunks: int} */
    private function pending(Share $share, string $upload): array
    {
        $meta = Str::isUuid($upload) ? $this->store->upload($upload) : null;
        abort_unless($meta && $meta['backup'] === $share->id && $share->revoked_at === null, 404);

        return $meta;
    }

    /** @return array<string, mixed> */
    private function describe(Share $share): array
    {
        return [
            'expiresAt' => $share->expires_at->toIso8601String(),
            'revokedAt' => $share->revoked_at?->toIso8601String(),
            'open' => $share->isOpen(),
            'size' => $share->size,
            'views' => $share->views()->limit(100)->get()
                ->map(fn (ShareView $v) => ['at' => $v->viewed_at->toIso8601String(), 'device' => $v->device])
                ->all(),
        ];
    }
}
