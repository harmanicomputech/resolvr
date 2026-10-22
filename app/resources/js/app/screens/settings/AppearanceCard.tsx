import { Palette, Scale } from 'lucide-react';

import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Settings } from '@/lib/model/schema';

import { JurisdictionPicker } from '../../components/jurisdiction-picker';
import { useSession } from '../../session';
import { requestTiltPermission } from '../../hooks/use-tilt';
import { SettingRow, SettingsCard, Toggle } from './parts';

const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Device' },
] as const;

const motionOptions = [
    { value: 'system', label: 'Device' },
    { value: 'reduce', label: 'Reduced' },
] as const;

export function AppearanceCard({ settings }: { settings: Settings }) {
    const session = useSession();
    const percent = Math.round(settings.textScale * 100);
    return (
        <SettingsCard
            id="appearance"
            icon={<Palette className="size-4" />}
            title="Appearance"
            description="Make it comfortable to read."
        >
            <SettingRow title="Theme">
                <SegmentedControl
                    label="Theme"
                    value={settings.theme}
                    onValueChange={(theme) => void session.saveSettings({ theme })}
                    options={themeOptions}
                />
            </SettingRow>
            <SettingRow title="Motion" description="Reduced keeps changes to quick fades.">
                <SegmentedControl
                    label="Motion"
                    value={settings.reducedMotion === 'reduce' ? 'reduce' : 'system'}
                    onValueChange={(reducedMotion) => void session.saveSettings({ reducedMotion })}
                    options={motionOptions}
                />
            </SettingRow>
            <SettingRow
                title="Text size"
                htmlFor="text-size"
                description={
                    <span className="tabular-nums">
                        {percent}%{percent === 100 ? ' (standard)' : ''}
                    </span>
                }
            >
                <span className="flex items-center gap-3">
                    <span className="text-xs text-fg-muted" aria-hidden>
                        A
                    </span>
                    <input
                        id="text-size"
                        type="range"
                        min={0.85}
                        max={1.4}
                        step={0.05}
                        value={settings.textScale}
                        aria-valuetext={`${percent}%`}
                        onChange={(e) => void session.saveSettings({ textScale: Number(e.target.value) })}
                        className="w-40 accent-[var(--accent)]"
                    />
                    <span className="text-lg text-fg-muted" aria-hidden>
                        A
                    </span>
                </span>
            </SettingRow>
            <SettingRow title="Tilt effect" description="Dashboard cards shift slightly as you tilt your phone.">
                <Toggle
                    label="Tilt effect"
                    checked={settings.tilt}
                    disabled={settings.reducedMotion === 'reduce'}
                    onChange={async (tilt) => {
                        if (tilt && !(await requestTiltPermission())) return;
                        await session.saveSettings({ tilt });
                    }}
                />
            </SettingRow>
        </SettingsCard>
    );
}

export function JurisdictionCard({ settings }: { settings: Settings }) {
    const session = useSession();
    return (
        <SettingsCard
            id="jurisdiction"
            icon={<Scale className="size-4" />}
            title="Where you work"
            description="Decides which laws Resolvr points to. It is not legal advice."
        >
            <fieldset className="py-4">
                <legend className="sr-only">Jurisdiction</legend>
                <JurisdictionPicker
                    name="settings-jurisdiction"
                    value={settings.jurisdiction}
                    onChange={(jurisdiction) => {
                        void session.saveSettings({ jurisdiction });
                        void session.repos?.singletons.saveProfile({ jurisdiction });
                    }}
                />
            </fieldset>
        </SettingsCard>
    );
}
