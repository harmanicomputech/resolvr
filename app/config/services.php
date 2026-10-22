<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // AI drafting (P2.10). The key stays on the server; browsers never see it.
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-opus-5-5'),
        'url' => env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
    ],

    // End-to-end encrypted backups (P2.12). Files are ciphertext, kept outside
    // the web root. Chunks stay well under typical shared-hosting upload limits.
    'backups' => [
        'path' => env('BACKUP_PATH', storage_path('app/backups')),
        'max_bytes' => (int) env('BACKUP_MAX_BYTES', 250 * 1024 * 1024),
        'total_bytes' => (int) env('BACKUP_TOTAL_BYTES', 20 * 1024 * 1024 * 1024),
        'chunk_bytes' => (int) env('BACKUP_CHUNK_BYTES', 4 * 1024 * 1024),
    ],

    // Web push reminders (P2.12). Generate keys with `php artisan resolvr:vapid-keys`.
    'webpush' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT', 'mailto:resolvrapp@resolvrapp.com'),
    ],

];
