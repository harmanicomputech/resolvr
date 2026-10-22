import type { Repositories } from '@/lib/db';

/**
 * A readable (unencrypted) copy of the record as JSON, for the user's own
 * files or to hand to an advisor. Evidence files are listed with their
 * hashes, not included. Backup and reminder credentials are left out.
 */
export async function exportReadableJson(repos: Repositories): Promise<Blob> {
    const [incidents, ledger, people, files, documents, profile, settings] = await Promise.all([
        repos.incidents.list({ includeDeleted: true }),
        repos.incidents.ledger(),
        repos.people.list(),
        repos.files.list({ includeDeleted: true }),
        repos.documents.list(),
        repos.singletons.profile(),
        repos.singletons.settings(),
    ]);
    const preferences: Partial<typeof settings> = { ...settings };
    delete preferences.backup;
    delete preferences.reminders;
    const body = {
        format: 'resolvr-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        notice: 'Exported from Resolvr. Not legal advice. Evidence files are listed by SHA-256, not included.',
        profile,
        preferences,
        incidents,
        people,
        evidence: files,
        documents,
        ledger,
    };
    return new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
}
