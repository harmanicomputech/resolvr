<?php

namespace App\Models;

use Database\Factories\WaitlistSignupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

/**
 * @property int $id
 * @property string $email
 * @property string|null $source
 * @property Carbon|null $confirmation_sent_at
 */
class WaitlistSignup extends Model
{
    /** @use HasFactory<WaitlistSignupFactory> */
    use HasFactory;

    protected $fillable = ['email', 'source'];

    protected function casts(): array
    {
        return [
            'confirmation_sent_at' => 'datetime',
        ];
    }

    /** Signed link that lets the recipient remove themselves without an account. */
    public function unsubscribeUrl(): string
    {
        return URL::signedRoute('waitlist.unsubscribe', ['signup' => $this->id]);
    }
}
