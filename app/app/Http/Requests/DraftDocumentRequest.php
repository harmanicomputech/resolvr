<?php

namespace App\Http\Requests;

use App\Ai\DocumentPrompt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * What the browser may send for a draft. Everything is optional except the
 * document type and at least one incident (or a paragraph to rewrite), and
 * every field is length-capped so a request cannot be used as a free
 * general-purpose chatbot.
 */
class DraftDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $text = fn (int $max) => ['nullable', 'string', 'max:'.$max];

        return [
            'mode' => ['required', Rule::in(['document', 'rewrite'])],
            'type' => ['required', Rule::in(array_keys(DocumentPrompt::TYPES))],
            'tone' => ['required', Rule::in(array_keys(DocumentPrompt::TONES))],
            'outcome' => ['nullable', Rule::in(array_keys(DocumentPrompt::OUTCOMES))],
            'jurisdiction' => ['required', Rule::in(array_keys(DocumentPrompt::JURISDICTIONS))],
            'context' => $text(2000),

            'details' => ['nullable', 'array:fullName,jobTitle,department,employer,manager,recipient,date'],
            'details.*' => $text(200),

            'incidents' => ['array', 'max:40', Rule::requiredIf(fn () => $this->input('mode') === 'document')],
            'incidents.*' => ['array:id,date,title,types,severity,location,description,responsible,witnesses,reported,impact,notes,evidence'],
            'incidents.*.id' => ['required', 'string', 'max:20'],
            'incidents.*.date' => $text(60),
            'incidents.*.title' => $text(200),
            'incidents.*.types' => $text(600),
            'incidents.*.severity' => $text(20),
            'incidents.*.location' => $text(300),
            'incidents.*.description' => $text(6000),
            'incidents.*.responsible' => $text(300),
            'incidents.*.witnesses' => $text(300),
            'incidents.*.reported' => $text(1500),
            'incidents.*.impact' => $text(2000),
            'incidents.*.notes' => $text(2000),
            'incidents.*.evidence' => $text(800),

            'paragraph' => ['nullable', 'string', 'max:4000', Rule::requiredIf(fn () => $this->input('mode') === 'rewrite')],
            'instruction' => $text(300),
            'surrounding' => $text(12000),
        ];
    }

    /** A hard ceiling on the whole request, whatever the field mix. */
    public function after(): array
    {
        return [
            function ($validator) {
                if (strlen((string) $this->getContent()) > 90_000) {
                    $validator->errors()->add('incidents', 'That is more than can be drafted at once. Choose fewer incidents.');
                }
            },
        ];
    }
}
