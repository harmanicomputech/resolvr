import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString, PDFHexString, rgb, StandardFonts } from 'pdf-lib';

/*
 * Finishing touches applied after react-pdf renders. Its `render` callbacks
 * (normally used for "Page 1 of 5" and contents page numbers) produce no
 * text in this version, so page numbers are stamped here and section pages
 * are read from the PDF's own named destinations (the targets of internal
 * links, which react-pdf writes for every element with an `id`).
 */

/** Map each named destination (element id) to its 1-based page number. */
export async function destinationPages(bytes: ArrayBuffer | Uint8Array, ids: readonly string[]): Promise<Record<string, number>> {
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    const pageOf = (ref: unknown) => pages.findIndex((p) => ref instanceof PDFRef && p.ref === ref) + 1;
    const found: Record<string, number> = {};
    const visit = (node: PDFDict | undefined) => {
        if (!node) return;
        const names = node.lookupMaybe(PDFName.of('Names'), PDFArray);
        if (names) {
            for (let i = 0; i + 1 < names.size(); i += 2) {
                const key = names.lookup(i);
                const name = key instanceof PDFString || key instanceof PDFHexString ? key.decodeText() : '';
                if (!ids.includes(name)) continue;
                let dest = names.lookup(i + 1);
                if (dest instanceof PDFDict) dest = dest.lookup(PDFName.of('D'));
                if (dest instanceof PDFArray) {
                    const page = pageOf(dest.get(0));
                    if (page > 0) found[name] = page;
                }
            }
        }
        const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray);
        if (kids) for (let i = 0; i < kids.size(); i++) visit(kids.lookupMaybe(i, PDFDict));
    };
    const tree = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)?.lookupMaybe(PDFName.of('Dests'), PDFDict);
    visit(tree);
    return found;
}

/** Stamp "Page n of N" at the bottom right of every page (optionally skipping the cover). */
export async function stampPageNumbers(bytes: ArrayBuffer | Uint8Array, options: { skipFirst?: boolean; grey?: number } = {}): Promise<Uint8Array> {
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const shade = options.grey ?? 0.47;
    pages.forEach((page, i) => {
        if (options.skipFirst && i === 0) return;
        const text = `Page ${i + 1} of ${pages.length}`;
        const size = 7.5;
        const { width } = page.getSize();
        page.drawText(text, { x: width - 52 - font.widthOfTextAtSize(text, size), y: 28 - size + 2, size, font, color: rgb(shade, shade, shade) });
    });
    return doc.save();
}
