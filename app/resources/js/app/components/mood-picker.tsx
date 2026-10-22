import { cn } from '@/lib/utils';
import { moodLabels } from '@/lib/wellbeing/checkins';

/**
 * A five-point mood scale as a radio group. Words, not faces: each option is
 * a circle that fills a little more, with its label beneath.
 */
export function MoodPicker({
    value,
    onChange,
    name = 'mood',
    label = 'How are you feeling today?',
}: {
    value: number | null;
    onChange: (mood: number) => void;
    name?: string;
    label?: string;
}) {
    return (
        <fieldset>
            <legend className="sr-only">{label}</legend>
            <div className="grid grid-cols-5 gap-1.5">
                {moodLabels.map((text, i) => {
                    const mood = i + 1;
                    return (
                        <label
                            key={mood}
                            className={cn(
                                'flex cursor-pointer flex-col items-center gap-1.5 rounded-(--radius-md) border border-transparent px-1 py-2 text-center text-xs text-fg-muted transition-colors hover:bg-raised has-[:checked]:border-accent has-[:checked]:bg-accent-tint has-[:checked]:text-accent-text has-[:focus-visible]:shadow-[var(--focus-ring)]',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={mood}
                                checked={value === mood}
                                onChange={() => onChange(mood)}
                                className="sr-only"
                            />
                            <span
                                aria-hidden
                                className="grid size-8 place-items-center rounded-full border-2 border-accent"
                            >
                                <span
                                    className="rounded-full bg-accent"
                                    style={{ width: `${mood * 20}%`, height: `${mood * 20}%` }}
                                />
                            </span>
                            {text}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
