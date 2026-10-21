import { Document, Page, Text, View } from '@react-pdf/renderer';

import type { LedgerEntry } from '@/lib/db';
import type { EvidenceFile, Incident, Person } from '@/lib/model/schema';

import { makeStyles, NOT_LEGAL_ADVICE, pdfColors, type PdfPalette, type PdfStyles } from './theme';

export interface IncidentContext {
    people: Map<string, Person>;
    files: Map<string, EvidenceFile>;
}

const dt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
const severityLabel = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as const;

function Field({ s, label, value }: { s: PdfStyles; label: string; value?: string }) {
    if (!value || !value.trim()) return null;
    return (
        <View wrap={false} style={{ marginBottom: 6 }}>
            <Text style={s.label}>{label}</Text>
            <Text>{value}</Text>
        </View>
    );
}

/** One incident's full record. Reused by the case dossier. */
export function IncidentBlock({
    incident,
    ctx,
    s,
    c,
    history,
}: {
    incident: Incident;
    ctx: IncidentContext;
    s: PdfStyles;
    c: PdfPalette;
    history?: LedgerEntry[];
}) {
    const i = incident.content;
    const name = (id: string) => ctx.people.get(id)?.name ?? 'Unknown';
    const reported =
        i.reported === 'yes'
            ? `Yes, to ${i.reportedTo || 'unspecified'}${i.reportedOn ? ` on ${i.reportedOn}` : ''}`
            : i.reported === 'informal'
              ? `Informally, to ${i.reportedTo || 'unspecified'}`
              : i.reported === 'no'
                ? `Not reported${i.whyNotReported ? ` (${i.whyNotReported})` : ''}`
                : '';
    const files = i.attachmentIds.map((id) => ctx.files.get(id)).filter((f): f is EvidenceFile => Boolean(f));
    return (
        <View>
            <View style={[s.row, { alignItems: 'center', marginBottom: 4 }]}>
                <Text style={[s.mono, { color: c.accent }]}>{incident.incId}</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: c.sev[i.severity] }}>
                    {severityLabel[i.severity].toUpperCase()}
                </Text>
            </View>
            <Text style={[s.h2, { marginTop: 0 }]}>{i.title}</Text>
            <View style={[s.row, { marginBottom: 8 }]}>
                <Text style={s.subtle}>Happened: {dt(i.occurredAt)}</Text>
                <Text style={s.subtle}>First recorded: {dt(incident.createdAt)}</Text>
                {incident.version > 1 && <Text style={s.subtle}>Version {incident.version}</Text>}
            </View>
            <Field s={s} label="What happened" value={i.description} />
            <Field s={s} label="Where" value={i.location} />
            <Field s={s} label="Type" value={i.types.join('; ') + (i.typeOther ? ` (${i.typeOther})` : '')} />
            <Field s={s} label="Person responsible" value={i.responsibleIds.map(name).join(', ')} />
            <Field
                s={s}
                label="Witnesses"
                value={i.witnesses
                    .map((w) => `${name(w.personId)}${w.statement === 'given' ? ' (statement given)' : ''}`)
                    .join(', ')}
            />
            <Field s={s} label="Others affected" value={i.othersAffected} />
            <Field s={s} label="What led up to it" value={i.context} />
            <Field s={s} label="How often" value={i.frequency} />
            <Field s={s} label="My response" value={i.response} />
            <Field s={s} label="Reported" value={reported} />
            <Field s={s} label="Their response" value={i.reportedResponse} />
            <Field
                s={s}
                label="Impact"
                value={[...i.emotionalImpacts, ...i.physicalImpacts, ...i.professionalImpacts].join(', ')}
            />
            <Field s={s} label="Impact statement" value={i.impactStatement} />
            <Field s={s} label="Evidence kept at the time" value={i.evidenceCaptured.join(', ')} />
            <Field s={s} label="Additional notes" value={i.additionalNotes} />
            {files.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                    <Text style={s.label}>Attached evidence</Text>
                    {files.map((f) => (
                        <Text key={f.id} style={{ fontSize: 9 }}>
                            {f.name} <Text style={[s.mono, s.muted]}>sha256 {f.sha256}</Text>
                        </Text>
                    ))}
                </View>
            )}
            {incident.annotations.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                    <Text style={s.label}>Later notes</Text>
                    {incident.annotations.map((a) => (
                        <Text key={a.id} style={{ fontSize: 9 }}>
                            <Text style={s.muted}>{dt(a.at)}: </Text>
                            {a.text}
                        </Text>
                    ))}
                </View>
            )}
            <View wrap={false} style={{ marginTop: 4 }}>
                <Text style={s.label}>Integrity</Text>
                <Text style={[s.mono, s.muted]}>hash {incident.hash}</Text>
                {history && (
                    <Text style={s.subtle}>
                        {history.length} recorded {history.length === 1 ? 'version' : 'versions'}; latest{' '}
                        {dt(incident.updatedAt)}.
                    </Text>
                )}
            </View>
        </View>
    );
}

export function Footer({ s, left }: { s: PdfStyles; left: string }) {
    return (
        <View style={s.footer} fixed>
            <Text>{left}</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
    );
}

/** "Export this incident as PDF". */
export function IncidentPdf({
    incident,
    ctx,
    history,
    verified,
}: {
    incident: Incident;
    ctx: IncidentContext;
    history: LedgerEntry[];
    verified: boolean;
}) {
    const c = pdfColors.color;
    const s = makeStyles(c);
    return (
        <Document
            title={`${incident.incId} ${incident.content.title}`}
            author="Resolvr"
            creator="Resolvr"
            producer="Resolvr"
        >
            <Page size="A4" style={s.page}>
                <Text style={[s.label, { color: c.accent }]}>Resolvr · Incident record</Text>
                <View style={s.rule} />
                <IncidentBlock incident={incident} ctx={ctx} s={s} c={c} history={history} />
                <View style={s.rule} />
                <Text style={s.subtle}>
                    Exported {dt(new Date().toISOString())}.{' '}
                    {verified
                        ? 'The record’s hash chain verified when this was exported.'
                        : 'Warning: the record’s hash chain did not verify when this was exported.'}
                </Text>
                <Text style={[s.subtle, { marginTop: 4 }]}>{NOT_LEGAL_ADVICE}</Text>
                <Footer s={s} left={`${incident.incId} · Not legal advice`} />
            </Page>
        </Document>
    );
}
