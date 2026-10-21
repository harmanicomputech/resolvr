<?php

test('the home page renders the Inertia shell', function () {
    $this->withoutVite()
        ->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('app'));
});
