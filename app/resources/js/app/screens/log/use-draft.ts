import { useCallback, useEffect, useRef, useState } from 'react';

import { formFromIncident } from '@/lib/db';
import type { Draft, LogForm } from '@/lib/model/draft';

import { useSession } from '../../session';

/**
 * Load or start a draft and save it, encrypted, shortly after every change.
 * A draft is only written once something has been typed.
 */
export function useDraft(options: { draftId?: string; incidentId?: string; quick?: boolean }) {
    const { repos } = useSession();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const dirty = useRef(false);
    const timer = useRef<number | undefined>(undefined);
    const latest = useRef<Draft | null>(null);

    useEffect(() => {
        if (!repos) return;
        let cancelled = false;
        void (async () => {
            let d: Draft | undefined;
            if (options.draftId) d = await repos.drafts.get(options.draftId);
            if (!d && options.incidentId) {
                const existing = (await repos.drafts.list()).find((x) => x.incidentId === options.incidentId);
                const incident = await repos.incidents.get(options.incidentId);
                if (existing) d = existing;
                else if (incident) {
                    const people = new Map((await repos.people.list()).map((p) => [p.id, p]));
                    d = repos.drafts.create({ incidentId: incident.id, form: formFromIncident(incident, people) });
                }
            }
            d ??= repos.drafts.create({ quick: options.quick });
            if (!cancelled) {
                latest.current = d;
                setDraft(d);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [repos, options.draftId, options.incidentId, options.quick]);

    const flush = useCallback(async () => {
        window.clearTimeout(timer.current);
        if (!repos || !latest.current || !dirty.current) return;
        dirty.current = false;
        await repos.drafts.save(latest.current);
        setSavedAt(Date.now());
    }, [repos]);

    const update = useCallback(
        (patch: Partial<LogForm> | ((form: LogForm) => Partial<LogForm>), step?: number) => {
            setDraft((current) => {
                if (!current) return current;
                const form = { ...current.form, ...(typeof patch === 'function' ? patch(current.form) : patch) };
                const next = { ...current, form, step: step ?? current.step };
                latest.current = next;
                return next;
            });
            dirty.current = true;
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => void flush(), 400);
        },
        [flush],
    );

    const setStep = useCallback(
        (step: number) => {
            setDraft((current) => {
                if (!current) return current;
                const next = { ...current, step };
                latest.current = next;
                return next;
            });
            if (latest.current && (latest.current.form.title || latest.current.form.description)) {
                dirty.current = true;
                void flush();
            }
        },
        [flush],
    );

    // Save whatever is pending when leaving the flow (including on lock).
    useEffect(() => () => void flush(), [flush]);

    return { draft, update, setStep, flush, savedAt };
}
