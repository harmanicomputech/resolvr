import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'wouter';

/**
 * Navigate with a View Transition where the browser supports it (a soft
 * cross-fade defined in screens.css), and instantly under reduced motion.
 */
export function useNavigate(): (to: string, options?: { replace?: boolean }) => void {
    const [, navigate] = useLocation();
    return useCallback(
        (to, options) => {
            const go = () => navigate(to, options);
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!document.startViewTransition || reduce) return go();
            document.startViewTransition(() => flushSync(go));
        },
        [navigate],
    );
}
