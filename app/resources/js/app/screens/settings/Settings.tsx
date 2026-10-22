import { Skeleton } from '@/components/ui/skeleton';

import { useSession } from '../../session';
import { AppearanceCard, JurisdictionCard } from './AppearanceCard';
import { BackupCard } from './BackupCard';
import { DataCard } from './DataCard';
import { NotificationsCard } from './NotificationsCard';
import { SecurityCard } from './SecurityCard';

const SECTIONS = [
    ['security', 'Security'],
    ['appearance', 'Appearance'],
    ['jurisdiction', 'Where you work'],
    ['backup', 'Backup'],
    ['notifications', 'Reminders'],
    ['data', 'Your data'],
] as const;

/** Settings, grouped as cards. Every change saves at once, encrypted like the rest of the record. */
export default function Settings() {
    const { settings } = useSession();
    if (!settings) return <Skeleton className="mt-4 h-96" />;
    return (
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[11rem_1fr]">
            <nav aria-label="Settings sections" className="hidden lg:block">
                <ul className="sticky top-24 space-y-1 text-sm">
                    {SECTIONS.map(([id, label]) => (
                        <li key={id}>
                            <a
                                href={`#${id}`}
                                className="block rounded-(--radius-sm) px-3 py-1.5 text-fg-muted transition-colors hover:bg-raised hover:text-fg focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="min-w-0 space-y-6">
                <SecurityCard settings={settings} />
                <AppearanceCard settings={settings} />
                <JurisdictionCard settings={settings} />
                <BackupCard settings={settings} />
                <NotificationsCard settings={settings} />
                <DataCard settings={settings} />
                <p className="pb-4 text-center text-xs text-fg-subtle">
                    Resolvr helps you keep an organised record. It is not legal advice.
                </p>
            </div>
        </div>
    );
}
