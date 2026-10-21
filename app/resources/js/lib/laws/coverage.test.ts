import { describe, expect, it } from 'vitest';

import { allIncidentTypes } from '@/lib/model/catalog';

import { legalCoverage } from './coverage';

const active = (types: string[]) =>
    legalCoverage(types)
        .statutes.filter((s) => s.active)
        .map((s) => s.statute.short);

describe('legalCoverage (US pack)', () => {
    it('maps types to statutes like the prototype', () => {
        expect(active(['Verbal Harassment'])).toEqual(['Title VII']);
        expect(active(['Age Discrimination (40+)'])).toEqual(['Title VII', 'ADEA']);
        expect(active(['Failure to Accommodate Disability'])).toEqual(['ADA']);
        expect(active(['FMLA / Medical Leave Violation'])).toEqual(['FMLA']);
        expect(active(['Wage / Hour Violation'])).toEqual(['FLSA']);
        expect(active(['Unsafe Working Conditions'])).toEqual(['OSHA']);
        expect(active([])).toEqual([]);
    });

    it('fixes prototype gaps: retaliation maps to Title VII; a pay cut is not FLSA; "wage" is not "age"', () => {
        expect(active(['Wage / Hour Violation'])).not.toContain('ADEA');
        expect(active(['Retaliation for Complaint / Protected Activity'])).toContain('Title VII');
        expect(active(['Pay Cut / Benefits Reduction'])).not.toContain('FLSA');
    });

    it('carries a not-legal-advice disclaimer and a version', () => {
        const coverage = legalCoverage(allIncidentTypes);
        expect(coverage.pack.disclaimer).toMatch(/not legal advice/i);
        expect(coverage.pack.version).toMatch(/^\d{4}\.\d+$/);
    });
});
