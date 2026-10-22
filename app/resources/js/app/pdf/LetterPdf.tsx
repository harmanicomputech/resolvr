import { Document, Page, Text, View } from '@react-pdf/renderer';

import type { DraftDocument } from '@/lib/model/schema';

import { EXPORT_FOOTER, type Block } from '../lib/doc-export';
import { Footer } from './IncidentPdf';
import { makeStyles, pdfColors } from './theme';

/** A drafted letter or summary as a clean, plain PDF. */
export function LetterPdf({ doc, blocks }: { doc: DraftDocument; blocks: Block[] }) {
    const s = makeStyles(pdfColors.mono);
    return (
        <Document title={doc.title} author="Resolvr" creator="Resolvr" producer="Resolvr">
            <Page size="A4" style={[s.page, { fontSize: 11, lineHeight: 1.5 }]}>
                {blocks.map((b, i) =>
                    b.kind === 'h' ? (
                        <Text key={i} style={s.h3}>
                            {b.text}
                        </Text>
                    ) : b.kind === 'li' ? (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 8 }}>
                            <Text style={{ width: 12 }}>•</Text>
                            <Text style={{ flex: 1 }}>{b.text}</Text>
                        </View>
                    ) : (
                        <Text key={i} style={{ marginBottom: 10 }}>
                            {b.text}
                        </Text>
                    ),
                )}
                <Footer s={s} left={EXPORT_FOOTER} />
            </Page>
        </Document>
    );
}
