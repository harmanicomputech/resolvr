<?php

namespace App\Http\Controllers;

use App\Models\ReminderSubscription;
use App\Push\Vapid;
use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Reminder schedules for web push. The device picks a random id and token;
 * the server stores the push address, the chosen time and a hash of the token.
 */
class ReminderController extends Controller
{
    public function key(): JsonResponse
    {
        $vapid = Vapid::fromConfig();

        return response()->json(['publicKey' => $vapid?->publicKey()], $vapid ? 200 : 503);
    }

    public function upsert(Request $request, string $id): JsonResponse
    {
        abort_unless(Vapid::fromConfig(), 503, 'Reminders are not set up on this server.');
        $token = $this->token($request);
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:1000', 'url:https'],
            'timezone' => ['required', 'string', Rule::in(DateTimeZone::listIdentifiers())],
            'time' => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days' => ['required', 'string', 'regex:/^[01]{7}$/', 'not_regex:/^0{7}$/'],
        ]);

        $sub = ReminderSubscription::find($id);
        if ($sub) {
            abort_unless($sub->allows($token), 403);
        }
        $sub ??= new ReminderSubscription(['id' => $id, 'token_hash' => hash('sha256', $token)]);
        $sub->fill([
            ...$data,
            'next_due_at' => ReminderSubscription::nextDue($data['time'], $data['days'], $data['timezone'], CarbonImmutable::now()),
        ]);
        $sub->failures = 0;
        $sub->save();

        return response()->json(['nextDueAt' => $sub->next_due_at->toIso8601String()]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $sub = ReminderSubscription::find($id);
        if ($sub) {
            abort_unless($sub->allows($this->token($request)), 403);
            $sub->delete();
        }

        return response()->noContent();
    }

    private function token(Request $request): string
    {
        $token = (string) $request->bearerToken();
        abort_unless(preg_match('/^[A-Za-z0-9_-]{43}$/', $token), 401);

        return $token;
    }
}
