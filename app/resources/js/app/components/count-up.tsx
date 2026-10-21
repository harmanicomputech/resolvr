import { animate, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';

/**
 * A number that counts up to its value when it first appears or changes.
 * The text is written directly (no re-render per frame); screen readers get
 * the final value through the label.
 */
export function CountUp({
    value,
    className,
    format = defaultFormat,
}: {
    value: number;
    className?: string;
    format?: (n: number) => string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const from = useRef(0);
    const reduce = useReducedMotion();

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const start = from.current;
        from.current = value;
        if (reduce || start === value) {
            node.textContent = format(value);
            return;
        }
        node.textContent = format(start);
        const controls = animate(start, value, {
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (n) => (node.textContent = format(n)),
        });
        return () => controls.stop();
    }, [value, reduce, format]);

    return <span ref={ref} className={className} />;
}

const defaultFormat = (n: number) => String(Math.round(n));
