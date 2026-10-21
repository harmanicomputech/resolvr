import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { SeverityPill } from '@/components/ui/severity-pill';
import type { LogForm } from '@/lib/model/draft';

const fmt = (local: string) =>
    local ? new Date(local).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '–';

function Section({
    title,
    step,
    onEdit,
    children,
}: {
    title: string;
    step: number;
    onEdit: (step: number) => void;
    children: ReactNode;
}) {
    return (
        <section className="border-b border-hairline py-4 last:border-0">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-fg">{title}</h3>
                <button type="button" className="btn" data-variant="ghost" data-size="sm" onClick={() => onEdit(step)}>
                    <Pencil aria-hidden /> Edit <span className="sr-only">{title.toLowerCase()}</span>
                </button>
            </div>
            <div className="space-y-1 text-sm text-fg-muted">{children}</div>
        </section>
    );
}

const list = (items: string[]) => (items.length ? items.join(', ') : '–');

/** Everything at a glance before it is locked. */
export function Review({
    form,
    onEdit,
    fileCount,
}: {
    form: LogForm;
    onEdit: (step: number) => void;
    fileCount: number;
}) {
    return (
        <div>
            <Section title="What happened" step={0} onEdit={onEdit}>
                <p className="font-medium text-fg">{form.title || '–'}</p>
                <p className="whitespace-pre-wrap">{form.description || '–'}</p>
                <p>
                    {fmt(form.occurredLocal)}
                    {form.location && ` · ${form.location}`}
                </p>
            </Section>
            <Section title="Type" step={1} onEdit={onEdit}>
                <p>{list(form.types)}</p>
            </Section>
            <Section title="Severity" step={2} onEdit={onEdit}>
                {form.severity ? <SeverityPill severity={form.severity} /> : <p>–</p>}
                {form.frequency && <p>{form.frequency}</p>}
            </Section>
            <Section title="People" step={3} onEdit={onEdit}>
                <p>Responsible: {list(form.responsible)}</p>
                <p>Witnesses: {list(form.witnesses.map((w) => w.name))}</p>
            </Section>
            <Section title="Reporting" step={4} onEdit={onEdit}>
                <p>
                    {form.reported === 'yes'
                        ? `Reported to ${form.reportedTo || '–'}`
                        : form.reported === 'informal'
                          ? `Mentioned informally to ${form.reportedTo || '–'}`
                          : form.reported === 'no'
                            ? 'Not reported yet'
                            : '–'}
                </p>
            </Section>
            <Section title="Impact" step={5} onEdit={onEdit}>
                <p>{list([...form.emotionalImpacts, ...form.physicalImpacts, ...form.professionalImpacts])}</p>
            </Section>
            <Section title="Evidence" step={6} onEdit={onEdit}>
                <p>
                    {fileCount} {fileCount === 1 ? 'file' : 'files'} attached
                    {form.evidenceCaptured.length > 0 && ` · ${list(form.evidenceCaptured)}`}
                </p>
            </Section>
        </div>
    );
}
