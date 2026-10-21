import { Font, StyleSheet } from '@react-pdf/renderer';

import geistMono from '../../../fonts/geist-mono-latin-400-normal.woff2?url';
import poppins600 from '../../../fonts/poppins-latin-600-normal.woff2?url';

/**
 * PDF palette. PDFs cannot read CSS variables, so these mirror the light
 * theme in resources/css/tokens.css (accent, fg, fg-muted, hairline,
 * severity text colours). The Legal package uses `mono` instead: black on
 * white only, so it photocopies and faxes cleanly.
 */
export const pdfColors = {
    color: {
        ink: '#1c1917',
        muted: '#57534e',
        subtle: '#78716c',
        hairline: '#e7e3da',
        accent: '#0f766e',
        accentTint: '#e6f4f1',
        sev: { low: '#047857', medium: '#92400e', high: '#9a3412', critical: '#be123c' },
    },
    mono: {
        ink: '#000000',
        muted: '#333333',
        subtle: '#555555',
        hairline: '#bbbbbb',
        accent: '#000000',
        accentTint: '#f2f2f2',
        sev: { low: '#000000', medium: '#000000', high: '#000000', critical: '#000000' },
    },
} as const;
export type PdfPalette = (typeof pdfColors)[keyof typeof pdfColors];

let registered = false;
/** Poppins for headings, Geist Mono for IDs and hashes; body text uses the built-in Helvetica. */
export function registerFonts(): void {
    if (registered) return;
    registered = true;
    Font.register({ family: 'Poppins', src: poppins600, fontWeight: 600 });
    Font.register({ family: 'Geist Mono', src: geistMono });
    Font.registerHyphenationCallback((word) => [word]);
}

export const makeStyles = (c: PdfPalette) =>
    StyleSheet.create({
        page: {
            paddingTop: 48,
            paddingBottom: 64,
            paddingHorizontal: 52,
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: c.ink,
            lineHeight: 1.45,
        },
        h1: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 22, color: c.ink, marginBottom: 6 },
        h2: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, color: c.ink, marginTop: 18, marginBottom: 6 },
        h3: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: c.ink, marginTop: 8, marginBottom: 2 },
        muted: { color: c.muted },
        subtle: { color: c.subtle, fontSize: 8.5 },
        mono: { fontFamily: 'Geist Mono', fontSize: 8.5 },
        label: {
            fontFamily: 'Helvetica-Bold',
            fontSize: 7.5,
            letterSpacing: 1,
            color: c.subtle,
            textTransform: 'uppercase',
            marginBottom: 2,
        },
        row: { flexDirection: 'row', gap: 16 },
        rule: { borderBottomWidth: 1, borderBottomColor: c.hairline, marginVertical: 10 },
        chip: {
            borderWidth: 1,
            borderColor: c.hairline,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            fontSize: 8.5,
            marginRight: 4,
            marginBottom: 4,
        },
        footer: {
            position: 'absolute',
            bottom: 28,
            left: 52,
            right: 52,
            flexDirection: 'row',
            justifyContent: 'space-between',
            fontSize: 7.5,
            color: c.subtle,
            borderTopWidth: 1,
            borderTopColor: c.hairline,
            paddingTop: 6,
        },
        table: { borderTopWidth: 1, borderTopColor: c.hairline },
        tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.hairline, paddingVertical: 4 },
    });
export type PdfStyles = ReturnType<typeof makeStyles>;

export const NOT_LEGAL_ADVICE =
    'Prepared with Resolvr from the author’s own record. Resolvr is not a law firm and this is not legal advice.';
