import { Lightbulb, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    corroborationOptions,
    emotionalImpacts,
    evidenceCapturedOptions,
    frequencies,
    incidentTypeGroups,
    physicalImpacts,
    professionalImpacts,
    severities,
    whyNotReportedOptions,
    type Severity,
} from '@/lib/model/catalog';
import type { LogForm } from '@/lib/model/draft';
import { cn } from '@/lib/utils';

import { ChipGroup } from '../../components/chip-group';
import { NameTags } from '../../components/name-tags';

export interface StepProps {
    form: LogForm;
    update: (patch: Partial<LogForm>) => void;
    people: string[];
    showErrors: boolean;
}

/** A gentle, contextual writing prompt. */
export function Prompt({ children }: { children: ReactNode }) {
    return (
        <p className="flex items-start gap-2 rounded-(--radius-md) bg-accent-tint px-3 py-2 text-xs text-accent-text">
            <Lightbulb className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{children}</span>
        </p>
    );
}

function descriptionPrompt(text: string): string {
    if (!text.trim()) return 'Start with what happened, in your own words. You can tidy it up later.';
    if (!/["“”']/.test(text)) return 'Quote the exact words if you can remember them, in quotation marks.';
    if (text.length < 120) return 'A little more detail helps: who was there, and what happened right after?';
    return 'Good detail. Stick to what you saw and heard; it keeps your record strong.';
}

export function StepWhat({ form, update, showErrors }: StepProps) {
    return (
        <div className="space-y-5">
            <Field
                label="Short title"
                hint="A few words you will recognise later, e.g. “Shouted at in the 9am meeting”."
                error={showErrors && !form.title.trim() ? 'Add a short title' : undefined}
            >
                <Input
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                    maxLength={200}
                    autoFocus
                />
            </Field>
            <div className="space-y-2">
                <Field
                    label="What happened?"
                    error={showErrors && !form.description.trim() ? 'Describe what happened' : undefined}
                >
                    <Textarea
                        value={form.description}
                        onChange={(e) => update({ description: e.target.value })}
                        rows={7}
                    />
                </Field>
                <Prompt>{descriptionPrompt(form.description)}</Prompt>
            </div>
            <div className="grid items-start gap-5 sm:grid-cols-2">
                <Field label="When" hint="Your record keeps a separate, locked time for when you saved it.">
                    <Input
                        type="datetime-local"
                        value={form.occurredLocal}
                        max={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => update({ occurredLocal: e.target.value })}
                    />
                </Field>
                <Field label="Where">
                    <Input
                        value={form.location}
                        onChange={(e) => update({ location: e.target.value })}
                        placeholder="e.g. Meeting room 2, Teams call"
                    />
                </Field>
            </div>
        </div>
    );
}

export function StepType({ form, update, showErrors, jurisdiction }: StepProps & { jurisdiction: string }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const groups = useMemo(
        () =>
            incidentTypeGroups
                .map((g) => ({
                    ...g,
                    types: g.types.filter(
                        (t) => !q || t.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q),
                    ),
                }))
                .filter((g) => g.types.length),
        [q],
    );
    return (
        <div className="space-y-5">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                    aria-hidden
                />
                <label htmlFor="type-search" className="sr-only">
                    Search types
                </label>
                <Input
                    id="type-search"
                    className="pl-9"
                    placeholder="Search, e.g. “retaliation”"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            {showErrors && !form.types.length && (
                <p className="field-error" role="alert">
                    Choose at least one type. “Other” is fine.
                </p>
            )}
            {groups.map((group) => (
                <div key={group.id}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-fg">{group.label}</h3>
                        {jurisdiction === 'us' &&
                            group.lawRefs.map((law) => (
                                <span
                                    key={law}
                                    className="mono rounded-(--radius-sm) border border-hairline px-1.5 text-2xs text-fg-subtle"
                                >
                                    {law}
                                </span>
                            ))}
                    </div>
                    <ChipGroup
                        label={group.label}
                        hideLabel
                        options={group.types}
                        value={form.types}
                        onChange={(types) => update({ types })}
                    />
                </div>
            ))}
            {form.types.includes('Other') && (
                <Field label="Describe the other type">
                    <Input value={form.typeOther} onChange={(e) => update({ typeOther: e.target.value })} />
                </Field>
            )}
            <p className="text-xs text-fg-subtle">
                Law badges are general information about where these issues are often covered, not legal advice.
            </p>
        </div>
    );
}

export const severityInfo: Record<Severity, { label: string; text: string }> = {
    low: { label: 'Low', text: 'Uncomfortable or inappropriate, and a one-off so far.' },
    medium: { label: 'Medium', text: 'Clearly wrong or upsetting, or starting to repeat.' },
    high: { label: 'High', text: 'Seriously harmful or threatening, or it affected your job.' },
    critical: { label: 'Critical', text: 'Physical harm, a threat to your safety, or losing your job.' },
};

export function StepSeverity({ form, update, showErrors }: StepProps) {
    const index = form.severity ? severities.indexOf(form.severity) : -1;
    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="severity" className="sr-only">
                    Severity
                </label>
                <input
                    id="severity"
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={Math.max(0, index)}
                    onChange={(e) => update({ severity: severities[Number(e.target.value)] })}
                    aria-valuetext={form.severity ? severityInfo[form.severity].label : 'Not chosen'}
                    className="severity-range w-full"
                    data-severity={form.severity ?? 'none'}
                />
                <div className="mt-2 grid grid-cols-4 text-center text-xs text-fg-muted">
                    {severities.map((s) => (
                        <button
                            key={s}
                            type="button"
                            className={cn('rounded-(--radius-sm) py-1', form.severity === s && 'font-medium text-fg')}
                            onClick={() => update({ severity: s })}
                        >
                            {severityInfo[s].label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="card min-h-24 p-4" aria-live="polite">
                {form.severity ? (
                    <>
                        <span className="sev" data-severity={form.severity}>
                            {severityInfo[form.severity].label}
                        </span>
                        <p className="mt-2 text-sm text-fg">{severityInfo[form.severity].text}</p>
                    </>
                ) : (
                    <p className="text-sm text-fg-muted">
                        Move the slider or tap a level. Rate it honestly; there is no wrong answer.
                    </p>
                )}
            </div>
            {showErrors && !form.severity && (
                <p className="field-error" role="alert">
                    Choose a severity
                </p>
            )}
            <Field label="How often has this kind of thing happened?">
                <Select
                    value={form.frequency ?? ''}
                    onChange={(e) => update({ frequency: (e.target.value || undefined) as LogForm['frequency'] })}
                >
                    <option value="">Not sure / skip</option>
                    {frequencies.map((f) => (
                        <option key={f}>{f}</option>
                    ))}
                </Select>
            </Field>
        </div>
    );
}

const statementLabels = {
    'not-asked': 'Not asked yet',
    requested: 'Asked for a statement',
    given: 'Statement given',
    declined: 'Declined',
} as const;

export function StepPeople({ form, update, people }: StepProps) {
    return (
        <div className="space-y-6">
            <NameTags
                label="Who was responsible?"
                hint="Their name as you would write it in a complaint."
                value={form.responsible}
                onChange={(responsible) => update({ responsible })}
                suggestions={people}
            />
            <div className="space-y-3">
                <NameTags
                    label="Who saw or heard it?"
                    hint="Witnesses make a record much stronger."
                    value={form.witnesses.map((w) => w.name)}
                    onChange={(names) =>
                        update({
                            witnesses: names.map(
                                (name) =>
                                    form.witnesses.find((w) => w.name === name) ?? { name, statement: 'not-asked' },
                            ),
                        })
                    }
                    suggestions={people}
                />
                {form.witnesses.map((w) => (
                    <div key={w.name} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="min-w-24 text-fg">{w.name}</span>
                        <label className="sr-only" htmlFor={`stmt-${w.name}`}>
                            Statement from {w.name}
                        </label>
                        <Select
                            id={`stmt-${w.name}`}
                            className="w-auto"
                            value={w.statement}
                            onChange={(e) =>
                                update({
                                    witnesses: form.witnesses.map((x) =>
                                        x.name === w.name
                                            ? { ...x, statement: e.target.value as typeof w.statement }
                                            : x,
                                    ),
                                })
                            }
                        >
                            {Object.entries(statementLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </div>
                ))}
            </div>
            <Field label="Anyone else affected?" hint="Others who were treated the same way, if you know.">
                <Input value={form.othersAffected} onChange={(e) => update({ othersAffected: e.target.value })} />
            </Field>
            <Field label="Has anyone else experienced something similar?">
                <Select
                    value={form.corroboration ?? ''}
                    onChange={(e) =>
                        update({ corroboration: (e.target.value || undefined) as LogForm['corroboration'] })
                    }
                >
                    <option value="">Skip</option>
                    {corroborationOptions.map((o) => (
                        <option key={o}>{o}</option>
                    ))}
                </Select>
            </Field>
        </div>
    );
}

const reportedChoices = [
    { value: 'yes', label: 'Yes, formally' },
    { value: 'informal', label: 'Informally' },
    { value: 'no', label: 'Not yet' },
] as const;

export function StepReporting({ form, update }: StepProps) {
    return (
        <div className="space-y-5">
            <div>
                <p className="mb-2 text-sm font-medium text-fg">Have you reported it?</p>
                <SegmentedControl
                    label="Have you reported it?"
                    value={form.reported ?? ('' as never)}
                    onValueChange={(reported) => update({ reported })}
                    options={reportedChoices}
                />
            </div>
            {(form.reported === 'yes' || form.reported === 'informal') && (
                <>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Who did you tell?">
                            <Input
                                value={form.reportedTo}
                                onChange={(e) => update({ reportedTo: e.target.value })}
                                placeholder="e.g. HR, my team lead"
                            />
                        </Field>
                        <Field label="When?">
                            <Input
                                type="date"
                                value={form.reportedOn}
                                onChange={(e) => update({ reportedOn: e.target.value })}
                            />
                        </Field>
                    </div>
                    <Field label="What did they say or do?">
                        <Textarea
                            rows={3}
                            value={form.reportedResponse}
                            onChange={(e) => update({ reportedResponse: e.target.value })}
                        />
                    </Field>
                </>
            )}
            {form.reported === 'no' && (
                <Field
                    label="What has held you back? (optional)"
                    hint="This is common, and it is fine. It can help explain timing later."
                >
                    <Select
                        value={form.whyNotReported ?? ''}
                        onChange={(e) =>
                            update({ whyNotReported: (e.target.value || undefined) as LogForm['whyNotReported'] })
                        }
                    >
                        <option value="">Skip</option>
                        {whyNotReportedOptions.map((o) => (
                            <option key={o}>{o}</option>
                        ))}
                    </Select>
                </Field>
            )}
            <Field label="What led up to it?" hint="Anything that happened before, if relevant.">
                <Textarea rows={3} value={form.context} onChange={(e) => update({ context: e.target.value })} />
            </Field>
            <Field label="How did you respond?">
                <Textarea rows={3} value={form.response} onChange={(e) => update({ response: e.target.value })} />
            </Field>
        </div>
    );
}

export function StepImpact({ form, update }: StepProps) {
    return (
        <div className="space-y-6">
            <ChipGroup
                label="How did it make you feel?"
                options={emotionalImpacts}
                value={form.emotionalImpacts}
                onChange={(emotionalImpacts) => update({ emotionalImpacts })}
            />
            <ChipGroup
                label="Any effect on your health?"
                options={physicalImpacts}
                value={form.physicalImpacts}
                onChange={(physicalImpacts) => update({ physicalImpacts })}
            />
            <ChipGroup
                label="Any effect on your work?"
                options={professionalImpacts}
                value={form.professionalImpacts}
                onChange={(professionalImpacts) => update({ professionalImpacts })}
            />
            <Field
                label="In your own words (optional)"
                hint="How this has affected you. Only you decide if this is ever shared."
            >
                <Textarea
                    rows={4}
                    value={form.impactStatement}
                    onChange={(e) => update({ impactStatement: e.target.value })}
                />
            </Field>
        </div>
    );
}

export function StepEvidenceChips({ form, update }: StepProps) {
    return (
        <ChipGroup
            label="What did you keep at the time?"
            options={evidenceCapturedOptions}
            value={form.evidenceCaptured}
            onChange={(evidenceCaptured) => update({ evidenceCaptured })}
        />
    );
}
