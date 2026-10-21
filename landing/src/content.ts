/**
 * Marketing copy that is rendered into pages (via Handlebars) and reused for
 * structured data. Keep the tone calm and precise: never promise outcomes,
 * never overclaim security. Anything in [BRACKETS] still needs a real value.
 */

export interface Faq {
    q: string;
    a: string;
}

export const faq: Faq[] = [
    {
        q: 'Is this legal advice?',
        a: 'No. Resolvr helps you keep an organised, timestamped record and draft clear documents from it. It is not a law firm and does not give legal advice. For advice about your situation, speak to an employment lawyer or the relevant agency, such as the EEOC in the US or Acas in the UK.',
    },
    {
        q: 'Where is my data?',
        a: 'On your device. Incidents and evidence are encrypted in your browser with a key derived from your PIN before they are stored. If you turn on backup, only an encrypted copy reaches our server, and we cannot read it.',
    },
    {
        q: 'Can my employer see it?',
        a: 'Resolvr is not connected to your employer in any way, and nothing is shared unless you export or share it yourself. Work devices and work networks can be monitored, so we recommend using your own phone on your own connection. Stealth mode can make the app look like a calculator.',
    },
    {
        q: 'What if I lose my phone?',
        a: 'Your record stays locked behind your PIN and encrypted on the device. To recover it on a new phone, turn on encrypted backup and keep your recovery phrase somewhere safe. Without a backup or an export, we have no copy we could restore.',
    },
    {
        q: 'Does it work offline?',
        a: 'Yes. Resolvr installs like an app and works without a connection. Logging incidents, adding evidence and viewing your timeline all work offline. Drafting documents with AI and backups need a connection.',
    },
    {
        q: 'Is it free?',
        a: 'Documenting is free: log incidents, store evidence, see patterns and export your data. Paid plans add document drafting, encrypted backup and legal-ready exports.',
    },
    {
        q: "Which countries' laws are covered?",
        a: 'Today Resolvr maps incidents to US federal employment laws such as Title VII, the ADA and the ADEA. Packs for the UK, Nigeria and Canada are planned. This is general information to help you organise your record, not legal advice.',
    },
];

export const problems = [
    {
        icon: 'file-x',
        title: 'No organised record.',
        body: 'Dates blur, messages get deleted and memory is easy to question when it is your word against theirs.',
    },
    {
        icon: 'building-2',
        title: 'HR protects the company first.',
        body: 'HR teams work for the employer. Clear, specific records are what get taken seriously.',
    },
    {
        icon: 'scan-search',
        title: 'Patterns get missed.',
        body: 'One remark is easy to dismiss. Ten, from the same person, getting worse after you reported it, are not.',
    },
];

export const problemStat = {
    text: 'Roughly three in four people who experience harassment at work never tell a supervisor or HR.',
    // EEOC Select Task Force on the Study of Harassment in the Workplace (June 2016) is the usual source. Verify before launch.
    source: '[SOURCE]',
};

export const steps = [
    {
        icon: 'pen-line',
        title: 'Log the incident',
        body: 'Write down what happened while it is fresh. The time is recorded automatically and each entry gets a fingerprint that shows if it is ever changed.',
    },
    {
        icon: 'paperclip',
        title: 'Add your evidence',
        body: 'Attach screenshots, photos, PDFs and voice notes. Files are encrypted on your device and linked to the incident they support.',
    },
    {
        icon: 'chart-spline',
        title: 'Watch the pattern',
        body: 'Resolvr points out what is easy to miss: the same person again, incidents getting more serious, or treatment changing after you reported something.',
    },
    {
        icon: 'file-text',
        title: 'Generate your complaint',
        body: 'Choose the incidents, the tone and the outcome you want. Resolvr drafts a clear, formal letter you can edit and export as a PDF.',
    },
];

export const securityCards = [
    {
        icon: 'lock',
        title: 'Encrypted on your device',
        body: 'Records and files are encrypted with AES-256-GCM in your browser before they are stored.',
    },
    {
        icon: 'fingerprint',
        title: 'PIN and biometric lock',
        body: 'A PIN unlocks the app, with optional Face ID or fingerprint through a passkey. It locks itself when you switch away.',
    },
    {
        icon: 'calculator',
        title: 'Stealth calculator mode',
        body: 'The app can appear as a working calculator. Enter your PIN and press equals to open it.',
    },
    {
        icon: 'link',
        title: 'Tamper-evident timestamps',
        body: 'Each entry is hashed together with the one before it. Edits are added as new versions, so the history shows what changed and when.',
    },
    {
        icon: 'cloud',
        title: 'Optional encrypted backup',
        body: 'Backups are encrypted before they leave your device. Only you hold the recovery phrase.',
    },
    {
        icon: 'eye-off',
        title: 'No ads. No trackers.',
        body: 'No advertising, no third-party trackers and no selling data. Site analytics are cookieless and anonymous.',
    },
];

export const canSee = [
    'Your email address, if you join the waitlist or create an account',
    'That an encrypted backup exists, its size and when it was made',
    'The text you choose to send for an AI draft, while the draft is created',
    'Anonymous, cookieless page-view counts on this website',
];

export const cannotSee = [
    'Your incidents, notes or evidence',
    'Your PIN or the key derived from it',
    'The contents of your encrypted backups',
    'Who you are documenting, or where you work',
];

export interface Plan {
    id: string;
    name: string;
    blurb: string;
    monthly: number;
    yearly: number;
    features: string[];
    cta: string;
    featured?: boolean;
}

/** [PLACEHOLDER] prices. Set PRICES_CONFIRMED to true once they are final. */
export const PRICES_CONFIRMED = false;

export const plans: Plan[] = [
    {
        id: 'free',
        name: 'Free',
        blurb: 'Everything you need to start a private record.',
        monthly: 0,
        yearly: 0,
        features: [
            'Unlimited incidents with locked timestamps',
            'Encrypted evidence vault',
            'Timeline and pattern detection',
            'PIN lock and stealth mode',
            'Export your data any time',
        ],
        cta: 'Start free',
    },
    {
        id: 'plus',
        name: 'Plus',
        blurb: 'Turn your record into clear documents.',
        monthly: 6,
        yearly: 60,
        features: [
            'Everything in Free',
            'AI document studio: HR complaint, follow-ups, witness requests',
            'End-to-end encrypted backup and restore',
            'HR case dossier PDF',
            'Gentle, disguised reminders',
        ],
        cta: 'Choose Plus',
        featured: true,
    },
    {
        id: 'legal',
        name: 'Legal-ready',
        blurb: 'For when you are talking to a lawyer or an agency.',
        monthly: 14,
        yearly: 140,
        features: [
            'Everything in Plus',
            'Legal dossier with hash-chain verification',
            'Secure, expiring share link for your lawyer',
            'Filing deadline tracker',
            'Agency intake summaries',
        ],
        cta: 'Choose Legal-ready',
    },
];

export const founderQuote = {
    // DRAFT wording based on the founder story. Confirm with Ayodapo Ige before launch.
    text: 'A manager made work unbearable, week after week, in ways that were hard to explain afterwards. When I finally spoke up, I had nothing written down. I built Resolvr so no one has to start from nothing.',
    name: 'Ayodapo Ige',
    role: 'Founder, Resolvr',
};

/** "It rarely happens all at once": the moments worth writing down. */
export const moments = [
    {
        icon: 'message-square-warning',
        title: 'The comment in the meeting',
        body: 'Exact words, who was there, the time.',
    },
    {
        icon: 'user-x',
        title: 'Being left out',
        body: 'The email you were not copied on, the meeting you were not invited to.',
    },
    { icon: 'calendar-x', title: 'The sudden change', body: 'A new rota, a worse review, right after you spoke up.' },
    {
        icon: 'messages-square',
        title: 'The talk with HR',
        body: 'What you said, what they promised, what happened next.',
    },
];

export const features = [
    {
        icon: 'notebook-pen',
        title: 'Incident log',
        body: 'Write it down while it is fresh. The time locks and a fingerprint shows if it is ever changed.',
        demo: 'log',
    },
    {
        icon: 'folder-lock',
        title: 'Evidence vault',
        body: 'Screenshots, photos, PDFs and voice notes, encrypted and linked to each incident.',
        demo: 'vault',
    },
    {
        icon: 'chart-spline',
        title: 'Timeline and patterns',
        body: 'See repeats, escalation and changes after you reported something, laid out in order.',
        demo: 'timeline',
    },
    {
        icon: 'file-pen-line',
        title: 'Complaint letters',
        body: 'Pick incidents, tone and outcome. A formal draft appears for you to edit and export.',
        demo: 'letter',
    },
    {
        icon: 'calculator',
        title: 'Stealth mode',
        body: 'The app can look like a working calculator. Your PIN and equals open it.',
        demo: 'stealth',
    },
    {
        icon: 'files',
        title: 'Case dossier',
        body: 'An HR or legal package: summary, pattern analysis, full records and an evidence index.',
        demo: 'dossier',
    },
];
