import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

/** A tick that draws itself in, for moments of success. Static under reduced motion. */
export function CheckDraw({ className, strokeWidth = 2.5 }: { className?: string; strokeWidth?: number }) {
    const reduce = useReducedMotion();
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn('size-4', className)}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
        </svg>
    );
}
