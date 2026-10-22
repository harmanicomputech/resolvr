import type { ReactNode } from 'react';

import { Field, Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

import type { PinFormat } from '../../session';

/** A settings group: icon badge, title, short description, then rows. */
export function SettingsCard({
    id,
    icon,
    title,
    description,
    children,
}: {
    id: string;
    icon: ReactNode;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="card scroll-mt-24 p-5 sm:p-6">
            <header className="mb-2 flex items-start gap-3">
                <span className="icon-badge" aria-hidden>
                    {icon}
                </span>
                <div>
                    <h2 id={`${id}-title`} className="font-display text-base font-semibold text-fg">
                        {title}
                    </h2>
                    {description && <p className="text-sm text-fg-muted">{description}</p>}
                </div>
            </header>
            <div className="divide-y divide-hairline">{children}</div>
        </section>
    );
}

/** One setting: what it is on the left, its control on the right (stacked on narrow screens). */
export function SettingRow({
    title,
    description,
    children,
    htmlFor,
    className,
}: {
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    htmlFor?: string;
    className?: string;
}) {
    const Label = htmlFor ? 'label' : 'p';
    return (
        <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 py-4', className)}>
            <div className="min-w-0 flex-1 basis-56">
                <Label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
                    {title}
                </Label>
                {description && <div className="mt-0.5 text-sm text-fg-muted">{description}</div>}
            </div>
            {children && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}

/** An on/off switch with a real checkbox underneath for keyboards and screen readers. */
export function Toggle({
    checked,
    onChange,
    label,
    disabled,
    id,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    disabled?: boolean;
    id?: string;
}) {
    return (
        <span className="toggle">
            <input
                id={id}
                type="checkbox"
                role="switch"
                aria-label={label}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span aria-hidden />
        </span>
    );
}

export const pinRules: Record<PinFormat, { pattern: RegExp; hint: string; numeric: boolean; max: number }> = {
    pin4: { pattern: /^\d{4}$/, hint: '4 digits', numeric: true, max: 4 },
    pin6: { pattern: /^\d{6}$/, hint: '6 digits', numeric: true, max: 6 },
    phrase: { pattern: /^.{8,128}$/, hint: 'At least 8 characters', numeric: false, max: 128 },
};

/** A passcode field shaped by the passcode type. */
export function PasscodeField({
    label,
    format,
    value,
    onChange,
    error,
    autoFocus,
    autoComplete = 'new-password',
}: {
    label: string;
    format: PinFormat;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    autoFocus?: boolean;
    autoComplete?: string;
}) {
    const rule = pinRules[format];
    return (
        <Field label={label} hint={rule.hint} error={error}>
            <Input
                type="password"
                inputMode={rule.numeric ? 'numeric' : undefined}
                pattern={rule.numeric ? '[0-9]*' : undefined}
                maxLength={rule.max}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => onChange(rule.numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
            />
        </Field>
    );
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
