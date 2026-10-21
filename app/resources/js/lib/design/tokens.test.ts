import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrast, mix } from './contrast';

// Parses the raw hex tokens from tokens.css and checks every text pair the design system uses.
const css = readFileSync(resolve(__dirname, '../../../css/tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const [, selectors, body] of css.matchAll(/\n([^{}\n@/][^{}]*?)\s*\{([\s\S]*?)\n\}/g)) {
        if (!selectors!.split(',').some((s) => s.trim() === selector)) continue;
        for (const [, name, value] of body!.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) {
            vars[name!] = value!.toLowerCase();
        }
    }
    return vars;
}

const light = block(':root');
const dark = { ...light, ...block('.dark') };

const AA = 4.5;

const pairs: [text: string, background: string][] = [
    ['fg', 'bg'],
    ['fg', 'surface'],
    ['fg', 'raised'],
    ['fg', 'overlay'],
    ['fg-muted', 'bg'],
    ['fg-muted', 'surface'],
    ['fg-muted', 'raised'],
    ['fg-muted', 'overlay'],
    ['fg-subtle', 'bg'],
    ['fg-subtle', 'surface'],
    ['fg-inverse', 'inverse'],
    ['accent-text', 'bg'],
    ['accent-text', 'surface'],
    ['accent-fg', 'accent'],
    ['accent-fg', 'accent-strong'],
    ['danger-fg', 'danger'],
    ['danger-text', 'bg'],
    ['danger-text', 'surface'],
    ['success-text', 'surface'],
    ['warning-text', 'surface'],
    ['info-text', 'surface'],
    ['sev-low-text', 'surface'],
    ['sev-medium-text', 'surface'],
    ['sev-high-text', 'surface'],
    ['sev-critical-text', 'surface'],
    ['sev-low-text', 'bg'],
    ['sev-medium-text', 'bg'],
    ['sev-high-text', 'bg'],
    ['sev-critical-text', 'bg'],
];

describe.each([
    ['light', light],
    ['dark', dark],
] as const)('%s theme contrast', (_theme, tokens) => {
    it('found the tokens', () => expect(Object.keys(tokens).length).toBeGreaterThan(30));

    it.each(pairs)('%s on %s passes AA', (text, background) => {
        const fg = tokens[text];
        const bg = tokens[background];
        expect(fg, `missing --${text}`).toBeDefined();
        expect(bg, `missing --${background}`).toBeDefined();
        expect(contrast(fg!, bg!)).toBeGreaterThanOrEqual(AA);
    });

    it.each(['low', 'medium', 'high', 'critical'])('%s severity pill text passes AA on its 10%% tint', (level) => {
        const tint = mix(tokens[`sev-${level}`]!, tokens.surface!, 0.1);
        expect(contrast(tokens[`sev-${level}-text`]!, tint)).toBeGreaterThanOrEqual(AA);
    });
});

describe('contrast()', () => {
    it('matches the WCAG reference values', () => {
        expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    });
});
