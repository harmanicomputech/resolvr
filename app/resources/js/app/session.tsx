import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { repositories, ResolvrDatabase, Vault, WrongPinError, type Repositories } from '@/lib/db';
import type { Settings } from '@/lib/model/schema';

import { passkeyWrappingKey, registerPasskey } from './lock/passkey';

/**
 * The app session: is there a vault on this device, is it unlocked, and the
 * repositories to read and write it. Decrypted data only ever lives in React
 * state below this provider, and is dropped on lock.
 *
 * A few non-sensitive flags live in plaintext `meta` because they are needed
 * before unlocking: stealth mode and the failed-attempt lockout.
 */

export type SessionStatus = 'loading' | 'new' | 'locked' | 'unlocked';
/** What the lock screen asks for. Stored in plaintext; it reveals only the kind of passcode, never the passcode. */
export type PinFormat = 'pin4' | 'pin6' | 'phrase';

export const MAX_ATTEMPTS = 5;
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
    lockout: Lockout;
    create(pin: string, format: PinFormat): Promise<void>;
    unlock(pin: string): Promise<'ok' | 'wrong' | 'locked-out'>;
    unlockWithPasskey(): Promise<boolean>;
    addPasskey(pin: string): Promise<void>;
    removePasskey(): Promise<void>;
    lock(): void;
    /** Lock at once and show the calculator, whatever the stealth setting. */
    panic(): void;
    refresh(): void;
    saveSettings(patch: Partial<Settings>): Promise<void>;
    setStealth(on: boolean): Promise<void>;
    /** Delete everything on this device and start again. */
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
    const vaultRef = useRef<Vault | null>(null);

    useEffect(() => {
        void (async () => {
            const exists = await Vault.exists(db);
            setStealthState(Boolean((await db.meta.get('stealth'))?.value));
            setLockout(((await db.meta.get('lockout'))?.value as Lockout | undefined) ?? { attempts: 0, until: 0 });
            setPinFormat(((await db.meta.get('pinFormat'))?.value as PinFormat | undefined) ?? 'pin4');
            if (exists) setPasskeyData((await Vault.unlockers(db)).passkey?.data);
            setStatus(exists ? 'locked' : 'new');
        })();
    }, [db]);

    const open = useCallback(async (vault: Vault) => {
        vaultRef.current = vault;
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

    const resetLockout = useCallback(async () => {
        const reset = { attempts: 0, until: 0 };
        await db.meta.put({ key: 'lockout', value: reset });
        setLockout(reset);
    }, [db]);

    const unlock = useCallback(
        async (pin: string): Promise<'ok' | 'wrong' | 'locked-out'> => {
            const current = ((await db.meta.get('lockout'))?.value as Lockout | undefined) ?? { attempts: 0, until: 0 };
            if (current.until > Date.now()) return 'locked-out';
            try {
                await open(await Vault.unlock(pin, { db }));
                await resetLockout();
                return 'ok';
            } catch (error) {
                if (!(error instanceof WrongPinError)) throw error;
                const attempts = current.attempts + 1;
                const next =
                    attempts >= MAX_ATTEMPTS ? { attempts: 0, until: Date.now() + LOCKOUT_MS } : { attempts, until: 0 };
                await db.meta.put({ key: 'lockout', value: next });
                setLockout(next);
                return next.until ? 'locked-out' : 'wrong';
            }
        },
        [db, open, resetLockout],
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
        },
        [repos],
    );

    const setStealth = useCallback(
        async (on: boolean) => {
            await db.meta.put({ key: 'stealth', value: on });
            setStealthState(on);
            await saveSettings({ stealth: on });
        },
        [db, saveSettings],
    );

    const wipe = useCallback(async () => {
        vaultRef.current?.lock();
        vaultRef.current = null;
        await db.delete();
        await db.open();
        setStealthState(false);
        setPasskeyData(undefined);
        setPanicked(false);
        setLockout({ attempts: 0, until: 0 });
        setStatus('new');
    }, [db]);

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
            lockout,
            create,
            unlock,
            unlockWithPasskey,
            addPasskey,
            removePasskey,
            lock,
            panic,
            refresh,
            saveSettings,
            setStealth,
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
            lockout,
            create,
            unlock,
            unlockWithPasskey,
            addPasskey,
            removePasskey,
            lock,
            panic,
            refresh,
            saveSettings,
            setStealth,
            wipe,
        ],
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
