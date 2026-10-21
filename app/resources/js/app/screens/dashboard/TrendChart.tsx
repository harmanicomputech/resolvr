import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import type { MonthCount } from '@/lib/scoring/series';

import { ChartTooltip } from '../../components/chart-tooltip';
import { useSize } from '../../hooks/use-size';

const HEIGHT = 168;
const PAD = { top: 16, right: 16, bottom: 26, left: 28 };

/** Incidents per month: a 2px line over a 10% wash, end value labelled, crosshair on hover/focus. */
export function TrendChart({ months }: { months: MonthCount[] }) {
    const [ref, { width }] = useSize<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);
    const reduce = useReducedMotion();

    const max = Math.max(2, ...months.map((m) => m.count));
    const niceMax = max <= 4 ? max : Math.ceil(max / 2) * 2;
    const ticks = niceMax <= 4 ? Array.from({ length: niceMax + 1 }, (_, i) => i) : [0, niceMax / 2, niceMax];
    const innerW = Math.max(0, width - PAD.left - PAD.right);
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (months.length === 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
    const line = months.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m.count)}`).join(' ');
    const area = `${line} L${x(months.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    const last = months.length - 1;

    return (
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
            {width > 0 && (
                <svg width={width} height={HEIGHT} aria-hidden className="block overflow-visible">
                    {ticks.map((t) => (
                        <g key={t}>
                            <line
                                x1={PAD.left}
                                x2={width - PAD.right}
                                y1={y(t)}
                                y2={y(t)}
                                stroke="var(--chart-grid)"
                                strokeWidth={1}
                            />
                            <text
                                x={PAD.left - 8}
                                y={y(t)}
                                dy="0.32em"
                                textAnchor="end"
                                className="fill-fg-subtle text-2xs tabular-nums"
                            >
                                {t}
                            </text>
                        </g>
                    ))}
                    {months.map((m, i) => (
                        <text
                            key={m.label + i}
                            x={x(i)}
                            y={HEIGHT - 6}
                            textAnchor="middle"
                            className={hover === i ? 'fill-fg text-2xs' : 'fill-fg-subtle text-2xs'}
                        >
                            {m.label}
                        </text>
                    ))}
                    <motion.path
                        d={area}
                        fill="var(--accent)"
                        fillOpacity={0.1}
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    />
                    <motion.path
                        d={line}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {hover !== null && (
                        <line
                            x1={x(hover)}
                            x2={x(hover)}
                            y1={PAD.top}
                            y2={y(0)}
                            stroke="var(--hairline-strong)"
                            strokeWidth={1}
                        />
                    )}
                    {(hover === null ? [last] : [hover]).map((i) => (
                        <circle
                            key={i}
                            cx={x(i)}
                            cy={y(months[i]!.count)}
                            r={4.5}
                            fill="var(--accent)"
                            stroke="var(--surface)"
                            strokeWidth={2}
                        />
                    ))}
                    {hover === null && (
                        <text
                            x={x(last)}
                            y={y(months[last]!.count) - 10}
                            textAnchor="middle"
                            className="fill-fg text-xs font-medium tabular-nums"
                        >
                            {months[last]!.count}
                        </text>
                    )}
                    {/* Hit targets: one full-height band per month. */}
                    {months.map((m, i) => (
                        <rect
                            key={`hit-${i}`}
                            x={x(i) - innerW / (months.length - 1 || 1) / 2}
                            y={0}
                            width={innerW / (months.length - 1 || 1)}
                            height={HEIGHT}
                            fill="transparent"
                            onMouseEnter={() => setHover(i)}
                            onTouchStart={() => setHover(i)}
                        />
                    ))}
                </svg>
            )}
            {hover !== null && width > 0 && (
                <ChartTooltip
                    x={(x(hover) / width) * 100}
                    y={(y(months[hover]!.count) / HEIGHT) * 100}
                    align={hover === 0 ? 'left' : hover === last ? 'right' : 'center'}
                >
                    <span className="font-medium">
                        {months[hover]!.start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="ml-2 text-fg-muted">
                        {months[hover]!.count} {months[hover]!.count === 1 ? 'incident' : 'incidents'}
                    </span>
                </ChartTooltip>
            )}
            <div className="sr-only">
                <table>
                    <caption>Incidents per month</caption>
                    <thead>
                        <tr>
                            <th scope="col">Month</th>
                            <th scope="col">Incidents</th>
                        </tr>
                    </thead>
                    <tbody>
                        {months.map((m) => (
                            <tr key={m.start.toISOString()}>
                                <td>{m.start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</td>
                                <td>{m.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
