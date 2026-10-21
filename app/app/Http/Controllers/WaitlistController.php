<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWaitlistRequest;
use App\Mail\WaitlistConfirmation;
use App\Models\WaitlistSignup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\View\View;

class WaitlistController extends Controller
{
    /**
     * Public endpoint used by resolvrapp.com.
     *
     * Always answers 202 with the same body, whether the address is new, already
     * on the list, or the request tripped the honeypot. That way the endpoint can't
     * be used to find out who has signed up.
     */
    public function store(StoreWaitlistRequest $request): JsonResponse
    {
        if (! $request->isBot()) {
            $signup = WaitlistSignup::firstOrCreate(
                ['email' => $request->normalisedEmail()],
                ['source' => $request->input('source')],
            );

            if ($signup->wasRecentlyCreated) {
                Mail::to($signup->email)->queue(new WaitlistConfirmation($signup));
                $signup->forceFill(['confirmation_sent_at' => now()])->save();
            }
        }

        return response()->json(['status' => 'ok'], 202);
    }

    /** Confirmation page for the signed unsubscribe link (a GET never deletes). */
    public function confirmUnsubscribe(WaitlistSignup $signup): View
    {
        return view('waitlist.unsubscribe', ['signup' => $signup, 'done' => false]);
    }

    public function unsubscribe(WaitlistSignup $signup): RedirectResponse
    {
        $signup->delete();

        return redirect()->route('waitlist.unsubscribed');
    }

    public function unsubscribed(): View
    {
        return view('waitlist.unsubscribe', ['signup' => null, 'done' => true]);
    }
}
