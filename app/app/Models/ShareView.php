<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $share_id
 * @property CarbonInterface $viewed_at
 * @property string $device
 */
class ShareView extends Model
{
    public $timestamps = false;

    protected $fillable = ['share_id', 'viewed_at', 'device'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    /** "Chrome on Windows": enough for the owner to recognise a view, nothing more. No IP is kept. */
    public static function describe(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') => 'Opera',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'A browser',
        };
        $os = match (true) {
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'an unknown device',
        };

        return "{$browser} on {$os}";
    }
}
