<?php

test('the waitlist endpoint allows the landing site origin', function () {
    config(['cors.allowed_origins' => ['https://resolvrapp.com']]);

    $this->call('OPTIONS', '/api/waitlist', server: [
        'HTTP_ORIGIN' => 'https://resolvrapp.com',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    ])->assertHeader('Access-Control-Allow-Origin', 'https://resolvrapp.com');
});

test('other origins are not allowed', function () {
    config(['cors.allowed_origins' => ['https://resolvrapp.com']]);

    $response = $this->call('OPTIONS', '/api/waitlist', server: [
        'HTTP_ORIGIN' => 'https://evil.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    ]);

    expect($response->headers->get('Access-Control-Allow-Origin'))->not->toBe('https://evil.example');
});
