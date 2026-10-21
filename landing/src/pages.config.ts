/** Per-page metadata fed to the shared head partial. */
export interface PageMeta {
    title: string;
    description: string;
    /** Path without extension, e.g. "/story". */
    path: string;
}

export const site = {
    name: 'Resolvr',
    url: 'https://resolvrapp.com',
    appUrl: 'https://app.resolvrapp.com',
    email: 'resolvrapp@resolvrapp.com',
    tagline: 'Your evidence, your protection.',
};

export const pages: Record<string, PageMeta> = {
    index: {
        title: 'Resolvr: Finally heard. Finally resolved.',
        description:
            'Document workplace incidents with tamper-evident timestamps, keep evidence encrypted on your device, and prepare HR-ready complaints. Not legal advice.',
        path: '/',
    },
    story: {
        title: 'Our story · Resolvr',
        description: 'Why Resolvr exists, and who built it.',
        path: '/story',
    },
    security: {
        title: 'Security and privacy · Resolvr',
        description:
            'How Resolvr keeps your record private: on-device encryption, PIN lock, stealth mode and tamper-evident timestamps.',
        path: '/security',
    },
    pricing: {
        title: 'Pricing · Resolvr',
        description: 'Start documenting for free.',
        path: '/pricing',
    },
    privacy: {
        title: 'Privacy policy · Resolvr',
        description: 'What Resolvr collects, what it never sees, and your rights.',
        path: '/privacy',
    },
    terms: {
        title: 'Terms of service · Resolvr',
        description: 'The terms for using Resolvr.',
        path: '/terms',
    },
};
