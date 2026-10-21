/**
 * Stealth mode disguise: swap the manifest, icons, title and theme colour for
 * a generic calculator. This changes how the app appears in the browser tab
 * and for new installs. An already-installed app keeps the icon it was
 * installed with (browsers do not allow changing it), so the settings screen
 * explains how to reinstall it disguised.
 */
export function applyDisguise(on: boolean): void {
    const set = (selector: string, attr: string, value: string) =>
        document.querySelector(selector)?.setAttribute(attr, value);
    set('link[data-manifest]', 'href', on ? '/manifest-calculator.webmanifest' : '/manifest.webmanifest');
    set('link[data-favicon]', 'href', on ? '/icons/calculator-32.png' : '/icons/resolvr-32.png');
    set('link[data-touch-icon]', 'href', on ? '/icons/calculator-apple-180.png' : '/icons/resolvr-apple-180.png');
    set('meta[data-app-title]', 'content', on ? 'Calculator' : 'Resolvr');
    if (on) document.title = 'Calculator';
}
