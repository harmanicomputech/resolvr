/* global console */
// Copies Tesseract's worker, engine and English data into public/ocr so OCR
// runs from our own origin (the CSP allows no CDNs). Runs before each build.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/ocr');
mkdirSync(out, { recursive: true });
const files = [
    ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
    ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
    ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
    ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
    ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];
for (const [from, to] of files) copyFileSync(join(root, from), join(out, to));
console.log(`OCR files copied to public/ocr (${files.length})`);
