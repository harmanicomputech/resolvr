import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

/**
 * A list item that fades up on arrival, glides when its neighbours change
 * (layout), and shrinks away on removal. Wrap the list in <AnimatePresence
 * initial={false}> for the exit. Plain fades under reduced motion.
 */
export function MotionItem({ children, ...props }: HTMLMotionProps<'li'>) {
    const reduce = useReducedMotion();
    return (
        <motion.li
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            {...props}
        >
            {children}
        </motion.li>
    );
}
