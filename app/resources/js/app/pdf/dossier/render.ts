import { createElement } from 'react';

import type { DossierData } from './data';
import type { SectionId } from './DossierPdf';

/**
 * Render twice so the contents page can show real page numbers: the first
 * pass is read for where each section landed, the second prints them. Page
 * numbers are then stamped on every page after the cover.
 */
export async function renderDossier(data: DossierData): Promise<Blob> {
    const [{ pdf }, { registerFonts }, { DossierPdf, SECTIONS }, { destinationPages, stampPageNumbers }] =
        await Promise.all([
            import('@react-pdf/renderer'),
            import('../theme'),
            import('./DossierPdf'),
            import('../postprocess'),
        ]);
    registerFonts();
    const build = (pages: Partial<Record<SectionId, number>>) =>
        pdf(createElement(DossierPdf, { data, pages }) as Parameters<typeof pdf>[0]).toBlob();
    const first = await (await build({})).arrayBuffer();
    const pages = await destinationPages(
        first,
        SECTIONS.map(([id]) => id),
    );
    const final = await (await build(pages)).arrayBuffer();
    return new Blob([(await stampPageNumbers(final, { skipFirst: true })) as Uint8Array<ArrayBuffer>], {
        type: 'application/pdf',
    });
}
