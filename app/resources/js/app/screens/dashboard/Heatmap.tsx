import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import type { HeatDay } from '@/lib/scoring/series';

import { ChartTooltip } from '../../components/chart-tooltip';

const level = [
    'var(--chart-heat-0)',
    'var(--chart-heat-1)',
    'var(--chart-heat-2)',
    'var(--chart-heat-3)',
    'var(--chart-heat-4)',
];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** 16 weeks of days, Monday first. Cells pop in column by column. */
export function Heatmap({ weeks }: { weeks: HeatDay[][] }) {
    const reduce = useReducedMotion();
    const [hover, setHover] = useState<{ w: number; d: number } | null>(null);
    const days = weeks.flat().filter((d) => !d.future);
    const active = days.filter((d) => d.count > 0);
    const busiest = active.reduce<HeatDay | null>((best, d) => (!best || d.count > best.count ? d : best), null);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const cell = hover ? weeks[hover.w]![hover.d]! : null;

    return (
        <div>
            <p className="sr-only">
                In the last 16 weeks, incidents were logged on {active.length} {active.length === 1 ? 'day' : 'days'}.
                {busiest && ` The busiest day was ${fmt(busiest.date)}, with ${busiest.count}.`}
            </p>
            <div className="relative flex max-w-md gap-2" aria-hidden onMouseLeave={() => setHover(null)}>
                <div className="grid grid-rows-7 gap-1 text-2xs leading-none text-fg-subtle">
                    {DAYS.map((d, i) => (
                        <span key={i} className="flex h-full items-center">
                            {d}
                        </span>
                    ))}
                </div>
                <div className="grid flex-1 grid-flow-col grid-cols-[repeat(16,minmax(0,1.125rem))] grid-rows-7 gap-1">
                    {weeks.map((week, w) =>
                        week.map((day, d) => (
                            <motion.span
                                key={`${w}-${d}`}
                                className="aspect-square rounded-[3px]"
                                style={{
                                    background: day.future ? 'transparent' : level[day.level],
                                    outline: day.future ? '1px solid var(--chart-grid)' : undefined,
                                    outlineOffset: -1,
                                }}
                                initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 30,
                                    delay: reduce ? 0 : 0.2 + w * 0.025,
                                }}
                                onMouseEnter={() => !day.future && setHover({ w, d })}
                            />
                        )),
                    )}
                </div>
                {cell && hover && (
                    <ChartTooltip
                        x={((hover.w + 0.5) / weeks.length) * 100}
                        y={(hover.d / 7) * 100}
                        align={hover.w < 3 ? 'left' : hover.w > weeks.length - 4 ? 'right' : 'center'}
                    >
                        <span className="font-medium">{fmt(cell.date)}</span>
                        <span className="ml-2 text-fg-muted">
                            {cell.count
                                ? `${cell.count} ${cell.count === 1 ? 'incident' : 'incidents'}`
                                : 'Nothing logged'}
                        </span>
                    </ChartTooltip>
                )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-2xs text-fg-subtle" aria-hidden>
                Fewer
                {level.map((l, i) => (
                    <span key={i} className="size-2.5 rounded-[2px]" style={{ background: l }} />
                ))}
                More
            </div>
        </div>
    );
}
