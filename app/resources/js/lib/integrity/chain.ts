import { canonicalJson, sha256Hex } from './canonical';

/**
 * Tamper-evident ledger. Every change to an incident is appended as an entry
 * whose hash covers the previous entry's hash and the canonical JSON of the
 * entry body:
 *
 *   hash = SHA-256( prevHash + canonicalJson(body) )
 *
 * Changing, removing or reordering any earlier entry breaks every hash after
 * it. This shows a record was changed after it was written; it cannot prove
 * that what was written is true.
 */

export const GENESIS_HASH = '0'.repeat(64);

export interface ChainLink<Body> {
    seq: number;
    prevHash: string;
    hash: string;
    body: Body;
}

export async function linkHash(prevHash: string, seq: number, body: unknown): Promise<string> {
    return sha256Hex(prevHash + canonicalJson({ seq, body }));
}

export async function appendLink<Body>(previous: ChainLink<unknown> | undefined, body: Body): Promise<ChainLink<Body>> {
    const seq = previous ? previous.seq + 1 : 1;
    const prevHash = previous ? previous.hash : GENESIS_HASH;
    return { seq, prevHash, hash: await linkHash(prevHash, seq, body), body };
}

export type ChainVerdict =
    | { ok: true; length: number; head: string }
    | { ok: false; length: number; brokenAt: number; reason: 'sequence' | 'link' | 'hash' };

/** Verifies a whole chain, in order. Reports the first entry that does not check out. */
export async function verifyChain(links: ChainLink<unknown>[]): Promise<ChainVerdict> {
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < links.length; i++) {
        const link = links[i]!;
        if (link.seq !== i + 1) return { ok: false, length: links.length, brokenAt: i + 1, reason: 'sequence' };
        if (link.prevHash !== prevHash) return { ok: false, length: links.length, brokenAt: link.seq, reason: 'link' };
        if ((await linkHash(link.prevHash, link.seq, link.body)) !== link.hash) {
            return { ok: false, length: links.length, brokenAt: link.seq, reason: 'hash' };
        }
        prevHash = link.hash;
    }
    return { ok: true, length: links.length, head: prevHash };
}
