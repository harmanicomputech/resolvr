import { useLayoutEffect, useRef, useState } from 'react';

/** Width and height of an element, kept up to date with ResizeObserver. */
export function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return [ref, size];
}
