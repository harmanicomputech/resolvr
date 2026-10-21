/** Blur-up: mark photos as loaded once decoded so CSS can fade them in sharp. */
export function initPhotos(): void {
    document.querySelectorAll<HTMLImageElement>('.photo img, .fragment-photo img').forEach((img) => {
        const done = () => img.setAttribute('data-loaded', '');
        if (img.complete && img.naturalWidth > 0) done();
        else {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        }
    });
}
