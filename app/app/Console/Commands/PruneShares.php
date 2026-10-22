<?php

namespace App\Console\Commands;

use App\Backups\BackupStore;
use App\Models\Share;
use App\Models\ShareView;
use Illuminate\Console\Command;

class PruneShares extends Command
{
    protected $signature = 'shares:prune';

    protected $description = 'Delete expired share files, and share records a month after they ended';

    public function handle(): int
    {
        $store = BackupStore::forShares();
        Share::query()->where('expires_at', '<', now())->whereNotNull('sha256')->each(function (Share $share) use ($store) {
            $store->deleteFile($share->id);
        });
        $old = Share::query()->where('expires_at', '<', now()->subDays(30))->pluck('id');
        ShareView::query()->whereIn('share_id', $old)->delete();
        Share::query()->whereIn('id', $old)->delete();
        $store->pruneUploads();

        return self::SUCCESS;
    }
}
