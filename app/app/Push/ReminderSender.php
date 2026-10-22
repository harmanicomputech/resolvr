<?php

namespace App\Push;

use App\Models\ReminderSubscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Sends the reminders that are due. Each push is empty: the device's
 * service worker decides what the notification says (plain or disguised).
 */
class ReminderSender
{
    public function __construct(private readonly Vapid $vapid) {}

    /** @return array{sent: int, removed: int, failed: int} */
    public function sendDue(?CarbonImmutable $now = null, int $limit = 500): array
    {
        $now ??= CarbonImmutable::now();
        $result = ['sent' => 0, 'removed' => 0, 'failed' => 0];

        ReminderSubscription::query()
            ->where('next_due_at', '<=', $now)
            ->orderBy('next_due_at')
            ->limit($limit)
            ->get()
            ->each(function (ReminderSubscription $sub) use ($now, &$result) {
                $status = $this->push($sub->endpoint);
                if ($status === 404 || $status === 410) {
                    $sub->delete(); // the browser unsubscribed
                    $result['removed']++;

                    return;
                }
                $ok = $status >= 200 && $status < 300;
                $sub->failures = $ok ? 0 : $sub->failures + 1;
                if ($sub->failures >= 10) {
                    $sub->delete();
                    $result['removed']++;

                    return;
                }
                if ($ok) {
                    $sub->last_sent_at = $now;
                }
                $sub->next_due_at = ReminderSubscription::nextDue($sub->time, $sub->days, $sub->timezone, $now);
                $sub->save();
                $ok ? $result['sent']++ : $result['failed']++;
            });

        return $result;
    }

    private function push(string $endpoint): int
    {
        try {
            return Http::timeout(10)
                ->withHeaders([
                    'Authorization' => $this->vapid->authorization($endpoint),
                    'TTL' => '14400',
                    'Urgency' => 'low',
                ])
                ->withBody('', 'application/octet-stream')
                ->post($endpoint)
                ->status();
        } catch (Throwable) {
            return 0;
        }
    }
}
