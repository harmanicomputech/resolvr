<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'max:191', 'email:rfc,strict'],
            'source' => ['nullable', 'string', 'max:64'],
            // Honeypot: real visitors never see or fill this field.
            'company' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function isBot(): bool
    {
        return filled($this->input('company'));
    }

    public function normalisedEmail(): string
    {
        return mb_strtolower(trim((string) $this->input('email')));
    }
}
