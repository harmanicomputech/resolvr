import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, ChartArea, ChartPie, Gauge, Hourglass, ListChecks, Plus, Scale, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { greeting } from '@/lib/scoring/series';
import { cn } from '@/lib/utils';

import { useNavigate } from '../../hooks/use-navigate';
import { useTilt } from '../../hooks/use-tilt';
import { useSession } from '../../session';
import { CoverageChips, PatternList, RecentList, StatTiles } from './Cards';
import { DashCard, type DragHandleProps } from './DashCard';
import { TodayCard } from '../wellbeing/Wellbeing';
import { DeadlineTracker } from './Deadlines';
import { FirstRun } from './FirstRun';
import { Heatmap } from './Heatmap';
import { ReadinessPath } from './ReadinessPath';
import { ScoreGauge } from './ScoreGauge';
import { SeverityDonut } from './SeverityDonut';
import { TrendChart } from './TrendChart';
import { useCaseData, type CaseData } from './use-case-data';

type CardId = 'score' | 'trend' | 'deadlines' | 'coverage' | 'severity' | 'heatmap' | 'patterns' | 'recent';
const DEFAULT_ORDER: CardId[] = [
    'score',
    'trend',
    'deadlines',
    'coverage',
    'severity',
    'heatmap',
    'patterns',
    'recent',
];
const ORDER_KEY = 'resolvr:dashboard-order';

/** Column span on the 6-column desktop grid. */
const span: Record<CardId, string> = {
    score: 'lg:col-span-2',
    trend: 'lg:col-span-4',
    severity: 'lg:col-span-2',
    heatmap: 'lg:col-span-4',
    deadlines: 'lg:col-span-3',
    coverage: 'lg:col-span-3',
    patterns: 'lg:col-span-6',
    recent: 'lg:col-span-6',
};

function loadOrder(): CardId[] {
    try {
        const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as CardId[];
        const valid = saved.filter((id) => DEFAULT_ORDER.includes(id));
        // Keep the user's order; cards added in later versions join at their default place.
        const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
        for (const id of missing) valid.splice(Math.min(DEFAULT_ORDER.indexOf(id), valid.length), 0, id);
        return valid;
    } catch {
        return DEFAULT_ORDER;
    }
}

/** The case home. */
export default function Dashboard() {
    const { data, loading } = useCaseData();
    const navigate = useNavigate();
    const reduce = useReducedMotion();

    if (!data && loading) return <DashboardSkeleton />;
    if (!data) return null;
    if (!data.incidents.length)
        return (
            <div className="space-y-4">
                {data.checkInToday === null && <TodayCard compact />}
                <FirstRun name={firstName(data.profile.fullName)} />
            </div>
        );

    return (
        <div className="space-y-4">
            <motion.section
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4 pt-2 pb-2 md:flex-row md:items-end"
            >
                <div className="flex-1">
                    <p className="text-sm text-fg-muted">
                        {greeting()}
                        {firstName(data.profile.fullName) ? `, ${firstName(data.profile.fullName)}` : ''}
                    </p>
                    <p className="mt-1 max-w-2xl font-display text-2xl leading-snug font-semibold tracking-tight text-fg md:text-3xl">
                        {data.summary}
                    </p>
                </div>
                <Button variant="primary" onClick={() => navigate('/log')} className="self-start md:self-auto">
                    <Plus aria-hidden /> Log incident
                </Button>
            </motion.section>
            {data.checkInToday === null && <TodayCard compact />}

            <ReadinessPath readiness={data.readiness} />
            <StatTiles stats={data.stats} />
            <Bento data={data} />
            <p className="pt-2 text-center text-xs text-fg-subtle">
                Resolvr helps you organise your record. It is not legal advice.
            </p>
        </div>
    );
}

function Bento({ data }: { data: CaseData }) {
    const [order, setOrder] = useState<CardId[]>(loadOrder);
    const grid = useRef<HTMLDivElement>(null);
    useTilt(useSession().settings?.tilt ?? false, grid);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        setOrder((current) => {
            const next = arrayMove(current, current.indexOf(active.id as CardId), current.indexOf(over.id as CardId));
            try {
                localStorage.setItem(ORDER_KEY, JSON.stringify(next));
            } catch {
                // Order just is not remembered.
            }
            return next;
        });
    };

    const render = (id: CardId, handle: DragHandleProps): ReactNode => {
        switch (id) {
            case 'score':
                return (
                    <DashCard title="Evidence strength" icon={<Gauge className="size-4" />} handle={handle}>
                        <ScoreGauge score={data.score} />
                    </DashCard>
                );
            case 'trend':
                return (
                    <DashCard title="Last six months" icon={<ChartArea className="size-4" />} handle={handle}>
                        <TrendChart months={data.months} />
                    </DashCard>
                );
            case 'severity':
                return (
                    <DashCard title="By severity" icon={<ChartPie className="size-4" />} handle={handle}>
                        <SeverityDonut counts={data.severity} />
                    </DashCard>
                );
            case 'heatmap':
                return (
                    <DashCard title="Last 16 weeks" icon={<CalendarDays className="size-4" />} handle={handle}>
                        <Heatmap weeks={data.heat} />
                    </DashCard>
                );
            case 'patterns':
                return (
                    <DashCard title="Patterns" icon={<Sparkles className="size-4" />} handle={handle}>
                        <PatternList patterns={data.patterns} />
                    </DashCard>
                );
            case 'coverage':
                return (
                    <DashCard title="Laws that may apply" icon={<Scale className="size-4" />} handle={handle}>
                        <CoverageChips coverage={data.coverage} />
                    </DashCard>
                );
            case 'deadlines':
                return (
                    <DashCard title="Time limits" icon={<Hourglass className="size-4" />} handle={handle}>
                        <DeadlineTracker summary={data.deadlines} pack={data.pack} />
                    </DashCard>
                );
            case 'recent':
                return (
                    <DashCard title="Recent incidents" icon={<ListChecks className="size-4" />} handle={handle}>
                        <RecentList incidents={data.incidents} />
                    </DashCard>
                );
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
                screenReaderInstructions: {
                    draggable:
                        'To move a card, press space or enter, use the arrow keys, then press space or enter again to drop it.',
                },
            }}
        >
            <SortableContext items={order} strategy={rectSortingStrategy}>
                <div ref={grid} className="tilt-scope grid grid-flow-dense grid-cols-1 gap-4 lg:grid-cols-6">
                    {order.map((id, i) => (
                        <SortableCard key={id} id={id} index={i} className={span[id]}>
                            {(handle) => render(id, handle)}
                        </SortableCard>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableCard({
    id,
    index,
    className,
    children,
}: {
    id: CardId;
    index: number;
    className: string;
    children: (handle: DragHandleProps) => ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const reduce = useReducedMotion();
    return (
        <motion.div
            ref={setNodeRef}
            className={cn(className, isDragging && 'relative z-10 [&>section]:shadow-(--shadow-floating)')}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min(index * 0.03, 0.12) }}
        >
            {children({
                attributes: attributes as unknown as Record<string, unknown>,
                listeners: listeners as Record<string, unknown> | undefined,
            })}
        </motion.div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-4 pt-2" aria-busy="true" aria-label="Opening your record">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-36" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-6">
                <Skeleton className="h-64 lg:col-span-2" />
                <Skeleton className="h-64 lg:col-span-4" />
            </div>
        </div>
    );
}

export function firstName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] ?? '';
}
