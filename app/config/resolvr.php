<?php

return [
    /*
     * Browser-based maintenance for hosting without a command line (cPanel or
     * DirectAdmin without SSH). Both are off while their token is empty.
     *
     * INSTALL_TOKEN unlocks /install (checks, database migrations, reminder
     * keys). Clear it once the app is set up.
     * CRON_TOKEN unlocks /cron/{token}, which runs the scheduled jobs; point
     * the host's cron panel (curl/wget) or an external pinger at it every minute.
     */
    'install_token' => env('INSTALL_TOKEN'),
    'cron_token' => env('CRON_TOKEN'),
];
