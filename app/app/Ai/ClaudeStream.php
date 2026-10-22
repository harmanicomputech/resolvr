<?php

namespace App\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Streams a Messages API response and hands each piece of text to a
 * callback as it arrives. Uses Laravel's HTTP client with the Messages API
 * directly. Server-side refusal fallbacks are on: if the model declines, the
 * API retries on its recommended fallback model within the same stream.
 */
class ClaudeStream
{
    public const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

    /**
     * @param  callable(string): void  $onText
     * @return array{stop_reason: string|null, model: string|null}
     */
    public function stream(string $system, string $user, callable $onText, int $maxTokens = 16000): array
    {
        $config = config('services.anthropic');

        try {
            $response = Http::withHeaders([
                'x-api-key' => $config['key'],
                'anthropic-version' => '2023-06-01',
                'anthropic-beta' => self::FALLBACK_BETA,
            ])
                ->accept('text/event-stream')
                ->connectTimeout(10)
                ->timeout(180)
                ->withOptions(['stream' => true])
                ->post(rtrim($config['url'], '/').'/v1/messages', [
                    'model' => $config['model'],
                    'max_tokens' => $maxTokens,
                    'stream' => true,
                    'fallbacks' => 'default',
                    'output_config' => ['effort' => 'medium'],
                    'system' => $system,
                    'messages' => [['role' => 'user', 'content' => $user]],
                ]);
        } catch (ConnectionException) {
            throw new DraftingUnavailable('The drafting service could not be reached.');
        }

        if ($response->failed()) {
            throw new DraftingUnavailable(match (true) {
                $response->status() === 429, $response->status() === 529 => 'The drafting service is busy. Please try again in a minute.',
                $response->status() >= 500 => 'The drafting service is having trouble. Please try again shortly.',
                default => 'The draft could not be started.',
            }, $response->status());
        }

        $body = $response->toPsrResponse()->getBody();
        $buffer = '';
        $result = ['stop_reason' => null, 'model' => null];

        while (! $body->eof()) {
            $buffer .= $body->read(8192);
            while (($end = strpos($buffer, "\n\n")) !== false) {
                $event = substr($buffer, 0, $end);
                $buffer = substr($buffer, $end + 2);
                $this->handle($event, $onText, $result);
            }
        }
        if (trim($buffer) !== '') {
            $this->handle($buffer, $onText, $result);
        }

        return $result;
    }

    /** @param array{stop_reason: string|null, model: string|null} $result */
    private function handle(string $event, callable $onText, array &$result): void
    {
        $data = null;
        foreach (explode("\n", $event) as $line) {
            if (str_starts_with($line, 'data:')) {
                $data = json_decode(trim(substr($line, 5)), true);
            }
        }
        if (! is_array($data)) {
            return;
        }

        switch ($data['type'] ?? null) {
            case 'message_start':
                $result['model'] = $data['message']['model'] ?? null;
                break;
            case 'content_block_delta':
                if (($data['delta']['type'] ?? null) === 'text_delta') {
                    $onText($data['delta']['text']);
                }
                break;
            case 'message_delta':
                $result['stop_reason'] = $data['delta']['stop_reason'] ?? $result['stop_reason'];
                break;
            case 'error':
                throw new DraftingUnavailable(($data['error']['type'] ?? '') === 'overloaded_error'
                    ? 'The drafting service is busy. Please try again in a minute.'
                    : 'The draft stopped unexpectedly. Please try again.');
        }
    }
}
