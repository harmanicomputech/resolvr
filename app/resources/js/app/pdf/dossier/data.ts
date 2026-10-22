import QRCode from 'qrcode';

import type { Repositories } from '@/lib/db';
import { exportFingerprint, verificationUrl } from '@/lib/integrity';
import { lawPackFor, legalCoverage, type Coverage } from '@/lib/laws/coverage';
import { filingDeadlines, type DeadlineSummary } from '@/lib/laws/deadlines';
import { detectPatterns, type Pattern } from '@/lib/patterns/detect';
import { caseReadiness, type Readiness } from '@/lib/scoring/readiness';
import { scoreLabel, scoreParts, type ScoreParts } from '@/lib/scoring/score';
import { caseSummary, monthlyCounts, severityCounts, type MonthCount } from '@/lib/scoring/series';
import { caseStats, type CaseStats } from '@/lib/scoring/stats';
import type { CaseProfile, EvidenceFile, Incident, Person } from '@/lib/model/schema';
import type { Severity } from '@/lib/model/catalog';
import type { LedgerEntry } from '@/lib/db';

export type Package = 'hr' | 'legal';

export interface DossierOptions {
    pkg: Package;
    from?: string;
    to?: string;
    includeImpact: boolean;
    includeThumbnails: boolean;
}

export interface DossierData {
    options: DossierOptions;
    profile: CaseProfile;
    incidents: Incident[];
    people: Map<string, Person>;
    files: EvidenceFile[];
    fileMap: Map<string, EvidenceFile>;
    thumbs: Map<string, string>;
    histories: Map<string, LedgerEntry[]>;
    stats: CaseStats;
    score: ScoreParts;
    scoreLabel: string;
    readiness: Readiness;
    patterns: Pattern[];
    coverage: Coverage;
    deadlines: DeadlineSummary;
    months: MonthCount[];
    severity: Record<Severity, number>;
    byPerson: { name: string; count: number }[];
    summary: string;
    chain: { ok: boolean; length: number; head: string; mismatched: string[] };
    fingerprint: string;
    verifyUrl: string;
    qr: string;
    generatedAt: string;
}

const localDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Shrink an image for the PDF so case files stay small enough to email. */
async function thumbnail(blob: Blob, max = 360): Promise<string | undefined> {
    try {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', 0.78);
    } catch {
        return undefined;
    }
}

/** Gather and decrypt everything a case file needs, in memory only. */
export async function gatherDossier(
    repos: Repositories,
    options: DossierOptions,
    origin: string,
): Promise<DossierData> {
    const [all, peopleList, allFiles, profile, settings, ledger, verdict] = await Promise.all([
        repos.incidents.list(),
        repos.people.list(),
        repos.files.list(),
        repos.singletons.profile(),
        repos.singletons.settings(),
        repos.incidents.ledger(),
        repos.incidents.verify(),
    ]);
    const incidents = all
        .filter(
            (i) =>
                (!options.from || localDay(i.occurredAt) >= options.from) &&
                (!options.to || localDay(i.occurredAt) <= options.to),
        )
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const ids = new Set(incidents.map((i) => i.id));
    const files = allFiles
        .filter((f) => f.incidentIds.some((id) => ids.has(id)))
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    const people = new Map(peopleList.map((p) => [p.id, p]));
    const now = new Date();
    const stats = caseStats(incidents, people, now);
    const score = scoreParts(incidents, files.length);
    const pack = lawPackFor(settings.jurisdiction);

    const thumbs = new Map<string, string>();
    if (options.includeThumbnails) {
        for (const f of files.filter((f) => f.mimeType.startsWith('image/')).slice(0, 60)) {
            const blob = await repos.files.open(f.id);
            const url = blob && (await thumbnail(blob));
            if (url) thumbs.set(f.id, url);
        }
    }

    const histories = new Map<string, LedgerEntry[]>();
    for (const entry of ledger)
        if (ids.has(entry.body.incidentId))
            histories.set(entry.body.incidentId, [...(histories.get(entry.body.incidentId) ?? []), entry]);

    const counts = new Map<string, number>();
    for (const i of incidents) for (const id of i.content.responsibleIds) counts.set(id, (counts.get(id) ?? 0) + 1);

    const head = ledger.at(-1)?.hash ?? '0'.repeat(64);
    const fingerprint = await exportFingerprint({
        head,
        incidents: incidents.map((i) => ({ incId: i.incId, hash: i.hash })),
        files: files.map((f) => f.sha256),
    });
    const verifyUrl = verificationUrl(
        origin,
        fingerprint,
        head,
        incidents.map((i) => i.incId),
    );
    const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240, errorCorrectionLevel: 'M' });

    const span = incidents.length
        ? Math.max(
              6,
              Math.min(24, Math.ceil((now.getTime() - Date.parse(incidents[0]!.occurredAt)) / (30.4 * 86_400_000)) + 1),
          )
        : 6;

    return {
        options,
        profile,
        incidents,
        people,
        files,
        fileMap: new Map(allFiles.map((f) => [f.id, f])),
        thumbs,
        histories,
        stats,
        score,
        scoreLabel: scoreLabel(score.total),
        readiness: caseReadiness(incidents, score.total, files.length),
        patterns: detectPatterns(incidents, people, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        coverage: legalCoverage([...new Set(incidents.flatMap((i) => i.content.types))], pack),
        deadlines: filingDeadlines(incidents, pack, now),
        months: monthlyCounts(incidents, span, now),
        severity: severityCounts(incidents),
        byPerson: [...counts]
            .map(([id, count]) => ({ name: people.get(id)?.name ?? 'Unknown', count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6),
        summary: caseSummary(stats, incidents),
        chain: { ok: verdict.ok, length: verdict.length, head, mismatched: verdict.mismatchedIncidents },
        fingerprint,
        verifyUrl,
        qr,
        generatedAt: now.toISOString(),
    };
}
