<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $token_hash
 * @property int $size
 * @property string|null $sha256
 */
class Backup extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'token_hash', 'size', 'sha256'];

    protected $hidden = ['token_hash'];

    public function allows(string $token): bool
    {
        return hash_equals($this->token_hash, hash('sha256', $token));
    }
}
