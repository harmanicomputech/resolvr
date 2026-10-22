import type { DraftDocument } from '@/lib/model/schema';

export type Block = { kind: 'p' | 'h' | 'li'; text: string; bold?: boolean };

/** Read the editor's simple HTML into blocks for PDF and Word export. */
export function htmlToBlocks(html: string): Block[] {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const blocks: Block[] = [];
    const text = (el: Element) => (el as HTMLElement).innerText ?? el.textContent ?? '';
    doc.body.firstElementChild?.querySelectorAll(':scope > *').forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'ul' || tag === 'ol')
            el.querySelectorAll('li').forEach((li) => blocks.push({ kind: 'li', text: (li.textContent ?? '').trim() }));
        else if (/^h\d$/.test(tag)) blocks.push({ kind: 'h', text: (el.textContent ?? '').trim() });
        else {
            const content = (el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') ?? '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            if (content.trim() || text(el)) blocks.push({ kind: 'p', text: content.trim() });
        }
    });
    return blocks;
}

export function htmlToText(html: string): string {
    return htmlToBlocks(html)
        .map((b) => (b.kind === 'li' ? `• ${b.text}` : b.text))
        .join('\n\n');
}

export const EXPORT_FOOTER = 'Prepared with Resolvr. Not legal advice.';

/** A Word document made on the device with the docx library (nothing is uploaded). */
export async function toDocx(doc: DraftDocument): Promise<Blob> {
    const { Document, Footer, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
    const children = htmlToBlocks(doc.html).map((b) =>
        b.kind === 'h'
            ? new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2 })
            : new Paragraph({
                  bullet: b.kind === 'li' ? { level: 0 } : undefined,
                  spacing: { after: 200 },
                  children: b.text.split('\n').map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0 })),
              }),
    );
    const file = new Document({
        creator: 'Resolvr',
        title: doc.title,
        styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
        sections: [
            {
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: EXPORT_FOOTER, size: 16, color: '777777' })],
                            }),
                        ],
                    }),
                },
                children,
            },
        ],
    });
    return Packer.toBlob(file);
}
