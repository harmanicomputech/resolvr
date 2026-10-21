/**
 * On-device OCR with Tesseract.js, so screenshots become searchable without
 * sending them anywhere. The worker, engine and English data are served
 * from /ocr (copied there at build time by build-tools/copy-ocr.mjs).
 */
export async function readText(image: Blob, onProgress?: (fraction: number) => void): Promise<string> {
    const { createWorker, OEM } = await import('tesseract.js');
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        gzip: true,
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: (m: { status: string; progress: number }) =>
            m.status === 'recognizing text' && onProgress?.(m.progress),
    });
    try {
        const { data } = await worker.recognize(image);
        return data.text.replace(/\s+\n/g, '\n').trim();
    } finally {
        await worker.terminate();
    }
}
