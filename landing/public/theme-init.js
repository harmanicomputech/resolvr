/* Applies a saved dark-mode choice before first paint (light is the default). Kept tiny and render-blocking on purpose. */
(function () {
    try {
        if (localStorage.getItem('resolvr-theme') === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {
        /* Storage unavailable: stay light. */
    }
})();
