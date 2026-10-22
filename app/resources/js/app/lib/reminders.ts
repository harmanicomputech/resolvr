import { fromBase64, randomBytes, toBase64, toHex } from '@/lib/crypto';

/**
 * Web push reminders. The server stores a push address and a schedule, and
 * sends empty pushes; the service worker words the notification (sw.ts).
 */

export interface ReminderCredentials {
    id: string;
    token: string;
}

export interface ReminderSchedule {
    time: string;
    days: string;
}

export class RemindersUnavailableError extends Error {}

export function remindersSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

const b64url = (bytes: Uint8Array) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) =>
    fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

export function newReminderCredentials(): ReminderCredentials {
    return { id: toHex(randomBytes(16)), token: b64url(randomBytes(32)) };
}

/** Ask permission, subscribe this browser, and store the schedule on the server. */
export async function enableReminders(
    schedule: ReminderSchedule,
    creds: ReminderCredentials = newReminderCredentials(),
): Promise<ReminderCredentials> {
    if (!remindersSupported()) throw new RemindersUnavailableError('This browser cannot show reminders.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted')
        throw new RemindersUnavailableError('Notifications are turned off for this site in your browser settings.');
    const keyResponse = await fetch('/api/reminders/key', { headers: { Accept: 'application/json' } });
    const { publicKey } = (await keyResponse.json().catch(() => ({}))) as { publicKey?: string };
    if (!keyResponse.ok || !publicKey) throw new RemindersUnavailableError('Reminders are not available right now.');
    const registration = await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: fromB64url(publicKey),
        }));
    const response = await fetch(`/api/reminders/${creds.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${creds.token}`,
        },
        body: JSON.stringify({
            endpoint: subscription.endpoint,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...schedule,
        }),
    });
    if (!response.ok) throw new RemindersUnavailableError('The reminder could not be saved. Please try again.');
    return creds;
}

export async function disableReminders(creds: Partial<ReminderCredentials>): Promise<void> {
    if (remindersSupported()) {
        const registration = await navigator.serviceWorker.getRegistration();
        await (await registration?.pushManager.getSubscription())?.unsubscribe();
    }
    if (creds.id && creds.token) {
        await fetch(`/api/reminders/${creds.id}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', Authorization: `Bearer ${creds.token}` },
        }).catch(() => undefined);
    }
}
