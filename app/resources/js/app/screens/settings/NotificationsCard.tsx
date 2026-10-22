import { Bell } from 'lucide-react';
import { useState } from 'react';

import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/field';
import type { Settings } from '@/lib/model/schema';

import { useToast } from '../../components/toaster';
import { disableReminders, enableReminders, remindersSupported } from '../../lib/reminders';
import { useSession } from '../../session';
import { SettingRow, SettingsCard, Toggle } from './parts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function NotificationsCard({ settings }: { settings: Settings }) {
    const session = useSession();
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const r = settings.reminders;
    const supported = remindersSupported();

    /** Save locally, and push the schedule to the server when reminders are on. */
    const apply = async (next: Settings['reminders']) => {
        setBusy(true);
        try {
            if (next.enabled) {
                const creds = await enableReminders(
                    { time: next.time, days: next.days },
                    next.id && next.token ? { id: next.id, token: next.token } : undefined,
                );
                await session.saveSettings({ reminders: { ...next, ...creds } });
            } else {
                await disableReminders(next);
                await session.saveSettings({ reminders: { ...next, id: undefined, token: undefined } });
            }
        } catch (error) {
            toast({
                title: 'Reminders not changed',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'warning',
            });
        } finally {
            setBusy(false);
        }
    };

    const toggleDay = (i: number) => {
        const days = r.days
            .split('')
            .map((d, j) => (j === i ? (d === '1' ? '0' : '1') : d))
            .join('');
        if (days === '0000000') return; // keep at least one day
        void (r.enabled ? apply({ ...r, days }) : session.saveSettings({ reminders: { ...r, days } }));
    };

    return (
        <SettingsCard
            id="notifications"
            icon={<Bell className="size-4" />}
            title="Reminders"
            description="A gentle nudge to write things down while they are fresh."
        >
            {!supported ? (
                <p className="py-4 text-sm text-fg-muted">
                    This browser cannot show reminders. On iPhone, add Resolvr to your Home Screen first.
                </p>
            ) : (
                <>
                    <SettingRow
                        title="Remind me"
                        description="Our server only knows when to send a reminder, never what it says or anything in your record."
                    >
                        <Toggle
                            label="Remind me"
                            checked={r.enabled}
                            disabled={busy}
                            onChange={(enabled) => void apply({ ...r, enabled })}
                        />
                    </SettingRow>
                    <SettingRow title="Time" htmlFor="reminder-time">
                        <Input
                            id="reminder-time"
                            type="time"
                            className="w-40"
                            value={r.time}
                            disabled={busy}
                            onChange={(e) => {
                                if (!e.target.value) return;
                                const next = { ...r, time: e.target.value };
                                void (r.enabled ? apply(next) : session.saveSettings({ reminders: next }));
                            }}
                        />
                    </SettingRow>
                    <SettingRow title="Days">
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reminder days">
                            {DAYS.map((d, i) => (
                                <Chip
                                    key={d}
                                    selected={r.days[i] === '1'}
                                    onSelectedChange={() => toggleDay(i)}
                                    disabled={busy}
                                >
                                    {d}
                                </Chip>
                            ))}
                        </div>
                    </SettingRow>
                    <SettingRow
                        title="Disguise the reminder"
                        description={
                            'Shows "Reminder: Time to jot down today’s notes" with a plain icon. Always on in stealth mode.'
                        }
                    >
                        <Toggle
                            label="Disguise the reminder"
                            checked={r.disguised || session.stealth}
                            disabled={session.stealth}
                            onChange={(disguised) => void session.saveSettings({ reminders: { ...r, disguised } })}
                        />
                    </SettingRow>
                </>
            )}
        </SettingsCard>
    );
}
