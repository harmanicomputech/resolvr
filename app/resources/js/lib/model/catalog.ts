/**
 * Fixed vocabularies for incidents, carried over from the prototype so
 * existing exports import cleanly. Values are stored; labels are shown.
 */

export const severities = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];

/** Numeric weight used by scoring and escalation detection. */
export const severityRank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export interface IncidentTypeGroup {
    id: string;
    label: string;
    /** Laws commonly associated with the category (US pack). Display only. */
    lawRefs: string[];
    types: { value: string; label: string }[];
}

export const incidentTypeGroups: IncidentTypeGroup[] = [
    {
        id: 'harassment',
        label: 'Harassment',
        lawRefs: ['Title VII', 'EEOC'],
        types: [
            { value: 'Verbal Harassment', label: 'Verbal Harassment' },
            { value: 'Sexual Harassment', label: 'Sexual Harassment' },
            { value: 'Racial / Ethnic Harassment', label: 'Racial / Ethnic Harassment' },
            { value: 'Religious Harassment', label: 'Religious Harassment' },
            { value: 'National Origin Harassment', label: 'National Origin Harassment' },
            { value: 'Age-Based Harassment', label: 'Age-Based Harassment' },
            { value: 'Disability-Related Harassment', label: 'Disability-Related Harassment' },
            { value: 'Gender Identity / Expression Harassment', label: 'Gender Identity Harassment' },
            { value: 'Pregnancy-Related Harassment', label: 'Pregnancy-Related Harassment' },
            { value: 'Intimidation / Bullying', label: 'Intimidation / Bullying' },
            { value: 'Psychological Manipulation / Gaslighting', label: 'Gaslighting / Manipulation' },
            { value: 'Cyberbullying / Online Harassment', label: 'Cyberbullying / Online' },
        ],
    },
    {
        id: 'discrimination',
        label: 'Discrimination',
        lawRefs: ['Title VII', 'ADA', 'ADEA', 'GINA', 'EPA'],
        types: [
            { value: 'Race / Ethnicity Discrimination', label: 'Race / Ethnicity' },
            { value: 'Sex / Gender Discrimination', label: 'Sex / Gender' },
            { value: 'Sexual Orientation Discrimination', label: 'Sexual Orientation' },
            { value: 'Gender Identity Discrimination', label: 'Gender Identity' },
            { value: 'Age Discrimination (40+)', label: 'Age (40+)' },
            { value: 'Disability Discrimination', label: 'Disability' },
            { value: 'Pregnancy Discrimination', label: 'Pregnancy' },
            { value: 'Religious Discrimination', label: 'Religion' },
            { value: 'National Origin Discrimination', label: 'National Origin' },
            { value: 'Genetic Information Discrimination', label: 'Genetic Information' },
            { value: 'Pay / Compensation Discrimination', label: 'Pay / Compensation' },
            { value: 'Promotion / Advancement Discrimination', label: 'Promotion / Advancement' },
        ],
    },
    {
        id: 'retaliation',
        label: 'Retaliation & Adverse Action',
        lawRefs: ['Title VII', 'ADA', 'FLSA', 'OSHA'],
        types: [
            { value: 'Retaliation for Complaint / Protected Activity', label: 'Retaliation' },
            { value: 'Whistleblower Retaliation', label: 'Whistleblower Retaliation' },
            { value: 'Wrongful Termination / Constructive Dismissal', label: 'Wrongful Termination' },
            { value: 'Constructive Dismissal', label: 'Constructive Dismissal' },
            { value: 'Threat of Termination / Job Loss', label: 'Threat of Termination' },
            { value: 'Demotion / Reduction in Role', label: 'Demotion / Role Reduction' },
            { value: 'Pay Cut / Benefits Reduction', label: 'Pay Cut / Benefits Cut' },
            { value: 'Schedule Manipulation / Hours Reduction', label: 'Schedule Manipulation' },
            { value: 'Exclusion from Meetings / Opportunities', label: 'Exclusion from Opportunities' },
            { value: 'Retaliatory Performance Review', label: 'Retaliatory Performance Review' },
            { value: 'Wrongful Discipline / Written Warning', label: 'Wrongful Discipline' },
            { value: 'False Accusation / Defamation', label: 'False Accusation' },
        ],
    },
    {
        id: 'hostile',
        label: 'Hostile Work Environment',
        lawRefs: ['Title VII', 'EEOC'],
        types: [
            { value: 'Hostile Work Environment', label: 'Hostile Work Environment' },
            { value: 'Offensive Language / Slurs', label: 'Offensive Language / Slurs' },
            { value: 'Unwanted Physical Contact', label: 'Unwanted Physical Contact' },
            { value: 'Display of Offensive Materials', label: 'Offensive Materials Displayed' },
            { value: 'Deliberate Exclusion / Ostracism', label: 'Deliberate Exclusion' },
        ],
    },
    {
        id: 'policy',
        label: 'Policy & Statutory Violations',
        lawRefs: ['FMLA', 'ADA', 'OSHA', 'FLSA'],
        types: [
            { value: 'Breach of Employment Contract', label: 'Breach of Contract' },
            { value: 'Violation of Company Policy / Handbook', label: 'Company Policy Violation' },
            { value: 'Failure to Accommodate Disability', label: 'Failure to Accommodate (Disability)' },
            { value: 'Failure to Accommodate Religion', label: 'Failure to Accommodate (Religion)' },
            { value: 'FMLA / Medical Leave Violation', label: 'FMLA / Medical Leave' },
            { value: 'Maternity / Paternity Leave Violation', label: 'Maternity / Paternity Leave' },
            { value: 'Wage / Hour Violation', label: 'Wage / Hour Violation' },
            { value: 'Unsafe Working Conditions', label: 'Unsafe Conditions' },
            { value: 'Privacy Violation / Unauthorized Monitoring', label: 'Privacy / Unauthorized Monitoring' },
            { value: 'Reference / Background Check Abuse', label: 'Reference / Background Abuse' },
        ],
    },
    {
        id: 'other',
        label: 'Other',
        lawRefs: [],
        types: [{ value: 'Other', label: 'Other' }],
    },
];

export const allIncidentTypes: string[] = incidentTypeGroups.flatMap((g) => g.types.map((t) => t.value));

export const frequencies = [
    'First time — isolated incident',
    '2–4 times — starting to be a pattern',
    '5–10 times — recurring pattern',
    'More than 10 times — ongoing / persistent',
    'Daily or near-daily',
] as const;

export const corroborationOptions = [
    'No — only me',
    'Yes — I know of others who experienced similar treatment',
    "Possibly — I'm not sure",
] as const;

export const reportedOptions = ['yes', 'no', 'informal'] as const;
export type Reported = (typeof reportedOptions)[number];

export const whyNotReportedOptions = [
    'Fear of retaliation',
    "Didn't believe it would be taken seriously",
    'Unsure if it was serious enough',
    'Previous complaints were ignored',
    'The person to report to was the perpetrator',
    'Afraid of losing my job',
    'Other reason',
] as const;

export const emotionalImpacts = [
    'Anxious',
    'Humiliated',
    'Intimidated',
    'Angry',
    'Fearful',
    'Depressed',
    'Betrayed',
    'Unsafe',
    'Isolated',
    'Powerless',
];
export const physicalImpacts = [
    'Sleep problems',
    'Headaches',
    'Anxiety / panic attacks',
    'Loss of appetite',
    'Fatigue',
    'Physical injury',
];
export const professionalImpacts = [
    'Unable to concentrate',
    'Avoiding work / calling in sick',
    'Considering leaving',
    'Performance affected',
    'Missed promotion / opportunity',
    'Unfairly disciplined after',
];
export const evidenceCapturedOptions = [
    'Emails / messages saved',
    'Screenshot taken',
    'Written it down immediately',
    'Told someone right after',
    'Meeting was recorded',
    'Seen by others',
];

export const jurisdictions = ['us', 'uk', 'ng', 'ca'] as const;
export type Jurisdiction = (typeof jurisdictions)[number];
