import { appendLink, verifyChain, type ChainLink, type ChainVerdict } from '../integrity';
import {
    incidentContentSchema,
    incidentSchema,
    type Annotation,
    type Incident,
    type IncidentContentInput,
    type IncidentVersion,
    type LedgerOp,
} from '../model/schema';
import type { Vault } from './vault';

/**
 * Incidents and their append-only history.
 *
 * Every create, edit, annotation, trash and restore appends a version to one
 * hash-chained ledger shared by all incidents. The incident record itself is
 * a cache of the latest version for fast reading; the ledger is the source
 * of truth and can be verified at any time.
 */

export type LedgerEntry = ChainLink<IncidentVersion>;

const COUNTER_ID = 'incident-seq';
const LEDGER_HEAD_ID = 'ledger-head';
const TRASH_DAYS = 30;

const pad = (n: number, width = 9) => String(n).padStart(width, '0');

export class IncidentRepository {
    constructor(private readonly vault: Vault) {}

    async list(options: { includeDeleted?: boolean } = {}): Promise<Incident[]> {
        const all = await this.vault.list<Incident>('incident');
        return all
            .filter((i) => options.includeDeleted || !i.deletedAt)
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    }

    async get(id: string): Promise<Incident | undefined> {
        return this.vault.get<Incident>('incident', id);
    }

    async create(
        input: IncidentContentInput,
        options: { at?: Date; source?: 'app' | 'import'; incId?: string; createdAt?: string } = {},
    ): Promise<Incident> {
        const content = incidentContentSchema.parse(input);
        const at = (options.at ?? new Date()).toISOString();
        return this.vault.exclusive(async () => {
            const { incId, seq } = await this.allocateIncId(options.incId);
            const id = crypto.randomUUID();
            const draft = {
                id,
                incId,
                version: 1,
                createdAt: options.createdAt ?? at,
                updatedAt: at,
                occurredAt: content.occurredAt,
                content,
                annotations: [] as Annotation[],
                source: options.source ?? 'app',
            };
            return this.commit(draft, options.source === 'import' ? 'import' : 'create', at, [
                { kind: 'counter', id: COUNTER_ID, value: seq },
            ]);
        });
    }

    async update(id: string, input: IncidentContentInput, at = new Date()): Promise<Incident> {
        const content = incidentContentSchema.parse(input);
        return this.mutate(id, 'edit', at, (current) => ({ ...current, content, occurredAt: content.occurredAt }));
    }

    async annotate(id: string, text: string, at = new Date()): Promise<Incident> {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('A note cannot be empty');
        return this.mutate(id, 'annotate', at, (current) => ({
            ...current,
            annotations: [...current.annotations, { id: crypto.randomUUID(), at: at.toISOString(), text: trimmed }],
        }));
    }

    /** Move to trash. The history is kept; the incident can be restored for 30 days. */
    async trash(id: string, at = new Date()): Promise<Incident> {
        return this.mutate(id, 'trash', at, (current) => ({ ...current, deletedAt: at.toISOString() }));
    }

    async restore(id: string, at = new Date()): Promise<Incident> {
        return this.mutate(id, 'restore', at, (current) => ({ ...current, deletedAt: undefined }));
    }

    /** Incidents in trash for longer than 30 days. The UI asks before purging them. */
    async expiredTrash(now = new Date()): Promise<Incident[]> {
        const cutoff = now.getTime() - TRASH_DAYS * 24 * 60 * 60 * 1000;
        return (await this.list({ includeDeleted: true })).filter(
            (i) => i.deletedAt && Date.parse(i.deletedAt) < cutoff,
        );
    }

    /** Every version of one incident, oldest first. */
    async history(id: string): Promise<LedgerEntry[]> {
        return (await this.ledger()).filter((entry) => entry.body.incidentId === id);
    }

    /** The whole ledger, in chain order. */
    async ledger(): Promise<LedgerEntry[]> {
        return this.vault.list<LedgerEntry>('ledger');
    }

    /**
     * Verify the chain, and that each incident's current state matches its
     * latest ledger entry (so the cached record was not edited on its own).
     */
    async verify(): Promise<ChainVerdict & { mismatchedIncidents: string[] }> {
        const ledger = await this.ledger();
        const verdict = await verifyChain(ledger);
        const latest = new Map<string, LedgerEntry>();
        ledger.forEach((entry) => latest.set(entry.body.incidentId, entry));
        const mismatched = (await this.list({ includeDeleted: true }))
            .filter((incident) => latest.get(incident.id)?.hash !== incident.hash)
            .map((incident) => incident.incId);
        return { ...verdict, mismatchedIncidents: mismatched };
    }

    // ------------------------------------------------------------- internals

    private async mutate(
        id: string,
        op: LedgerOp,
        at: Date,
        change: (
            current: Incident,
        ) => Omit<Incident, 'hash' | 'prevHash' | 'version' | 'updatedAt'> & Partial<Incident>,
    ): Promise<Incident> {
        return this.vault.exclusive(async () => {
            const current = await this.get(id);
            if (!current) throw new Error('Incident not found');
            const next = change(current);
            return this.commit(
                { ...next, version: current.version + 1, updatedAt: at.toISOString() },
                op,
                at.toISOString(),
            );
        });
    }

    /** Append a ledger entry for this state and store the incident with the new hashes, atomically. */
    private async commit(
        state: Omit<Incident, 'hash' | 'prevHash'>,
        op: LedgerOp,
        at: string,
        extra: { kind: 'counter'; id: string; value: unknown }[] = [],
    ): Promise<Incident> {
        const head = await this.vault.get<LedgerEntry>('counter', LEDGER_HEAD_ID);
        const body: IncidentVersion = {
            op,
            at,
            incidentId: state.id,
            incId: state.incId,
            version: state.version,
            snapshot: {
                content: state.content,
                annotations: state.annotations,
                createdAt: state.createdAt,
                ...(state.deletedAt ? { deletedAt: state.deletedAt } : {}),
                source: state.source,
            },
        };
        const link = await appendLink(head, body);
        const incident = incidentSchema.parse({ ...state, hash: link.hash, prevHash: link.prevHash });

        await this.vault.putMany([
            { kind: 'ledger', id: pad(link.seq), value: link },
            { kind: 'counter', id: LEDGER_HEAD_ID, value: link },
            { kind: 'incident', id: incident.id, value: incident },
            ...extra,
        ]);
        return incident;
    }

    /**
     * Next INC number: one above the highest ever issued, so numbers are never
     * reused. Imports keep their own numbers and push the counter past them.
     */
    private async allocateIncId(requested?: string): Promise<{ incId: string; seq: number }> {
        const current = (await this.vault.get<number>('counter', COUNTER_ID)) ?? 0;
        if (requested) return { incId: requested, seq: Math.max(current, Number(requested.replace(/\D/g, ''))) };
        const seq = current + 1;
        return { incId: `INC-${String(seq).padStart(3, '0')}`, seq };
    }
}
