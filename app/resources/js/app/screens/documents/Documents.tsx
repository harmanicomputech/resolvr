import {
    FileText,
    FolderArchive,
    MessageSquareQuote,
    Mail,
    ScrollText,
    Briefcase,
    type LucideIcon,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { DocumentType } from '@/lib/model/schema';

import { MotionItem } from '../../components/motion-item';
import { useData } from '../../hooks/use-data';
import { NavLink } from '../../shell/NavLink';
import { documentTypeInfo } from './payload';

const icons: Record<DocumentType, LucideIcon> = {
    'hr-complaint': FileText,
    'witness-request': MessageSquareQuote,
    'follow-up-email': Mail,
    'agency-intake': ScrollText,
    'lawyer-briefing': Briefcase,
};

/** Documents: start a new draft, open a saved one, or build the case file. */
export default function Documents() {
    const { data, loading } = useData((repos) => repos.documents.list());

    return (
        <div className="space-y-6 pt-2">
            <section aria-labelledby="new-doc">
                <h2 id="new-doc" className="mb-3 text-sm font-medium text-fg">
                    Draft something new
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(Object.keys(documentTypeInfo) as DocumentType[]).map((type) => {
                        const Icon = icons[type];
                        return (
                            <li key={type}>
                                <NavLink
                                    href={`/documents/new?type=${type}`}
                                    className="card flex h-full gap-3 p-4 transition-colors hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                                >
                                    <span className="icon-badge" aria-hidden>
                                        <Icon className="size-4" />
                                    </span>
                                    <span>
                                        <span className="block font-medium text-fg">
                                            {documentTypeInfo[type].title}
                                        </span>
                                        <span className="block text-sm text-fg-muted">
                                            {documentTypeInfo[type].blurb}
                                        </span>
                                    </span>
                                </NavLink>
                            </li>
                        );
                    })}
                    <li>
                        <NavLink
                            href="/documents/dossier"
                            className="card flex h-full gap-3 border-accent p-4 transition-colors hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                        >
                            <span className="icon-badge" aria-hidden>
                                <FolderArchive className="size-4" />
                            </span>
                            <span>
                                <span className="block font-medium text-fg">Case file</span>
                                <span className="block text-sm text-fg-muted">
                                    Your whole record as an HR or legal PDF, made on this device.
                                </span>
                            </span>
                        </NavLink>
                    </li>
                </ul>
            </section>

            <section aria-labelledby="saved-docs">
                <h2 id="saved-docs" className="mb-3 text-sm font-medium text-fg">
                    Saved drafts
                </h2>
                {loading && !data ? (
                    <Skeleton className="h-24" />
                ) : data?.length ? (
                    <ul className="card divide-y divide-hairline">
                        <AnimatePresence initial={false}>
                            {data.map((d) => (
                                <MotionItem key={d.id}>
                                    <NavLink
                                        href={`/documents/${d.id}`}
                                        className="flex items-center gap-3 p-4 hover:bg-raised"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-fg">{d.title}</span>
                                            <span className="text-xs text-fg-subtle">
                                                {documentTypeInfo[d.type].title} · edited{' '}
                                                {new Date(d.updatedAt).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </span>
                                        </span>
                                    </NavLink>
                                </MotionItem>
                            ))}
                        </AnimatePresence>
                    </ul>
                ) : (
                    <EmptyState icon={<FileText className="size-6" />} title="No drafts yet">
                        Drafts are saved on this device, encrypted, as you edit.
                    </EmptyState>
                )}
            </section>
            <p className="text-xs text-fg-subtle">
                Drafts are a starting point for you to check and edit. Resolvr is not legal advice.
            </p>
        </div>
    );
}
