import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { autoLockOptions, type Settings } from '@/lib/model/schema';

import { PinConfirm } from '../../components/pin-confirm';
import { useToast } from '../../components/toaster';
import { passkeySupported } from '../../lock/passkey';
import { useSession, type PinFormat } from '../../session';
import { PasscodeField, pinRules, SettingRow, SettingsCard, Toggle } from './parts';

const autoLockLabel = (m: number) => (m === 0 ? 'Never' : m === 1 ? 'After 1 minute' : `After ${m} minutes`);

export function SecurityCard({ settings }: { settings: Settings }) {
    const session = useSession();
    const toast = useToast();
    const [changing, setChanging] = useState(false);
    const [decoyOpen, setDecoyOpen] = useState(false);
    const [passkeyPin, setPasskeyPin] = useState(false);
    const [canPasskey, setCanPasskey] = useState(false);

    useEffect(() => void passkeySupported().then(setCanPasskey), []);

    const addPasskey = async (pin: string) => {
        try {
            await session.addPasskey(pin);
            toast({
                title: 'Passkey added',
                description: 'You can now unlock with your face or fingerprint.',
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Passkey not added',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'warning',
            });
        }
    };

    return (
        <SettingsCard
            id="security"
            icon={<ShieldCheck className="size-4" />}
            title="Security"
            description="How Resolvr locks, and how it hides."
        >
            <SettingRow title="Passcode" description="Change it any time. Your record does not need re-encrypting.">
                <Button size="sm" onClick={() => setChanging(true)}>
                    Change passcode
                </Button>
            </SettingRow>

            {canPasskey && !session.isDecoy && (
                <SettingRow
                    title="Face or fingerprint"
                    description={
                        session.hasPasskey
                            ? 'A passkey can unlock Resolvr on this device.'
                            : 'Unlock with a passkey. Your passcode still works.'
                    }
                >
                    {session.hasPasskey ? (
                        <Button size="sm" variant="ghost" onClick={() => void session.removePasskey()}>
                            Remove
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => setPasskeyPin(true)}>
                            Add passkey
                        </Button>
                    )}
                </SettingRow>
            )}

            <SettingRow
                title="Lock automatically"
                htmlFor="auto-lock"
                description="When you have not touched the app for a while."
            >
                <Select
                    id="auto-lock"
                    value={settings.autoLockMinutes}
                    onChange={(e) =>
                        void session.saveSettings({
                            autoLockMinutes: Number(e.target.value) as Settings['autoLockMinutes'],
                        })
                    }
                >
                    {autoLockOptions.map((m) => (
                        <option key={m} value={m}>
                            {autoLockLabel(m)}
                        </option>
                    ))}
                </Select>
            </SettingRow>

            <SettingRow
                title="Lock when hidden"
                description="Switching apps or turning off the screen locks Resolvr at once."
            >
                <Toggle
                    label="Lock when hidden"
                    checked={settings.lockOnHide}
                    onChange={(lockOnHide) => void session.saveSettings({ lockOnHide })}
                />
            </SettingRow>

            <SettingRow
                title="Stealth mode"
                description={
                    <>
                        Resolvr opens as a working calculator. Type your passcode, then <span className="mono">=</span>,
                        to unlock. If you installed the app, reinstall it after turning this on so the icon changes too.
                    </>
                }
            >
                <Toggle label="Stealth mode" checked={session.stealth} onChange={(on) => void session.setStealth(on)} />
            </SettingRow>

            <SettingRow
                title="Panic gesture"
                description="Shake the phone, press Escape twice, or tap the logo three times to switch to the calculator at once."
            >
                <Toggle
                    label="Panic gesture"
                    checked={settings.panicGesture}
                    onChange={(panicGesture) => void session.saveSettings({ panicGesture })}
                />
            </SettingRow>

            {!session.isDecoy && (
                <SettingRow
                    title="Decoy passcode"
                    description="A second passcode that opens an empty record, if someone makes you unlock the app. Your real record stays hidden."
                >
                    {session.hasDecoy && (
                        <Button size="sm" variant="ghost" onClick={() => void session.removeDecoy()}>
                            Remove
                        </Button>
                    )}
                    <Button size="sm" onClick={() => setDecoyOpen(true)}>
                        {session.hasDecoy ? 'Change' : 'Set up'}
                    </Button>
                </SettingRow>
            )}

            <ChangePasscode open={changing} onOpenChange={setChanging} />
            <DecoyPasscode open={decoyOpen} onOpenChange={setDecoyOpen} />
            <PinConfirm
                open={passkeyPin}
                onOpenChange={setPasskeyPin}
                title="Add a passkey"
                description="Enter your passcode so the passkey can be linked to your record."
                confirmLabel="Continue"
                tone="primary"
                onConfirm={addPasskey}
            />
        </SettingsCard>
    );
}

const formatOptions = [
    { value: 'pin6', label: '6 digits' },
    { value: 'phrase', label: 'Passphrase' },
    { value: 'pin4', label: '4 digits' },
] as const;

function ChangePasscode({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const session = useSession();
    const toast = useToast();
    // With a decoy, both passcodes share the lock screen, so the type stays the same.
    const formatLocked = session.hasDecoy || session.isDecoy;
    const [format, setFormat] = useState<PinFormat>(session.pinFormat);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [again, setAgain] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const reset = () => {
        setCurrent('');
        setNext('');
        setAgain('');
        setError('');
        setFormat(session.pinFormat);
    };

    const submit = async () => {
        setError('');
        if (!pinRules[format].pattern.test(next))
            return setError(`The new passcode needs ${pinRules[format].hint.toLowerCase()}.`);
        if (next !== again) return setError('The new passcodes do not match.');
        setBusy(true);
        try {
            if (!(await session.verifyPin(current))) return setError('Your current passcode is not right.');
            await session.changePin(current, next, format);
            toast({ title: 'Passcode changed', tone: 'success' });
            reset();
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                onOpenChange(o);
                if (!o) reset();
            }}
        >
            <DialogContent
                title="Change passcode"
                description="Use something you will remember. Nobody can reset it for you."
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                >
                    <PasscodeField
                        label="Current passcode"
                        format={session.pinFormat}
                        value={current}
                        onChange={setCurrent}
                        autoComplete="current-password"
                        autoFocus
                    />
                    {!formatLocked && (
                        <SegmentedControl
                            label="New passcode type"
                            value={format}
                            onValueChange={(f) => {
                                setFormat(f);
                                setNext('');
                                setAgain('');
                            }}
                            options={formatOptions}
                            className="w-full"
                        />
                    )}
                    <PasscodeField label="New passcode" format={format} value={next} onChange={setNext} />
                    <PasscodeField label="New passcode again" format={format} value={again} onChange={setAgain} />
                    <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                        {error}
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={busy || !current || !next || !again}>
                            {busy ? 'Saving…' : 'Change passcode'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DecoyPasscode({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const session = useSession();
    const toast = useToast();
    const format = session.pinFormat;
    const [pin, setPin] = useState('');
    const [again, setAgain] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setError('');
        if (!pinRules[format].pattern.test(pin))
            return setError(`The decoy passcode needs ${pinRules[format].hint.toLowerCase()}.`);
        if (pin !== again) return setError('The passcodes do not match.');
        setBusy(true);
        try {
            if (await session.verifyPin(pin)) return setError('Choose something different from your real passcode.');
            await session.setDecoyPin(pin);
            toast({ title: 'Decoy passcode set', description: 'It opens an empty record.', tone: 'success' });
            setPin('');
            setAgain('');
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                title="Decoy passcode"
                description="Entering it on the lock screen opens a separate, empty record that looks ordinary. Nothing in it links to your real one."
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                >
                    <PasscodeField label="Decoy passcode" format={format} value={pin} onChange={setPin} autoFocus />
                    <PasscodeField label="Decoy passcode again" format={format} value={again} onChange={setAgain} />
                    <p className="text-sm text-fg-muted">
                        Anything added while the decoy is open stays in the decoy. Someone who copies this device&apos;s
                        storage could still tell that a second record exists.
                    </p>
                    <p className="min-h-5 text-sm text-danger-text" aria-live="assertive">
                        {error}
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={busy || !pin || !again}>
                            {busy ? 'Saving…' : 'Save decoy'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
