import type { ReactElement } from 'react';

/**
 * Render a react-pdf document to a Blob in the browser and save it. The PDF
 * is made entirely on this device; nothing is uploaded.
 */
export async function downloadPdf(build: () => Promise<ReactElement> | ReactElement, filename: string): Promise<void> {
    const [{ pdf }, { registerFonts }] = await Promise.all([import('@react-pdf/renderer'), import('./theme')]);
    registerFonts();
    const blob = await pdf((await build()) as Parameters<typeof pdf>[0]).toBlob();
    saveBlob(blob, filename);
}

export function saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.className = 'sr-only';
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const safeFilename = (text: string) =>
    text
        .replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60) || 'resolvr';
