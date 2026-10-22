import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import Dexie from 'dexie';

import { repositories, ResolvrDatabase, Vault, WrongPinError, type Repositories } from '@/lib/db';
import type { Settings } from '@/lib/model/schema';

import { disableReminders } from './lib/reminders';

import { passkeyWrappingKey, registerPasskey } from './lock/passkey';

/**
 * The app session: is there a vault on this device, is it unlocked, and the
 * repositories to read and write it. Decrypted data only ever lives in React
 * state below this provider, and is dropped on lock.
 *
 * A few non-sensitive flags live in plaintext `meta` because they are needed
 * before unlocking: stealth mode and the failed-attempt lockout.
 *
 * A decoy PIN opens a second, separate vault (database `resolvr-decoy`) that
 * looks like a fresh, nearly empty record. When a decoy exists every unlock
 * tries both, so how long a PIN takes to check does not give the real one away.
 */

export type SessionStatus = 'loading' | 'new' | 'locked' | 'unlocked';
/** What the lock screen asks for. Stored in plaintext; it reveals only the kind of passcode, never the passcode. */
export type PinFormat = 'pin4' | 'pin6' | 'phrase';

export const MAX_ATTEMPTS = 5;
const DECOY_DB = 'resolvr-decoy';
export const LOCKOUT_MS = 30_000;

interface Lockout {
    attempts: number;
    until: number;
}

export interface Session {
    status: SessionStatus;
    repos: Repositories | null;
    settings: Settings | null;
    /** Bumps after every write so screens re-read their data. */
    version: number;
    stealth: boolean;
    /** Show the calculator: stealth mode is on, or the panic gesture was used. */
    disguised: boolean;
    pinFormat: PinFormat;
    hasPasskey: boolean;
    /** A recovery phrase is set up (needed for backups). */
    hasRecovery: boolean;
    hasDecoy: boolean;
    /** The open vault is the decoy one: hide anything that would reveal the real record. */
    isDecoy: boolean;
    lockout: Lockout;
    create(pin: string, format: PinFormat): Promise<void>;
    unlock(pin: string): Promise<'ok' | 'wrong' | 'locked-out'>;
    /** Check the passcode again before a sensitive action, without changing the session. */
    verifyPin(pin: string): Promise<boolean>;
    unlockWithPasskey(): Promise<boolean>;
    addPasskey(pin: string): Promise<void>;
    removePasskey(): Promise<void>;
    lock(): void;
    /** Lock at once and show the calculator, whatever the stealth setting. */
    panic(): void;
    refresh(): void;
    saveSettings(patch: Partial<Settings>): Promise<void>;
    setStealth(on: boolean): Promise<void>;
    changePin(currentPin: string, newPin: string, format: PinFormat): Promise<void>;
    /** Add (or replace) the recovery unlocker for `phrase`, and remember the backup id and token. */
    setupRecovery(pin: string, phrase: string): Promise<void>;
    /** Forgot the PIN: set a new one with the recovery phrase, and open the vault. */
    recoverPin(phrase: string, newPin: string, format: PinFormat): Promise<void>;
    /** New device: restore an encrypted backup with its phrase and a new PIN. */
    restore(
        file: Blob,
        phrase: string,
        newPin: string,
        format: PinFormat,
        onProgress?: (f: number) => void,
    ): Promise<void>;
    /** The encrypted backup file of the open vault. */
    backupFile(): Promise<Blob>;
    setDecoyPin(pin: string): Promise<void>;
    removeDecoy(): Promise<void>;
    /** Delete everything on this device and start again. (In the decoy, deletes only the decoy.) */
    wipe(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
    const session = useContext(SessionContext);
    if (!session) throw new Error('useSession must be used inside <SessionProvider>');
    return session;
}

/** Repositories of the unlocked vault. Only call from screens behind the lock. */
export function useRepos(): Repositories {
    const { repos } = useSession();
    if (!repos) throw new Error('The vault is locked');
    return repos;
}

export function SessionProvider({ children, db: injectedDb }: { children: ReactNode; db?: ResolvrDatabase }) {
    const db = useMemo(() => injectedDb ?? new ResolvrDatabase(), [injectedDb]);
    const [status, setStatus] = useState<SessionStatus>('loading');
    const [repos, setRepos] = useState<Repositories | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [version, setVersion] = useState(0);
    const [stealth, setStealthState] = useState(false);
    const [lockout, setLockout] = useState<Lockout>({ attempts: 0, until: 0 });
    const [pinFormat, setPinFormat] = useState<PinFormat>('pin4');
    const [passkeyData, setPasskeyData] = useState<Record<string, string> | undefined>();
    const [panicked, setPanicked] = useState(false);
    const [hasRecovery, setHasRecovery] = useState(false);
    const [hasDecoy, setHasDecoy] = useState(false);
    const [isDecoy, setIsDecoy] = useState(false);
    const vaultRef = useRef<Vault | null>(null);
    const decoyDb = useMemo(
        () => new ResolvrDatabase(injectedDb ? `${injectedDb.name}-decoy` : DECOY_DB),
        [injectedDb],
    );

    useEffect(() => {
        void (async () => {
            const exists = await Vault.exists(db);
            setStealthState(Boolean((await db.meta.get('stealth'))?.value));
            setLockout(((await db.meta.get('lockout'))?.value as Lockout | undefined) ?? { attempts: 0, until: 0 });
            setPinFormat(((await db.meta.get('pinFormat'))?.value as PinFormat | undefined) ?? 'pin4');
            if (exists) {
                const unlockers = await Vault.unlockers(db);
                setPasskeyData(unlockers.passkey?.data);
                setHasRecovery(Boolean(unlockers.recovery));
            }
            setHasDecoy(await Dexie.exists(decoyDb.name));
            setStatus(exists ? 'locked' : 'new');
        })();
    }, [db, decoyDb]);

    const open = useCallback(async (vault: Vault, decoy = false) => {
        vaultRef.current = vault;
        setIsDecoy(decoy);
        const r = repositories(vault);
        vault.onLock(() => {
            setRepos(null);
            setSettings(null);
            setStatus('locked');
        });
        setSettings(await r.singletons.settings());
        setPanicked(false);
        setRepos(r);
        setStatus('unlocked');
    }, []);

    const create = useCallback(
        async (pin: string, format: PinFormat) => {
            const vault = await Vault.create(pin, { db });
            await db.meta.put({ key: 'pinFormat', value: format });
            setPinFormat(format);
            await open(vault);
        },
        [db, open],
    );

    /** Try a PIN against the real vault and, if there is one, the decoy: always both, for even timing. */
    const tryPin = useCallback(
        async (pin: string): Promise<{ vault: Vault; decoy: boolean } | null> => {
            const attempt = async (target: ResolvrDatabase) => {
                try {
                    return await Vault.unlock(pin, { db: target });
                } catch (error) {
                    if (error instanceof WrongPinError) return null;
                    throw error;
                }
            };
            const real = await attempt(db);
            const decoy = hasDecoy ? await attempt(decoyDb) : null;
            if (real) {
                decoy?.lock();
                return { vault: real, decoy: false };
            }
            return decoy ? { vault: decoy, decoy: true } : null;
        },
        [db, decoyDb, hasDecoy],
    );

    const resetLockout = useCallback(async () => {
        const reset = { attempts: 0, until: 0 };
        await db.meta.put({ key: 'lockout', value: reset });
        setLockout(reset);
    }, [db]);

    const unlock = useCallback(
        async (pin: string): Promise<'ok' | 'wrong' | 'locked-out'> => {
            const current = ((await db.meta.get('lockout'))?.value as Lockout | undefined) ?? { attempts: 0, until: 0 };
            if (current.until > Date.now()) return 'locked-out';
            const result = await tryPin(pin);
            if (result) {
                await open(result.vault, result.decoy);
                await resetLockout();
                return 'ok';
            }
            const attempts = current.attempts + 1;
            const next =
                attempts >= MAX_ATTEMPTS ? { attempts: 0, until: Date.now() + LOCKOUT_MS } : { attempts, until: 0 };
            await db.meta.put({ key: 'lockout', value: next });
            setLockout(next);
            return next.until ? 'locked-out' : 'wrong';
        },
        [db, open, resetLockout, tryPin],
    );

    const verifyPin = useCallback(
        async (pin: string) => {
            try {
                (await Vault.unlock(pin, { db: vaultRef.current?.db ?? db })).lock();
                return true;
            } catch (error) {
                if (error instanceof WrongPinError) return false;
                throw error;
            }
        },
        [db],
    );

    const unlockWithPasskey = useCallback(async () => {
        if (!passkeyData) return false;
        try {
            await open(await Vault.unlockWith('passkey', await passkeyWrappingKey(passkeyData), { db }));
            await resetLockout();
            return true;
        } catch {
            return false; // cancelled, or a different passkey: fall back to the PIN quietly
        }
    }, [db, open, passkeyData, resetLockout]);

    const addPasskey = useCallback(async (pin: string) => {
        const vault = vaultRef.current;
        if (!vault) throw new Error('The vault is locked');
        const { wrappingKey, data } = await registerPasskey();
        await vault.addUnlocker('passkey', pin, wrappingKey, data);
        setPasskeyData(data);
    }, []);

    const removePasskey = useCallback(async () => {
        await vaultRef.current?.removeUnlocker('passkey');
        setPasskeyData(undefined);
    }, []);

    const lock = useCallback(() => {
        vaultRef.current?.lock();
        vaultRef.current = null;
    }, []);

    const panic = useCallback(() => {
        setPanicked(true);
        lock();
    }, [lock]);

    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    const saveSettings = useCallback(
        async (patch: Partial<Settings>) => {
            if (!repos) return;
            setSettings(await repos.singletons.saveSettings(patch));
            // The service worker words reminders before unlock, so it needs this one flag in plaintext.
            if (patch.reminders && !isDecoy)
                await db.meta.put({ key: 'reminderStyle', value: patch.reminders.disguised ? 'disguised' : 'plain' });
        },
        [repos, db, isDecoy],
    );

    const setStealth = useCallback(
        async (on: boolean) => {
            await db.meta.put({ key: 'stealth', value: on });
            setStealthState(on);
            await saveSettings({ stealth: on });
        },
        [db, saveSettings],
    );

    const changePin = useCallback(
        async (currentPin: string, newPin: string, format: PinFormat) => {
            const vault = vaultRef.current;
            if (!vault) throw new Error('The vault is locked');
            await vault.changePin(currentPin, newPin);
            if (!isDecoy) {
                await db.meta.put({ key: 'pinFormat', value: format });
                setPinFormat(format);
            }
        },
        [db, isDecoy],
    );

    const setupRecovery = useCallback(
        async (pin: string, phrase: string) => {
            const vault = vaultRef.current;
            if (!vault || !repos) throw new Error('The vault is locked');
            const { deriveRecovery } = await import('@/lib/backup/recovery');
            const keys = await deriveRecovery(phrase);
            await vault.addUnlocker('recovery', pin, keys.wrappingKey);
            const backup = (await repos.singletons.settings()).backup;
            setSettings(
                await repos.singletons.saveSettings({
                    backup: { ...backup, backupId: keys.backupId, token: keys.token, lastBackupAt: undefined },
                }),
            );
            if (!isDecoy) setHasRecovery(true);
        },
        [repos, isDecoy],
    );

    const recoverPin = useCallback(
        async (phrase: string, newPin: string, format: PinFormat) => {
            const { deriveRecovery } = await import('@/lib/backup/recovery');
            const keys = await deriveRecovery(phrase);
            const vault = await Vault.resetPinWithRecovery(keys.wrappingKey, newPin, { db });
            await db.meta.put({ key: 'pinFormat', value: format });
            setPinFormat(format);
            await resetLockout();
            await open(vault);
        },
        [db, open, resetLockout],
    );

    const restore = useCallback(
        async (file: Blob, phrase: string, newPin: string, format: PinFormat, onProgress?: (f: number) => void) => {
            const { deriveRecovery } = await import('@/lib/backup/recovery');
            const keys = await deriveRecovery(phrase);
            let vault: Vault;
            try {
                const { restoreBackup } = await import('@/lib/backup/format');
                vault = await restoreBackup(file, keys.wrappingKey, newPin, { db, onProgress });
            } catch (error) {
                if (!db.isOpen()) await db.open(); // a failed restore deletes what it wrote
                throw error;
            }
            await db.meta.put({ key: 'pinFormat', value: format });
            setPinFormat(format);
            setHasRecovery(true);
            // Same phrase, same backup: keep backing up to it from this device.
            const r = repositories(vault);
            const backup = (await r.singletons.settings()).backup;
            await r.singletons.saveSettings({ backup: { ...backup, backupId: keys.backupId, token: keys.token } });
            await open(vault);
        },
        [db, open],
    );

    const backupFile = useCallback(async () => {
        const vault = vaultRef.current;
        if (!vault) throw new Error('The vault is locked');
        const { createBackup } = await import('@/lib/backup/format');
        return createBackup(vault);
    }, []);

    const setDecoyPin = useCallback(
        async (pin: string) => {
            if (await Vault.exists(decoyDb)) await decoyDb.delete().then(() => decoyDb.open());
            const decoy = await Vault.create(pin, { db: decoyDb });
            // The decoy should open straight to an empty, ordinary-looking record.
            const r = repositories(decoy);
            await r.singletons.saveSettings({
                ...settings,
                notLegalAdviceAcknowledgedAt: new Date().toISOString(),
                reminders: undefined,
                backup: undefined,
            });
            await r.singletons.saveProfile({ jurisdiction: settings?.jurisdiction ?? 'us' });
            decoy.lock();
            setHasDecoy(true);
        },
        [decoyDb, settings],
    );

    const removeDecoy = useCallback(async () => {
        await decoyDb.delete();
        setHasDecoy(false);
    }, [decoyDb]);

    const wipe = useCallback(async () => {
        const reminders = settings?.reminders;
        vaultRef.current?.lock();
        vaultRef.current = null;
        if (isDecoy) {
            await decoyDb.delete();
            setHasDecoy(false);
            setIsDecoy(false);
            setStatus('locked');
            return;
        }
        if (reminders?.enabled) await disableReminders(reminders).catch(() => undefined);
        await db.delete();
        await db.open();
        await decoyDb.delete();
        setStealthState(false);
        setPasskeyData(undefined);
        setHasRecovery(false);
        setHasDecoy(false);
        setPanicked(false);
        setLockout({ attempts: 0, until: 0 });
        setStatus('new');
    }, [db, decoyDb, isDecoy, settings]);

    const value = useMemo<Session>(
        () => ({
            status,
            repos,
            settings,
            version,
            stealth,
            disguised: stealth || panicked,
            pinFormat,
            hasPasskey: Boolean(passkeyData),
            hasRecovery,
            hasDecoy,
            isDecoy,
            lockout,
            create,
            unlock,
            verifyPin,
            unlockWithPasskey,
            addPasskey,
            removePasskey,
            lock,
            panic,
            refresh,
            saveSettings,
            setStealth,
            changePin,
            setupRecovery,
            recoverPin,
            restore,
            backupFile,
            setDecoyPin,
            removeDecoy,
            wipe,
        }),
        [
            status,
            repos,
            settings,
            version,
            stealth,
            panicked,
            pinFormat,
            passkeyData,
            hasRecovery,
            hasDecoy,
            isDecoy,
            lockout,
            create,
            unlock,
            verifyPin,
            unlockWithPasskey,
            addPasskey,
            removePasskey,
            lock,
            panic,
            refresh,
            saveSettings,
            setStealth,
            changePin,
            setupRecovery,
            recoverPin,
            restore,
            backupFile,
            setDecoyPin,
            removeDecoy,
            wipe,
        ],
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
