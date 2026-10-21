import { Head } from '@inertiajs/react';
import { FileText, Fingerprint, FolderLock, Inbox, Lock, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Tag } from '@/components/ui/chip';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SeverityPill, severities } from '@/components/ui/severity-pill';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Stat } from '@/components/ui/stat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { duration, ease, spring } from '@/lib/design/motion';

/*
 * Local-only review page for the "Quiet Armour" design system (routes/web.php).
 * Renders every token and component in both themes, side by side on wide screens.
 */

export default function Design() {
    return (
        <TooltipProvider>
            <Head title="Design system" />
            <div className="grid min-h-dvh xl:grid-cols-2">
                <ThemePanel theme="dark" />
                <ThemePanel theme="light" />
            </div>
        </TooltipProvider>
    );
}

function ThemePanel({ theme }: { theme: 'dark' | 'light' }) {
    return (
        <div className={`${theme} bg-bg text-fg`}>
            <div className="mx-auto max-w-3xl space-y-16 px-4 py-12 sm:px-8">
                <header className="space-y-3">
                    <p className="eyebrow">{theme === 'dark' ? 'Ink · hero theme' : 'Paper'}</p>
                    <h1 className="wordmark text-6xl">Resolvr</h1>
                    <p className="text-lg text-fg-muted">
                        Quiet Armour: calm, protective, premium.{' '}
                        <span className="text-aurora display italic">Finally resolved.</span>
                    </p>
                </header>
                <Colours />
                <Typography />
                <Scales />
                <Surfaces />
                <Motion />
                <Icons />
                <Components />
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-5">
            <h2 className="display border-b border-hairline pb-3 text-3xl">{title}</h2>
            {children}
        </section>
    );
}

function Swatch({ name, className, ring }: { name: string; className: string; ring?: boolean }) {
    return (
        <div className="space-y-1.5">
            <div className={`h-14 rounded-md ${ring ? 'border border-hairline' : ''} ${className}`} />
            <p className="mono text-2xs text-fg-muted">{name}</p>
        </div>
    );
}

function Colours() {
    return (
        <Section title="Colour">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                <Swatch name="bg" className="bg-bg" ring />
                <Swatch name="surface" className="bg-surface" ring />
                <Swatch name="raised" className="bg-raised" ring />
                <Swatch name="overlay" className="bg-overlay" ring />
                <Swatch name="inverse" className="bg-inverse" ring />
            </div>
            <div className="grid gap-2 rounded-lg border border-hairline bg-surface p-4">
                <p className="text-fg">fg: primary text, headings</p>
                <p className="text-fg-muted">fg-muted: secondary text, labels</p>
                <p className="text-fg-subtle">fg-subtle: placeholders, metadata</p>
                <p className="text-accent-text">accent-text: links and selected states</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                <Swatch name="accent" className="bg-accent" />
                <Swatch name="accent-strong" className="bg-accent-strong" />
                <Swatch name="accent-tint" className="bg-accent-tint" ring />
                <Swatch name="cyan" className="bg-cyan" />
                <Swatch name="violet" className="bg-violet" />
            </div>
            <div className="h-14 rounded-md bg-[image:var(--aurora)]" />
            <p className="mono -mt-3 text-2xs text-fg-muted">--aurora · glows, focus rings and primary CTAs only</p>

            <h3 className="eyebrow pt-2">Severity · base / tint 10% / border 24% / text</h3>
            <div className="grid gap-3 sm:grid-cols-4">
                {severities.map((level) => (
                    <div key={level} className="space-y-2">
                        <div className="flex gap-1" data-severity={level}>
                            <div className="h-10 flex-1 rounded-sm bg-(--sev-base)" />
                            <div className="h-10 flex-1 rounded-sm border border-(--sev-border) bg-(--sev-tint)" />
                        </div>
                        <SeverityPill severity={level} />
                    </div>
                ))}
            </div>

            <h3 className="eyebrow pt-2">Semantic</h3>
            <div className="grid gap-2 sm:grid-cols-2">
                <p className="rounded-md bg-success-tint px-3 py-2 text-sm text-success-text">
                    Success: backup complete
                </p>
                <p className="rounded-md bg-warning-tint px-3 py-2 text-sm text-warning-text">Warning: unsaved draft</p>
                <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger-text">
                    Danger: this cannot be undone
                </p>
                <p className="rounded-md bg-info-tint px-3 py-2 text-sm text-info-text">Info: works offline</p>
            </div>
        </Section>
    );
}

const typeScale = ['6xl', '5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs', '2xs'] as const;
const typeClass: Record<(typeof typeScale)[number], string> = {
    '6xl': 'text-6xl',
    '5xl': 'text-5xl',
    '4xl': 'text-4xl',
    '3xl': 'text-3xl',
    '2xl': 'text-2xl',
    xl: 'text-xl',
    lg: 'text-lg',
    base: 'text-base',
    sm: 'text-sm',
    xs: 'text-xs',
    '2xs': 'text-2xs',
};

function Typography() {
    return (
        <Section title="Typography">
            <div className="space-y-4">
                <p className="display text-5xl">
                    Finally heard. <em className="text-aurora">Finally resolved.</em>
                </p>
                <p className="text-base text-fg-muted">
                    Inter for interface text. Calm, plain sentences. Never “your case will win”.
                </p>
                <p className="mono text-sm">INC-014 · sha256:9f2c…a71e · 2026-10-21T09:42:00Z</p>
            </div>
            <div className="space-y-2">
                {typeScale.map((step) => (
                    <div key={step} className="flex items-baseline gap-4 overflow-hidden">
                        <span className="mono w-10 shrink-0 text-2xs text-fg-subtle">{step}</span>
                        <span
                            className={`${typeClass[step]} ${step.endsWith('xl') && step !== 'xl' ? 'display' : ''} truncate`}
                        >
                            Your evidence, your protection
                        </span>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function Scales() {
    return (
        <Section title="Spacing, radii, blur">
            <div className="space-y-1.5">
                {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
                    <div key={n} className="flex items-center gap-3">
                        <span className="mono w-14 text-2xs text-fg-subtle">{n * 4}px</span>
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${n * 4}px` }} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-5 gap-3">
                {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((r) => (
                    <div key={r} className="space-y-1.5">
                        <div
                            className={`aspect-square border border-hairline-strong bg-raised ${
                                {
                                    sm: 'rounded-sm',
                                    md: 'rounded-md',
                                    lg: 'rounded-lg',
                                    xl: 'rounded-xl',
                                    full: 'rounded-full',
                                }[r]
                            }`}
                        />
                        <p className="mono text-2xs text-fg-muted">{r}</p>
                    </div>
                ))}
            </div>
            <div className="relative grid grid-cols-3 gap-3 overflow-hidden rounded-xl p-4">
                <div className="aurora-glow" />
                {(['sm', 'md', 'lg'] as const).map((b) => (
                    <div
                        key={b}
                        className="glass grid h-20 place-items-center text-sm"
                        data-blur={b === 'md' ? undefined : b}
                    >
                        blur-{b}
                    </div>
                ))}
            </div>
        </Section>
    );
}

function Surfaces() {
    return (
        <Section title="Surfaces and elevation">
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <p className="eyebrow">card</p>
                    <p className="mt-2 text-sm text-fg-muted">Solid surface, hairline border, soft raised shadow.</p>
                </Card>
                <Card interactive>
                    <p className="eyebrow">card · interactive</p>
                    <p className="mt-2 text-sm text-fg-muted">Lifts on hover.</p>
                </Card>
            </div>
            <div className="relative overflow-hidden rounded-xl p-6">
                <div className="aurora-glow" />
                <Card glass className="relative">
                    <p className="eyebrow">glass</p>
                    <p className="mt-2 text-sm">Translucent fill, backdrop blur, 1px gradient edge, fine noise.</p>
                </Card>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['shadow-hairline', 'shadow-raised', 'shadow-floating', 'shadow-overlay'] as const).map((s) => (
                    <div key={s} className={`grid h-20 place-items-center rounded-lg bg-surface ${s}`}>
                        <span className="mono text-2xs text-fg-muted">{s.replace('shadow-', '')}</span>
                    </div>
                ))}
            </div>
        </Section>
    );
}

const easings = [
    { name: 'outExpo · entrances', ease: ease.outExpo },
    { name: 'inOutQuart · pages', ease: ease.inOutQuart },
    { name: 'standard · state', ease: ease.standard },
] as const;

function Motion() {
    const [on, setOn] = useState(false);
    return (
        <Section title="Motion">
            <p className="text-sm text-fg-muted">
                Durations 120 / 200 / 320 / 560 / 900ms. Motion explains hierarchy or state. Under reduced motion,
                everything becomes a short fade.
            </p>
            <Button size="sm" onClick={() => setOn((v) => !v)}>
                Play
            </Button>
            <div className="space-y-3">
                {easings.map((e) => (
                    <div key={e.name} className="space-y-1">
                        <p className="mono text-2xs text-fg-subtle">{e.name}</p>
                        <div className="h-8 rounded-full bg-raised p-1">
                            <motion.div
                                className="size-6 rounded-full bg-accent"
                                animate={{ x: on ? 'calc(min(36rem, 70vw) - 2rem)' : 0 }}
                                transition={{ duration: duration.slow, ease: e.ease }}
                            />
                        </div>
                    </div>
                ))}
                <div className="space-y-1">
                    <p className="mono text-2xs text-fg-subtle">spring.press · interactive</p>
                    <div className="h-8 rounded-full bg-raised p-1">
                        <motion.div
                            className="size-6 rounded-full bg-violet"
                            animate={{ x: on ? 'calc(min(36rem, 70vw) - 2rem)' : 0 }}
                            transition={{ type: 'spring', ...spring.press }}
                        />
                    </div>
                </div>
            </div>
        </Section>
    );
}

function Icons() {
    const icons = [Lock, ShieldCheck, Fingerprint, FolderLock, FileText, Inbox, Sparkles, Plus];
    return (
        <Section title="Icons">
            <p className="text-sm text-fg-muted">Lucide, 1.5px stroke, currentColor. No emoji in the UI.</p>
            <div className="flex flex-wrap gap-5 text-fg-muted">
                {icons.map((Icon, i) => (
                    <Icon key={i} className="size-6" aria-hidden />
                ))}
            </div>
        </Section>
    );
}

const types = ['Verbal harassment', 'Retaliation', 'Exclusion', 'Unequal pay'];

function Components() {
    const [selected, setSelected] = useState<string[]>(['Retaliation']);
    const [tone, setTone] = useState<'formal' | 'firm' | 'urgent'>('formal');

    return (
        <Section title="Components">
            <div className="space-y-3">
                <p className="eyebrow">Button</p>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary">Start documenting</Button>
                    <Button>Secondary glass</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Delete</Button>
                    <Button variant="primary" disabled>
                        Disabled
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="lg">
                        <Plus aria-hidden /> Log incident
                    </Button>
                    <Button size="sm">Small</Button>
                    <Tooltip content="Lock now">
                        <Button size="icon" aria-label="Lock now">
                            <Lock aria-hidden />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" hint="A few words you will recognise later.">
                    <Input placeholder="Comment in team meeting" />
                </Field>
                <Field label="Severity">
                    <Select defaultValue="medium">
                        {severities.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Email" error="Enter an email address like name@example.com.">
                    <Input type="email" defaultValue="name@" />
                </Field>
                <Field label="What happened" hint="Quote exact words if you can." className="sm:col-span-2">
                    <Textarea placeholder="Write it as you remember it." />
                </Field>
            </div>

            <div className="space-y-3">
                <p className="eyebrow">Chip, tag, severity</p>
                <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                        <Chip
                            key={t}
                            selected={selected.includes(t)}
                            onSelectedChange={(on) =>
                                setSelected((cur) => (on ? [...cur, t] : cur.filter((x) => x !== t)))
                            }
                        >
                            {t}
                        </Chip>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Tag>Title VII</Tag>
                    <Tag>ADA</Tag>
                    {severities.map((s) => (
                        <SeverityPill key={s} severity={s} />
                    ))}
                </div>
            </div>

            <Card className="grid grid-cols-3 gap-4">
                <Stat label="Incidents" value="12" delta="3 this month" />
                <Stat label="Days since last" value="4" />
                <Stat label="Evidence score" value="78" delta="of 100" />
            </Card>

            <div className="space-y-3">
                <p className="eyebrow">Tabs, segmented control</p>
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="reported">Reported</TabsTrigger>
                        <TabsTrigger value="drafts">Drafts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="text-sm text-fg-muted">
                        12 incidents
                    </TabsContent>
                    <TabsContent value="reported" className="text-sm text-fg-muted">
                        5 reported to HR
                    </TabsContent>
                    <TabsContent value="drafts" className="text-sm text-fg-muted">
                        1 draft
                    </TabsContent>
                </Tabs>
                <SegmentedControl
                    label="Tone"
                    value={tone}
                    onValueChange={setTone}
                    options={[
                        { value: 'formal', label: 'Formal' },
                        { value: 'firm', label: 'Firm' },
                        { value: 'urgent', label: 'Urgent' },
                    ]}
                />
            </div>

            <div className="space-y-3">
                <p className="eyebrow">Dialog, sheet</p>
                <div className="flex flex-wrap gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Open dialog</Button>
                        </DialogTrigger>
                        <DialogContent
                            title="Delete this incident?"
                            description="It moves to trash for 30 days. You will need your PIN."
                        >
                            <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                    <Button variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button variant="danger">Move to trash</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button>Bottom sheet</Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" title="Quick capture" description="A title now, details later.">
                            <Input placeholder="What happened?" aria-label="What happened?" />
                        </SheetContent>
                    </Sheet>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button>Side sheet</Button>
                        </SheetTrigger>
                        <SheetContent side="right" title="Evidence score" description="How each factor contributes.">
                            <p className="text-sm text-fg-muted">
                                Incidents 25 · Witnesses 20 · Severity 20 · Descriptions 15…
                            </p>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <div className="space-y-3">
                <p className="eyebrow">Toast</p>
                <Toast tone="success" title="Incident saved" description="INC-014 · timestamp locked" />
                <Toast tone="info" title="You're offline" description="Everything still saves on this device." />
                <Toast tone="danger" title="Couldn't export" action={<Button size="sm">Retry</Button>} />
            </div>

            <EmptyState
                icon={<Inbox className="size-5" />}
                title="No incidents yet"
                action={
                    <Button variant="primary">
                        <Plus aria-hidden /> Log your first incident
                    </Button>
                }
            >
                It takes about a minute. Everything stays encrypted on this device.
            </EmptyState>

            <div className="space-y-3" aria-label="Loading">
                <p className="eyebrow">Skeleton</p>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </Section>
    );
}
