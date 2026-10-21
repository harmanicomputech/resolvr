import '../styles/main.css';

import Alpine from 'alpinejs';

declare global {
    interface Window {
        Alpine: typeof Alpine;
    }
}

// Smooth scroll (Lenis + GSAP ScrollTrigger), nav and cursor arrive in P1.1.
window.Alpine = Alpine;
Alpine.start();
