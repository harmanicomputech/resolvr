<?php

namespace App\Console\Commands;

use App\Push\Vapid;
use Illuminate\Console\Command;

class GenerateVapidKeys extends Command
{
    protected $signature = 'resolvr:vapid-keys';

    protected $description = 'Generate the key pair for web push reminders (add the output to .env)';

    public function handle(): int
    {
        $keys = Vapid::generate();
        $this->line('VAPID_PUBLIC_KEY='.$keys['public']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['private']);
        $this->newLine();
        $this->comment('Keep the private key secret. Changing keys later means users turn reminders on again.');

        return self::SUCCESS;
    }
}
