<?php

test('the design review page is not routed outside local', function () {
    // The test environment is "testing", so the route must not exist.
    $this->get('/design')->assertNotFound();
});
