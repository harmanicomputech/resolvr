<?php

namespace App\Backups;

use App\Models\Backup;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Encrypted backup files on disk. Uploads arrive in numbered chunks into a
 * staging folder; the stored file is only replaced once every chunk is in
 * and the whole file matches the size and SHA-256 the device announced.
 * Nothing here can read the files: they are encrypted on the device.
 */
class BackupStore
{
    public function __construct(private readonly string $root) {}

    public static function fromConfig(): self
    {
        return new self(config('services.backups.path'));
    }

    public function path(string $id): string
    {
        return $this->root.'/'.$id.'.bin';
    }

    private function uploadDir(string $upload): string
    {
        return $this->root.'/uploads/'.$upload;
    }

    /** @return array{backup: string, size: int, sha256: string, chunks: int}|null */
    public function upload(string $upload): ?array
    {
        $meta = $this->uploadDir($upload).'/meta.json';

        return File::exists($meta) ? json_decode(File::get($meta), true) : null;
    }

    public function begin(Backup $backup, int $size, string $sha256, int $chunkBytes): string
    {
        $upload = (string) Str::uuid();
        File::ensureDirectoryExists($this->uploadDir($upload), 0700);
        $this->protect();
        File::put($this->uploadDir($upload).'/meta.json', json_encode([
            'backup' => $backup->id,
            'size' => $size,
            'sha256' => $sha256,
            'chunks' => max(1, (int) ceil($size / $chunkBytes)),
        ]));

        return $upload;
    }

    public function putChunk(string $upload, int $index, string $bytes): void
    {
        File::put($this->uploadDir($upload).'/'.$index.'.part', $bytes);
    }

    /** Join the chunks, check them, and swap the new file in. */
    public function complete(Backup $backup, string $upload): void
    {
        $meta = $this->upload($upload) ?? throw new RuntimeException('Unknown upload');
        $tmp = $this->uploadDir($upload).'/joined.bin';
        $out = fopen($tmp, 'wb');
        try {
            for ($i = 0; $i < $meta['chunks']; $i++) {
                $part = $this->uploadDir($upload).'/'.$i.'.part';
                if (! is_file($part)) {
                    throw new IncompleteUpload("Part {$i} is missing.");
                }
                $in = fopen($part, 'rb');
                stream_copy_to_stream($in, $out);
                fclose($in);
            }
        } finally {
            fclose($out);
        }
        clearstatcache(true, $tmp);
        if (filesize($tmp) !== $meta['size'] || ! hash_equals($meta['sha256'], hash_file('sha256', $tmp))) {
            throw new IncompleteUpload('The upload did not arrive intact.');
        }
        rename($tmp, $this->path($backup->id));
        $this->discard($upload);
        $backup->forceFill(['size' => $meta['size'], 'sha256' => $meta['sha256']])->save();
    }

    public function discard(string $upload): void
    {
        File::deleteDirectory($this->uploadDir($upload));
    }

    public function delete(Backup $backup): void
    {
        File::delete($this->path($backup->id));
        $backup->delete();
    }

    /** Remove uploads that were started but never finished. */
    public function pruneUploads(int $olderThanSeconds = 86400): int
    {
        $count = 0;
        if (! is_dir($this->root.'/uploads')) {
            return 0;
        }
        foreach (File::directories($this->root.'/uploads') as $dir) {
            if (filemtime($dir) < time() - $olderThanSeconds) {
                File::deleteDirectory($dir);
                $count++;
            }
        }

        return $count;
    }

    /** Belt and braces in case BACKUP_PATH is ever pointed inside the web root. */
    private function protect(): void
    {
        $htaccess = $this->root.'/.htaccess';
        if (! is_file($htaccess)) {
            File::put($htaccess, "Require all denied\n");
        }
    }
}
