import { jurisdictions, type Jurisdiction } from '@/lib/model/catalog';

import { jurisdictionInfo } from '../lib/jurisdictions';

/** Where the user works: a two-column radio grid of jurisdiction packs. */
export function JurisdictionPicker({
    value,
    onChange,
    name = 'jurisdiction',
}: {
    value: Jurisdiction;
    onChange: (value: Jurisdiction) => void;
    name?: string;
}) {
    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {jurisdictions.map((j) => (
                    <label
                        key={j}
                        className="card flex cursor-pointer items-center gap-2 p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-tint has-[:focus-visible]:shadow-[var(--focus-ring)]"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={j}
                            checked={value === j}
                            onChange={() => onChange(j)}
                            className="sr-only"
                        />
                        <span className="mono text-xs text-fg-muted">{jurisdictionInfo[j].short}</span>
                        <span className="text-fg">{jurisdictionInfo[j].name}</span>
                    </label>
                ))}
            </div>
            {!jurisdictionInfo[value].ready && (
                <p className="mt-2 text-xs text-fg-muted">
                    Detailed guidance for {jurisdictionInfo[value].name} is on its way. Logging and evidence work fully
                    today.
                </p>
            )}
        </>
    );
}
