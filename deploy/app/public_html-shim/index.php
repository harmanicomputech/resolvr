<?php

/*
 * public_html shim, for hosts that do not allow public_html to be a symlink.
 * release.sh (PUBLIC_MODE=shim) copies the app's public/ assets next to this
 * file on every release; this file boots the app from ../current.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$root = dirname(__DIR__).'/current';

if (file_exists($maintenance = $root.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $root.'/vendor/autoload.php';

/** @var Illuminate\Foundation\Application $app */
$app = require_once $root.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$app->handleRequest(Request::capture());
