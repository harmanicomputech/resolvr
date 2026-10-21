<?php

namespace App\Mail;

use App\Models\WaitlistSignup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class WaitlistConfirmation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public WaitlistSignup $signup) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "You're on the Resolvr waitlist");
    }

    public function headers(): Headers
    {
        return new Headers(text: [
            'List-Unsubscribe' => '<'.$this->signup->unsubscribeUrl().'>',
        ]);
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.waitlist-confirmation',
            text: 'mail.waitlist-confirmation-text',
            with: ['unsubscribeUrl' => $this->signup->unsubscribeUrl()],
        );
    }
}
