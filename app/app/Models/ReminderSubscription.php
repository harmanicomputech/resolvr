<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $token_hash
 * @property string $endpoint
 * @property string $timezone
 * @property string $time "HH:MM" in the user's time zone
 * @property string $days seven 0/1 flags, Monday first
 * @property CarbonInterface $next_due_at
 * @property CarbonInterface|null $last_sent_at
 * @property int $failures
 */
class ReminderSubscription extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'token_hash', 'endpoint', 'timezone', 'time', 'days', 'next_due_at'];

    protected $hidden = ['token_hash', 'endpoint'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['next_due_at' => 'datetime', 'last_sent_at' => 'datetime'];
    }

    public function allows(string $token): bool
    {
        return hash_equals($this->token_hash, hash('sha256', $token));
    }

    /** The next chosen day and time after `$after`, in UTC. */
    public static function nextDue(string $time, string $days, string $timezone, ?CarbonImmutable $after = null): CarbonImmutable
    {
        $after = ($after ?? CarbonImmutable::now())->setTimezone($timezone);
        [$hour, $minute] = array_map('intval', explode(':', $time));
        for ($offset = 0; $offset <= 7; $offset++) {
            $candidate = $after->startOfDay()->addDays($offset)->setTime($hour, $minute);
            if ($candidate > $after && $days[$candidate->dayOfWeekIso - 1] === '1') {
                return $candidate->utc();
            }
        }

        return $after->addWeek()->utc(); // no days chosen; validation prevents this
    }
}
