<?php

test('the home page renders the Inertia shell', function () {
    $this->withoutVite()
        ->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('app'));
});

test('the share target fallback accepts nothing and redirects to the vault', function () {
    $this->post('/share-target', ['title' => 'x'])
        ->assertRedirect('/vault?shared=unavailable');
});
