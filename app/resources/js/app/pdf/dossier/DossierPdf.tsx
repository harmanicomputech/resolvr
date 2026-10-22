import { Document, Image, Link, Page, Text, View } from '@react-pdf/renderer';

import { severities, severityRank } from '@/lib/model/catalog';

import { Footer, IncidentBlock } from '../IncidentPdf';
import { makeStyles, NOT_LEGAL_ADVICE, pdfColors, type PdfPalette, type PdfStyles } from '../theme';
import type { DossierData } from './data';

const dt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dtt = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const sevLabel = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as const;

/** Chart fills: the validated light-theme chart ramps for HR; greys for the black-and-white Legal package. */
const chartFill = {
    hr: {
        bar: '#0f766e',
        sev: { low: '#e9a37a', medium: '#d9733f', high: '#b44f1c', critical: '#7c2d12' },
        track: '#ece8df',
    },
    legal: {
        bar: '#333333',
        sev: { low: '#bbbbbb', medium: '#888888', high: '#555555', critical: '#111111' },
        track: '#eeeeee',
    },
} as const;

export const SECTIONS = [
    ['summary', 'Executive summary'],
    ['law', 'Legal framework'],
    ['patterns', 'Pattern analysis'],
    ['register', 'Incident register'],
    ['records', 'Full incident records'],
    ['impact', 'Impact on me'],
    ['evidence', 'Evidence index'],
    ['verification', 'Verification appendix'],
    ['disclaimer', 'About this document'],
] as const;
export type SectionId = (typeof SECTIONS)[number][0];

/**
 * The case file. Rendered twice: the first pass is read for the page each
 * section starts on (`pages`), the second prints those numbers in the contents.
 */
export function DossierPdf({
    data,
    pages,
}: {
    data: DossierData;
    pages: Partial<Record<SectionId, number>>;
}) {
    const c: PdfPalette = data.options.pkg === 'hr' ? pdfColors.color : pdfColors.mono;
    const s = makeStyles(c);
    const fill = chartFill[data.options.pkg];
    const p = data.profile;
    const name = p.fullName || 'The author';
    const title =
        data.options.pkg === 'hr' ? 'Workplace incident record' : 'Workplace incident record: legal review copy';
    const sections = SECTIONS.filter(([id]) => id !== 'impact' || data.options.includeImpact);
    const footer = `${name} · ${dt(data.generatedAt)} · Not legal advice`;

    return (
        <Document
            title={`${title}, ${name}`}
            author={name}
            creator="Resolvr"
            producer="Resolvr"
            subject="Not legal advice"
        >
            {/* Cover */}
            <Page size="A4" style={[s.page, { paddingTop: 90 }]}>
                <Text style={[s.label, { color: c.accent }]}>
                    Resolvr · {data.options.pkg === 'hr' ? 'HR package' : 'Legal package'}
                </Text>
                <Text style={[s.h1, { fontSize: 30, marginTop: 12, lineHeight: 1.2, marginBottom: 10 }]}>{title}</Text>
                <Text style={[s.muted, { fontSize: 13 }]}>
                    {name}
                    {p.jobTitle ? `, ${p.jobTitle}` : ''}
                    {p.employer ? ` at ${p.employer}` : ''}
                </Text>
                <View style={[s.rule, { marginVertical: 24 }]} />
                <View style={s.row}>
                    <CoverFact s={s} label="Incidents" value={String(data.incidents.length)} />
                    <CoverFact
                        s={s}
                        label="Period"
                        value={
                            data.incidents.length
                                ? `${dt(data.incidents[0]!.occurredAt)} – ${dt(data.incidents.at(-1)!.occurredAt)}`
                                : '–'
                        }
                    />
                    <CoverFact s={s} label="Evidence files" value={String(data.files.length)} />
                </View>
                <View style={[s.row, { marginTop: 48, alignItems: 'flex-start' }]}>
                    <Image src={data.qr} style={{ width: 96, height: 96 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.label}>Export fingerprint (SHA-256)</Text>
                        <Text style={[s.mono, { marginBottom: 6 }]}>{data.fingerprint}</Text>
                        <Text style={s.subtle}>
                            Generated {dtt(data.generatedAt)}. Scanning the code in Resolvr checks this copy against the
                            author's record. The record's entries are hash-chained; see the verification appendix.
                        </Text>
                    </View>
                </View>
                <View style={{ position: 'absolute', bottom: 60, left: 52, right: 52 }}>
                    <Text style={s.subtle}>
                        {NOT_LEGAL_ADVICE} Confidential: prepared by {name} from their own contemporaneous record.
                    </Text>
                </View>
            </Page>

            {/* Contents */}
            <Page size="A4" style={s.page}>
                <Text style={[s.h1, { fontSize: 18, marginBottom: 14 }]}>Contents</Text>
                {sections.map(([id, label], i) => (
                    <Link key={id} src={`#${id}`} style={{ textDecoration: 'none', color: c.ink }}>
                        <View style={[s.tr, { justifyContent: 'space-between' }]}>
                            <Text>
                                {i + 1}. {label}
                            </Text>
                            <Text style={s.muted}>{pages[id] ?? ''}</Text>
                        </View>
                    </Link>
                ))}
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="summary">
                    Executive summary
                </Heading>
                <Text style={{ fontSize: 12, marginBottom: 10 }}>{data.summary}</Text>
                <View style={[s.row, { marginBottom: 12 }]}>
                    <CoverFact s={s} label="Incidents" value={String(data.stats.total)} />
                    <CoverFact s={s} label="High or critical" value={String(data.stats.serious)} />
                    <CoverFact s={s} label="Most involved" value={data.stats.topPerson?.person?.name ?? '–'} />
                    <CoverFact s={s} label="Record strength" value={`${data.score.total}/100`} />
                </View>
                <Text style={s.h3}>Where the record stands</Text>
                <Text>
                    {data.readiness.stages
                        .filter((st) => st.done)
                        .map((st) => st.name)
                        .join(' › ') || 'Documenting'}
                    . {data.readiness.nextStep}
                </Text>
                <Text style={[s.subtle, { marginTop: 4 }]}>
                    “Record strength” ({data.scoreLabel}) reflects how complete and organised the record is. It is not a
                    prediction of any outcome.
                </Text>
                {data.patterns.length > 0 && (
                    <>
                        <Text style={s.h3}>Key patterns</Text>
                        {data.patterns.slice(0, 4).map((pt) => (
                            <Text key={pt.kind + pt.title} style={{ marginBottom: 2 }}>
                                • {pt.title}. <Text style={s.muted}>{pt.detail}</Text>
                            </Text>
                        ))}
                    </>
                )}

                <View break />
                <Heading s={s} c={c} id="law">
                    Legal framework
                </Heading>
                <Text style={{ marginBottom: 8 }}>
                    The kinds of treatment recorded may relate to the following laws in {data.coverage.pack.name}. This
                    is general information to help a reader orient themselves, not a legal assessment.
                </Text>
                {data.coverage.statutes
                    .filter((x) => x.active)
                    .map(({ statute }) => (
                        <View key={statute.id} style={s.tr} wrap={false}>
                            <Text style={{ width: 90, fontFamily: 'Helvetica-Bold' }}>{statute.short}</Text>
                            <Text style={{ flex: 1 }}>{statute.name}</Text>
                        </View>
                    ))}
                {!data.coverage.statutes.some((x) => x.active) && (
                    <Text style={s.muted}>No specific laws are indicated by the types of treatment recorded.</Text>
                )}
                <Text style={[s.subtle, { marginTop: 6 }]}>{data.coverage.pack.disclaimer}</Text>
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="patterns">
                    Pattern analysis
                </Heading>
                <Text style={s.h3}>Incidents per month</Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        height: 110,
                        gap: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: c.hairline,
                        marginBottom: 2,
                    }}
                >
                    {data.months.map((m) => {
                        const max = Math.max(1, ...data.months.map((x) => x.count));
                        return (
                            <View
                                key={m.start.toISOString()}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 110 }}
                            >
                                {m.count > 0 && (
                                    <Text style={{ fontSize: 7, color: c.muted, marginBottom: 1 }}>{m.count}</Text>
                                )}
                                {m.count > 0 && (
                                    <View
                                        style={{
                                            width: 14,
                                            height: Math.max(2, (m.count / max) * 90),
                                            backgroundColor: fill.bar,
                                            borderTopLeftRadius: 2,
                                            borderTopRightRadius: 2,
                                        }}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    {data.months.map((m) => (
                        <Text
                            key={m.start.toISOString()}
                            style={{ flex: 1, textAlign: 'center', fontSize: 6.5, color: c.subtle }}
                        >
                            {m.start.toLocaleDateString('en-GB', { month: 'short' })}
                        </Text>
                    ))}
                </View>

                <View style={[s.row, { marginTop: 14 }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.h3}>By severity</Text>
                        {[...severities].reverse().map((sv) => (
                            <Bar
                                key={sv}
                                label={sevLabel[sv]}
                                value={data.severity[sv]}
                                max={data.incidents.length}
                                color={fill.sev[sv]}
                                track={fill.track}
                                c={c}
                            />
                        ))}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.h3}>By person responsible</Text>
                        {data.byPerson.map((x) => (
                            <Bar
                                key={x.name}
                                label={x.name}
                                value={x.count}
                                max={data.incidents.length}
                                color={fill.bar}
                                track={fill.track}
                                c={c}
                            />
                        ))}
                        {!data.byPerson.length && <Text style={s.muted}>No one named.</Text>}
                    </View>
                </View>

                <Text style={s.h3}>Patterns found</Text>
                {data.patterns.length ? (
                    data.patterns.map((pt) => (
                        <View key={pt.kind + pt.title} wrap={false} style={{ marginBottom: 6 }}>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{pt.title}</Text>
                            <Text style={s.muted}>{pt.detail}</Text>
                            {pt.incidentIds.length > 0 && (
                                <Text style={[s.mono, s.subtle]}>
                                    {pt.incidentIds
                                        .map((id) => data.incidents.find((i) => i.id === id)?.incId)
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            )}
                        </View>
                    ))
                ) : (
                    <Text style={s.muted}>No patterns detected yet.</Text>
                )}
                <Text style={s.subtle}>Patterns describe the record; they are not legal findings.</Text>
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" orientation="portrait" style={s.page}>
                <Heading s={s} c={c} id="register">
                    Incident register
                </Heading>
                <View style={[s.tr, { borderBottomColor: c.ink }]} fixed>
                    <Text style={[s.label, { width: 52 }]}>Ref</Text>
                    <Text style={[s.label, { width: 64 }]}>Date</Text>
                    <Text style={[s.label, { flex: 1 }]}>Title</Text>
                    <Text style={[s.label, { width: 52 }]}>Severity</Text>
                    <Text style={[s.label, { width: 90 }]}>Responsible</Text>
                    <Text style={[s.label, { width: 56 }]}>Reported</Text>
                </View>
                {data.incidents.map((i) => (
                    <View key={i.id} style={s.tr} wrap={false}>
                        <Link
                            src={`#${i.incId}`}
                            style={[s.mono, { width: 52, color: c.accent, textDecoration: 'none' }]}
                        >
                            {i.incId}
                        </Link>
                        <Text style={{ width: 64, fontSize: 8.5 }}>{dt(i.occurredAt)}</Text>
                        <Text style={{ flex: 1, fontSize: 9 }}>{i.content.title}</Text>
                        <Text style={{ width: 52, fontSize: 8.5, color: c.sev[i.content.severity] }}>
                            {sevLabel[i.content.severity]}
                        </Text>
                        <Text style={{ width: 90, fontSize: 8.5 }}>
                            {i.content.responsibleIds
                                .map((id) => data.people.get(id)?.name)
                                .filter(Boolean)
                                .join(', ') || '–'}
                        </Text>
                        <Text style={{ width: 56, fontSize: 8.5 }}>
                            {i.content.reported === 'yes'
                                ? 'Yes'
                                : i.content.reported === 'informal'
                                  ? 'Informally'
                                  : i.content.reported === 'no'
                                    ? 'No'
                                    : '–'}
                        </Text>
                    </View>
                ))}
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="records">
                    Full incident records
                </Heading>
                {/* Records flow on, separated by a rule (forced page breaks here upset the PDF layout engine). */}
                {data.incidents.map((i, idx) => (
                    <View
                        key={i.id}
                        id={i.incId}
                        style={
                            idx > 0
                                ? { borderTopWidth: 1, borderTopColor: c.hairline, paddingTop: 14, marginTop: 14 }
                                : undefined
                        }
                    >
                        <IncidentBlock
                            incident={i}
                            ctx={{ people: data.people, files: data.fileMap }}
                            s={s}
                            c={c}
                            history={data.histories.get(i.id)}
                        />
                    </View>
                ))}
                <Footer s={s} left={footer} />
            </Page>

            {data.options.includeImpact && (
                <Page size="A4" style={s.page}>
                    <Heading s={s} c={c} id="impact">
                        Impact on me
                    </Heading>
                    <ImpactSection data={data} s={s} fill={fill} c={c} />
                    <Footer s={s} left={footer} />
                </Page>
            )}

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="evidence">
                    Evidence index
                </Heading>
                <Text style={{ marginBottom: 8 }}>
                    Files attached to the incidents above. Each was fingerprinted (SHA-256) when it was added; a copy
                    can be checked by hashing it and comparing.
                </Text>
                {data.files.map((f) => (
                    <View key={f.id} style={[s.tr, { gap: 8 }]} wrap={false}>
                        {data.thumbs.get(f.id) ? (
                            <Image
                                src={data.thumbs.get(f.id)!}
                                style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 3 }}
                            />
                        ) : (
                            <View
                                style={{
                                    width: 54,
                                    height: 54,
                                    backgroundColor: fill.track,
                                    borderRadius: 3,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 7, color: c.subtle }}>
                                    {f.mimeType === 'application/pdf'
                                        ? 'PDF'
                                        : f.mimeType.startsWith('audio/')
                                          ? 'AUDIO'
                                          : 'FILE'}
                                </Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{f.name}</Text>
                            <Text style={s.subtle}>
                                Added {dtt(f.addedAt)}
                                {f.capturedAt ? ` · taken ${dtt(f.capturedAt)}` : ''} ·{' '}
                                {Math.max(1, Math.round(f.size / 1024))} KB ·{' '}
                                {f.incidentIds
                                    .map((id) => data.incidents.find((i) => i.id === id)?.incId)
                                    .filter(Boolean)
                                    .join(', ')}
                            </Text>
                            <Text style={[s.mono, s.subtle]}>sha256 {f.sha256}</Text>
                        </View>
                    </View>
                ))}
                {!data.files.length && <Text style={s.muted}>No files are attached to these incidents.</Text>}
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="verification">
                    Verification appendix
                </Heading>
                <Text style={{ marginBottom: 8 }}>
                    Every change to an incident in Resolvr is added to an append-only, hash-chained ledger: each entry's
                    SHA-256 hash covers the entry before it. Changing, removing or reordering an earlier entry breaks
                    every hash after it.
                </Text>
                <View style={[s.row, { marginBottom: 8 }]}>
                    <CoverFact
                        s={s}
                        label="Chain status"
                        value={
                            data.chain.ok && !data.chain.mismatched.length
                                ? 'Verified at export'
                                : 'Did NOT verify at export'
                        }
                    />
                    <CoverFact s={s} label="Ledger entries" value={String(data.chain.length)} />
                </View>
                <Text style={s.label}>Ledger head</Text>
                <Text style={[s.mono, { marginBottom: 8 }]}>{data.chain.head}</Text>
                <Text style={s.label}>Export fingerprint</Text>
                <Text style={[s.mono, { marginBottom: 10 }]}>{data.fingerprint}</Text>
                {data.incidents.map((i) => {
                    const h = data.histories.get(i.id) ?? [];
                    return (
                        <View key={i.id} style={s.tr} wrap={false}>
                            <Text style={[s.mono, { width: 52 }]}>{i.incId}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.mono, s.subtle]}>{i.hash}</Text>
                                <Text style={s.subtle}>
                                    First recorded {dtt(i.createdAt)} · {h.length}{' '}
                                    {h.length === 1 ? 'version' : 'versions'}
                                    {h.length > 1 ? `, last ${dtt(i.updatedAt)}` : ''}
                                    {i.source === 'import' ? ' · imported from an earlier app' : ''}
                                </Text>
                            </View>
                        </View>
                    );
                })}
                <Text style={[s.subtle, { marginTop: 8 }]}>
                    What this shows: whether the record was changed after each entry was written. It cannot show that
                    what was written is true, and it does not stop the author from creating a new record. Verification
                    URL: {data.verifyUrl}
                </Text>
                <Footer s={s} left={footer} />
            </Page>

            <Page size="A4" style={s.page}>
                <Heading s={s} c={c} id="disclaimer">
                    About this document
                </Heading>
                <Text style={{ marginBottom: 6 }}>
                    This case file was prepared by {name} using Resolvr, a private record-keeping app. Its contents are
                    the author's own account, written at or near the time of each incident, together with evidence the
                    author chose to keep.
                </Text>
                <Text style={{ marginBottom: 6 }}>
                    Resolvr is not a law firm, does not provide legal advice, and has not reviewed or verified the
                    events described. Summaries, scores, patterns and law references are generated automatically to help
                    organise the record; they are not legal findings and do not predict any outcome.
                </Text>
                <Text>Anyone considering formal action should speak to a qualified employment lawyer or advisor.</Text>
                <Footer s={s} left={footer} />
            </Page>
        </Document>
    );
}

function Heading({ id, children, s, c }: { id: SectionId; children: string; s: PdfStyles; c: PdfPalette }) {
    return (
        <View id={id} style={{ marginBottom: 12 }} minPresenceAhead={80}>
            <Text style={[s.h1, { fontSize: 18, lineHeight: 1.25 }]}>{children}</Text>
            <View style={{ height: 2, width: 36, backgroundColor: c.accent, marginTop: 4 }} />
        </View>
    );
}

function CoverFact({ s, label, value }: { s: PdfStyles; label: string; value: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={s.label}>{label}</Text>
            <Text style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 14 }}>{value}</Text>
        </View>
    );
}

function Bar({
    label,
    value,
    max,
    color,
    track,
    c,
}: {
    label: string;
    value: number;
    max: number;
    color: string;
    track: string;
    c: PdfPalette;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
            <Text style={{ width: 70, fontSize: 8.5, color: c.muted }}>{label}</Text>
            <View style={{ flex: 1, height: 8, backgroundColor: track, borderRadius: 4 }}>
                <View
                    style={{
                        width: `${max ? (value / max) * 100 : 0}%`,
                        height: 8,
                        backgroundColor: color,
                        borderRadius: 4,
                    }}
                />
            </View>
            <Text style={{ width: 18, fontSize: 8.5, textAlign: 'right' }}>{value}</Text>
        </View>
    );
}

function ImpactSection({
    data,
    s,
    fill,
    c,
}: {
    data: DossierData;
    s: PdfStyles;
    fill: (typeof chartFill)[keyof typeof chartFill];
    c: PdfPalette;
}) {
    const tally = (pick: (i: (typeof data.incidents)[number]) => string[]) => {
        const m = new Map<string, number>();
        for (const i of data.incidents) for (const v of pick(i)) m.set(v, (m.get(v) ?? 0) + 1);
        return [...m].sort((a, b) => b[1] - a[1]);
    };
    const groups: [string, [string, number][]][] = [
        ['How it has made me feel', tally((i) => i.content.emotionalImpacts)],
        ['Effects on my health', tally((i) => i.content.physicalImpacts)],
        ['Effects on my work', tally((i) => i.content.professionalImpacts)],
    ];
    const statements = data.incidents
        .filter((i) => i.content.impactStatement.trim())
        .sort((a, b) => severityRank[b.content.severity] - severityRank[a.content.severity]);
    return (
        <View>
            {groups.map(([title, rows]) =>
                rows.length ? (
                    <View key={title} style={{ marginBottom: 8 }}>
                        <Text style={s.h3}>{title}</Text>
                        {rows.map(([label, n]) => (
                            <Bar
                                key={label}
                                label={label}
                                value={n}
                                max={data.incidents.length}
                                color={fill.bar}
                                track={fill.track}
                                c={c}
                            />
                        ))}
                    </View>
                ) : null,
            )}
            {statements.length > 0 && <Text style={s.h3}>In my own words</Text>}
            {statements.map((i) => (
                <View key={i.id} wrap={false} style={{ marginBottom: 6 }}>
                    <Text style={[s.mono, s.subtle]}>
                        {i.incId} · {dt(i.occurredAt)}
                    </Text>
                    <Text>{i.content.impactStatement}</Text>
                </View>
            ))}
            {!statements.length && groups.every(([, r]) => !r.length) && (
                <Text style={s.muted}>No impact has been recorded for these incidents.</Text>
            )}
        </View>
    );
}
