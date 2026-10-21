<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>You're on the Resolvr waitlist</title>
</head>
{{-- Email clients ignore external CSS, so colours here are inline and mirror tokens.css (paper theme). --}}
<body style="margin:0;padding:0;background:#f7f5f0;font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#1a1814;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid rgba(26,24,20,0.1);border-radius:16px;">
                    <tr>
                        <td style="padding:36px 32px 8px;">
                            <p style="margin:0;font-weight:700;letter-spacing:-0.03em;font-size:24px;">Resolvr</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 32px 8px;font-size:16px;line-height:1.6;">
                            <p style="margin:0 0 16px;">You're on the waitlist. Thank you.</p>
                            <p style="margin:0 0 16px;color:#57524a;">We'll email you when Resolvr opens more widely, and only about that. We won't share your address, and we don't send marketing from partners.</p>
                            <p style="margin:0 0 24px;color:#57524a;">You don't need to wait to start a private record: the app works today at
                                <a href="{{ config('app.url') }}" style="color:#0f766e;">{{ preg_replace('#^https?://#', '', config('app.url')) }}</a>.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 32px;font-size:13px;line-height:1.5;color:#57524a;border-top:1px solid rgba(26,24,20,0.1);">
                            <p style="margin:20px 0 8px;"><strong style="color:#1a1814;">Not legal advice.</strong> Resolvr helps you keep an organised record. It is not a law firm.</p>
                            <p style="margin:0;">Didn't sign up, or changed your mind? <a href="{{ $unsubscribeUrl }}" style="color:#0f766e;">Remove me from the list</a>.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
