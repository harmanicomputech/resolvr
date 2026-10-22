import { ExternalLink, HeartHandshake, LifeBuoy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { lawPackFor } from '@/lib/laws/coverage';
import type { CheckIn } from '@/lib/model/schema';
import { listCheckIns, localDate, moodLabels, saveCheckIn, summarise } from '@/lib/wellbeing/checkins';

import { MoodPicker } from '../../components/mood-picker';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useSession } from '../../session';

/**
 * Wellbeing: an optional, private daily check-in and support close at hand.
 * Warm, never clinical; no streaks, scores or badges.
 */
export default function Wellbeing() {
    const session = useSession();
    const { data, loading } = useData(async (repos) => ({
        checkIns: await listCheckIns(repos),
        settings: await repos.singletons.settings(),
    }));
    if (loading && !data) return <Skeleton className="mt-4 h-96" />;
    if (!data) return null;
    const pack = lawPackFor(data.settings.jurisdiction);
    const on = data.settings.wellbeing.checkIn;
    const recent = data.checkIns.slice(-14);
    const hardTime = recent.length >= 3 && recent.slice(-5).filter((c) => c.mood <= 2).length >= 3;

    return (
        <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6 pt-2">
            <p className="max-w-2xl text-fg-muted">
                What is happening at work can weigh on you. This space is just for you: nothing here is shared unless
                you choose to include it in a case file.
            </p>

            {on ? (
                <TodayCard today={data.checkIns.find((c) => c.date === localDate())} />
            ) : (
                <section className="card flex flex-wrap items-center gap-4 p-5" aria-labelledby="invite">
                    <span className="icon-badge" data-size="lg" aria-hidden>
                        <HeartHandshake className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 basis-60">
                        <h2 id="invite" className="font-display text-lg font-semibold text-fg">
                            A quiet daily check-in
                        </h2>
                        <p className="text-sm text-fg-muted">
                            Once a day, note how you feel and one line about it. Over time it can show the toll this has
                            taken, in your own words. You can turn it off whenever you like.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() =>
                            void session.saveSettings({ wellbeing: { checkIn: true } }).then(session.refresh)
                        }
                    >
                        Turn on
                    </Button>
                </section>
            )}

            {hardTime && (
                <p className="card p-4 text-sm text-fg" role="note">
                    The last few days sound hard. You do not have to carry this alone: the people below are there to
                    listen, at any hour.
                </p>
            )}

            {data.checkIns.length > 0 && <Trend checkIns={data.checkIns} />}

            <section className="card p-5" aria-labelledby="support-title">
                <header className="mb-3 flex items-center gap-3">
                    <span className="icon-badge" aria-hidden>
                        <LifeBuoy className="size-4" />
                    </span>
                    <h2 id="support-title" className="font-display text-base font-semibold text-fg">
                        Support, {pack.name.replace(/ \(.*\)$/, '')}
                    </h2>
                </header>
                <ul className="divide-y divide-hairline">
                    {pack.support.map((r) => (
                        <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                            <div className="min-w-0 flex-1 basis-56">
                                <p className="font-medium text-fg">{r.name}</p>
                                <p className="text-fg-muted">{r.description}</p>
                            </div>
                            {r.contact && <span className="mono text-fg">{r.contact}</span>}
                            {r.url && (
                                <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="btn"
                                    data-size="sm"
                                >
                                    Visit <ExternalLink aria-hidden />
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs text-fg-subtle">
                    If you are in danger right now, call your local emergency number.
                </p>
            </section>

            {on && (
                <p className="text-center text-sm">
                    <button
                        type="button"
                        className="text-fg-muted underline underline-offset-2 hover:text-fg"
                        onClick={() =>
                            void session.saveSettings({ wellbeing: { checkIn: false } }).then(session.refresh)
                        }
                    >
                        Turn off daily check-ins
                    </button>
                </p>
            )}
        </div>
    );
}

export function TodayCard({ today, compact = false }: { today?: CheckIn; compact?: boolean }) {
    const session = useSession();
    const toast = useToast();
    const [mood, setMood] = useState<number | null>(today?.mood ?? null);
    const [note, setNote] = useState(today?.note ?? '');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        if (!session.repos || mood === null) return;
        setBusy(true);
        await saveCheckIn(session.repos, mood, note);
        setBusy(false);
        session.refresh();
        toast({ title: 'Noted', description: 'Thank you for checking in.', tone: 'success' });
    };

    return (
        <section className="card space-y-4 p-5" aria-labelledby="today-title">
            <h2 id="today-title" className="font-display text-base font-semibold text-fg">
                {today ? 'Today' : 'How are you today?'}
            </h2>
            <MoodPicker value={mood} onChange={setMood} name={compact ? 'mood-dash' : 'mood'} />
            {(mood !== null || !compact) && (
                <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <label htmlFor={compact ? 'note-dash' : 'note'} className="sr-only">
                        One line about today (optional)
                    </label>
                    <Input
                        id={compact ? 'note-dash' : 'note'}
                        className="min-w-0 flex-1 basis-56"
                        placeholder="One line about today"
                        maxLength={280}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <Button type="submit" variant="primary" disabled={mood === null || busy}>
                        {today ? 'Update' : 'Save'}
                    </Button>
                </form>
            )}
        </section>
    );
}

/** The last 30 check-ins as a quiet line, with a text summary for screen readers. */
function Trend({ checkIns }: { checkIns: CheckIn[] }) {
    const shown = checkIns.slice(-30);
    const s = summarise(checkIns);
    const w = 600;
    const hgt = 200;
    const pad = 12;
    const x = (i: number) => pad + (shown.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (shown.length - 1));
    const y = (m: number) => pad + ((5 - m) * (hgt - 2 * pad)) / 4;
    const path = shown.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c.mood).toFixed(1)}`).join(' ');
    const describe =
        s.change === 'lower'
            ? 'The last week has felt lower than the week before.'
            : s.change === 'higher'
              ? 'The last week has felt a little better than the week before.'
              : s.change === 'steady'
                ? 'The last two weeks have felt about the same.'
                : '';

    return (
        <section className="card p-5" aria-labelledby="trend-title">
            <h2 id="trend-title" className="mb-1 font-display text-base font-semibold text-fg">
                How things have felt
            </h2>
            <p className="text-sm text-fg-muted">
                {shown.length} {shown.length === 1 ? 'check-in' : 'check-ins'} shown{describe ? `. ${describe}` : '.'}
            </p>
            <svg
                viewBox={`0 0 ${w} ${hgt}`}
                className="mt-3 h-auto w-full"
                role="img"
                aria-label={`Mood over the last ${shown.length} check-ins. ${describe}`}
            >
                {[1, 2, 3, 4, 5].map((m) => (
                    <line
                        key={m}
                        x1={pad}
                        x2={w - pad}
                        y1={y(m)}
                        y2={y(m)}
                        className="stroke-[var(--chart-grid)]"
                        strokeWidth={1}
                    />
                ))}
                <path
                    d={path}
                    fill="none"
                    className="stroke-[var(--accent)]"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {shown.map((c, i) => (
                    <circle key={c.date} cx={x(i)} cy={y(c.mood)} r={3.5} className="fill-[var(--accent)]">
                        <title>{`${c.date}: ${moodLabels[c.mood - 1]}${c.note ? `. ${c.note}` : ''}`}</title>
                    </circle>
                ))}
            </svg>
            <div className="mt-1 flex justify-between text-xs text-fg-subtle" aria-hidden>
                <span>{shown[0]?.date}</span>
                <span>{shown[shown.length - 1]?.date}</span>
            </div>
            {shown.some((c) => c.note) && (
                <ul className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-sm">
                    {shown
                        .filter((c) => c.note)
                        .slice(-5)
                        .reverse()
                        .map((c) => (
                            <li key={c.date} className="flex gap-3">
                                <span className="w-24 shrink-0 text-fg-subtle tabular-nums">{c.date}</span>
                                <span className="text-fg">{c.note}</span>
                            </li>
                        ))}
                </ul>
            )}
        </section>
    );
}
