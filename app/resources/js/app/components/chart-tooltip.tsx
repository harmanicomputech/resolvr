import type { ReactNode } from 'react';

/**
 * Hover/focus tooltip for charts, positioned in the chart's own coordinate
 * box (percentages), so it needs no measuring. Values are always also
 * available as visible labels or a text alternative; this only adds detail.
 */
export function ChartTooltip({
    x,
    y,
    children,
    align = 'center',
}: {
    x: number;
    y: number;
    children: ReactNode;
    align?: 'center' | 'left' | 'right';
}) {
    return (
        <div
            role="presentation"
            className="pointer-events-none absolute z-10 -translate-y-full rounded-(--radius-md) border border-hairline bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-fg shadow-(--shadow-floating)"
            style={{
                left: `${x}%`,
                top: `calc(${y}% - 8px)`,
                transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -100%)`,
            }}
        >
            {children}
        </div>
    );
}
