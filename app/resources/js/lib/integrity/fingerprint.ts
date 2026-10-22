import type { LedgerEntry } from '../db/incidents';
import { canonicalJson, sha256Hex } from './canonical';

/**
 * Export fingerprints. A case file carries a SHA-256 fingerprint of what it
 * contains: the ledger head at export time, every included incident's latest
 * hash, and every included file's hash. Because the ledger is append-only,
 * the same fingerprint can be recomputed later from the record, even after
 * further edits, to show a printed copy matches what was recorded.
 */

export interface ExportManifest {
    head: string;
    incidents: { incId: string; hash: string }[];
    files: string[];
}

export async function exportFingerprint(manifest: ExportManifest): Promise<string> {
    return sha256Hex(
        canonicalJson({
            v: 1,
            head: manifest.head,
            incidents: [...manifest.incidents].sort((a, b) => a.incId.localeCompare(b.incId)),
            files: [...manifest.files].sort(),
        }),
    );
}

/** Text carried by the QR code. The fragment keeps it off any server. */
export function verificationUrl(origin: string, fingerprint: string, head: string, incIds: string[]): string {
    return `${origin}/verify#v1.${fingerprint}.${head.slice(0, 16)}.${incIds.join(',')}`;
}

export function parseVerification(hash: string): { fingerprint: string; headPrefix: string; incIds: string[] } | null {
    const m = /^#?v1\.([0-9a-f]{64})\.([0-9a-f]{16})\.([A-Z0-9,-]*)$/.exec(hash);
    return m ? { fingerprint: m[1]!, headPrefix: m[2]!, incIds: m[3] ? m[3].split(',') : [] } : null;
}

/**
 * Recompute the fingerprint as it was when the ledger head started with
 * `headPrefix`: each incident's latest hash up to that entry. Returns null if
 * no such entry exists in this record.
 */
export async function fingerprintAt(
    ledger: LedgerEntry[],
    headPrefix: string,
    incIds: string[],
    fileHashes: string[],
): Promise<{ fingerprint: string; at: string } | null> {
    const index = ledger.findIndex((e) => e.hash.startsWith(headPrefix));
    if (index === -1) return null;
    const upTo = ledger.slice(0, index + 1);
    const latest = new Map<string, LedgerEntry>();
    for (const entry of upTo) latest.set(entry.body.incId, entry);
    const incidents = incIds.map((incId) => ({ incId, hash: latest.get(incId)?.hash ?? '' }));
    if (incidents.some((i) => !i.hash)) return null;
    const head = ledger[index]!.hash;
    return { fingerprint: await exportFingerprint({ head, incidents, files: fileHashes }), at: ledger[index]!.body.at };
}
