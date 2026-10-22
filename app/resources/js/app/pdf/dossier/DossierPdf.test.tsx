// @vitest-environment node
import { Font, renderToBuffer } from '@react-pdf/renderer';
import { expect, test, vi } from 'vitest';
import { freshVault } from '@/test/fixtures';
import { importPrototype } from '@/lib/migration/prototype';
import { prototypeBackup } from '../../../../../../e2e/app/helpers';
import { destinationPages, stampPageNumbers } from '../postprocess';
import { DossierPdf, SECTIONS } from './DossierPdf';

vi.mock('qrcode', () => ({
    default: {
        toDataURL: async () =>
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
}));

/** Regression: multi-incident case files once crashed the PDF engine (page breaks, WOFF2 subsetting). */
test('renders both packages from a realistic record', async () => {
    Font.register({
        family: 'Poppins',
        src: `${process.cwd()}/resources/fonts/poppins-latin-600-normal.woff`,
        fontWeight: 600,
    });
    Font.register({ family: 'Geist Mono', src: `${process.cwd()}/resources/fonts/geist-mono-latin-400-normal.woff` });
    const { repos } = await freshVault();
    await importPrototype(prototypeBackup(), repos);
    const { gatherDossier } = await import('./data');
    const data = await gatherDossier(
        repos,
        { pkg: 'legal', includeImpact: true, includeThumbnails: false },
        'https://x',
    );
    for (const pkg of ['hr', 'legal'] as const) {
        const doc = (pages: Record<string, number>) => (
            <DossierPdf data={{ ...data, options: { ...data.options, pkg } }} pages={pages} />
        );
        const pages = await destinationPages(
            await renderToBuffer(doc({})),
            SECTIONS.map(([id]) => id),
        );
        const buf = Buffer.from(await stampPageNumbers(await renderToBuffer(doc(pages)), { skipFirst: true }));
        expect(buf.subarray(0, 4).toString()).toBe('%PDF');
        if (process.env.DOSSIER_OUT)
            (await import('node:fs')).writeFileSync(`${process.env.DOSSIER_OUT}-${pkg}.pdf`, buf);
        expect(pages.summary).toBeGreaterThan(2);
        expect(pages.verification).toBeGreaterThan(pages.records!);
    }
}, 60000);
