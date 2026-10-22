<?php

namespace App\Console\Commands;

use App\Push\ReminderSender;
use App\Push\Vapid;
use Illuminate\Console\Command;

class SendReminders extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Send the web push reminders that are due';

    public function handle(): int
    {
        $vapid = Vapid::fromConfig();
        if (! $vapid) {
            return self::SUCCESS; // reminders not configured on this server
        }
        $result = (new ReminderSender($vapid))->sendDue();
        if (array_sum($result) > 0) {
            $this->info("Sent {$result['sent']}, removed {$result['removed']}, failed {$result['failed']}.");
        }

        return self::SUCCESS;
    }
}
