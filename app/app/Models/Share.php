<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $token_hash
 * @property int $size
 * @property string|null $sha256
 * @property CarbonInterface $expires_at
 * @property CarbonInterface|null $revoked_at
 */
class Share extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'token_hash', 'expires_at'];

    protected $hidden = ['token_hash'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    /** @return HasMany<ShareView, $this> */
    public function views(): HasMany
    {
        return $this->hasMany(ShareView::class)->orderByDesc('viewed_at');
    }

    public function allows(string $token): bool
    {
        return hash_equals($this->token_hash, hash('sha256', $token));
    }

    public function isOpen(): bool
    {
        return $this->revoked_at === null && $this->sha256 !== null && $this->expires_at->isFuture();
    }
}
