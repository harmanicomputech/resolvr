import { caseProfileSchema, settingsSchema, type CaseProfile, type Settings } from '../model/schema';
import type { Vault } from './vault';

/** One-off records: the case profile and app settings (both encrypted). */
export class SingletonRepository {
    constructor(private readonly vault: Vault) {}

    async profile(): Promise<CaseProfile> {
        return caseProfileSchema.parse((await this.vault.get('profile', 'me')) ?? {});
    }

    async saveProfile(profile: Partial<CaseProfile>): Promise<CaseProfile> {
        const next = caseProfileSchema.parse({ ...(await this.profile()), ...profile });
        await this.vault.put('profile', 'me', next);
        return next;
    }

    async settings(): Promise<Settings> {
        return settingsSchema.parse((await this.vault.get('settings', 'app')) ?? {});
    }

    async saveSettings(settings: Partial<Settings>): Promise<Settings> {
        const next = settingsSchema.parse({ ...(await this.settings()), ...settings });
        await this.vault.put('settings', 'app', next);
        return next;
    }
}
