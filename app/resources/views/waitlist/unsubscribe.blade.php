<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Waitlist · Resolvr</title>
    @vite(['resources/css/app.css'])
</head>
<body class="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
    <main class="card w-full max-w-md space-y-4 p-8 text-center">
        <p class="wordmark text-4xl">Resolvr</p>
        @if ($done)
            <h1 class="display text-2xl">You've been removed.</h1>
            <p class="text-sm text-fg-muted">Your email address has been deleted from the waitlist. We won't contact you again.</p>
        @else
            <h1 class="display text-2xl">Leave the waitlist?</h1>
            <p class="text-sm text-fg-muted">This deletes your email address from our list. You can sign up again any time.</p>
            <form method="POST" action="{{ request()->fullUrl() }}">
                @csrf
                <button type="submit" class="btn w-full" data-variant="primary">Remove me</button>
            </form>
        @endif
    </main>
</body>
</html>
