<?php

namespace App\Http\Controllers;

use App\Ai\ClaudeStream;
use App\Ai\DocumentPrompt;
use App\Ai\DraftingUnavailable;
use App\Http\Requests\DraftDocumentRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Drafts a document from the fields the person chose to send, streaming the
 * text back as server-sent events:
 *
 *   event: delta    data: {"text": "..."}
 *   event: done     data: {"stopReason": "end_turn"}
 *   event: refused  data: {}          (discard anything received)
 *   event: error    data: {"message": "..."}
 *
 * Nothing about the request is stored or logged.
 */
class AiDocumentController extends Controller
{
    public function __invoke(DraftDocumentRequest $request, ClaudeStream $claude): StreamedResponse|JsonResponse
    {
        if (! config('services.anthropic.key')) {
            return response()->json(['message' => 'AI drafting is not set up on this server yet.'], 503);
        }

        $prompt = new DocumentPrompt($request->validated());
        $maxTokens = $request->input('mode') === 'rewrite' ? 2000 : 16000;

        return response()->stream(function () use ($claude, $prompt, $maxTokens) {
            $send = function (string $event, array $data = []) {
                echo "event: {$event}\ndata: ".json_encode((object) $data)."\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            try {
                $send('start');
                $result = $claude->stream($prompt->system(), $prompt->user(), fn (string $text) => $send('delta', ['text' => $text]), $maxTokens);
                $result['stop_reason'] === 'refusal'
                    ? $send('refused')
                    : $send('done', ['stopReason' => $result['stop_reason']]);
            } catch (DraftingUnavailable $e) {
                $send('error', ['message' => $e->getMessage()]);
            } catch (Throwable $e) {
                // Report the kind of failure only: messages can echo request content.
                report(new \RuntimeException('AI drafting failed: '.$e::class));
                $send('error', ['message' => 'The draft could not be finished. Please try again.']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
