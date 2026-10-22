import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Preview a PDF as page images with a gentle page-turn. Rendering uses
 * pdf.js on this device; nothing is uploaded.
 */
export function PdfPreview({ blob }: { blob: Blob }) {
    const reduce = useReducedMotion();
    const [pages, setPages] = useState<string[]>([]);
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
                pdfjs.GlobalWorkerOptions.workerSrc = worker;
                const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
                const doc = await task.promise;
                const urls: string[] = [];
                for (let n = 1; n <= doc.numPages && !cancelled; n++) {
                    const page = await doc.getPage(n);
                    const viewport = page.getViewport({ scale: 1.4 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
                    urls.push(canvas.toDataURL('image/jpeg', 0.85));
                    if (!cancelled) setPages([...urls]);
                }
                await task.destroy();
            } catch (error) {
                console.warn('Preview unavailable', error);
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [blob]);

    const go = (delta: number) => {
        const next = Math.min(pages.length - 1, Math.max(0, index + delta));
        if (next === index) return;
        setDirection(delta);
        setIndex(next);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (failed && !pages.length)
        return (
            <p className="mx-auto max-w-md rounded-(--radius-md) bg-surface p-6 text-center text-sm text-fg-muted ring-1 ring-hairline">
                The preview could not be shown on this device. You can still download the file and open it.
            </p>
        );
    if (!pages.length)
        return <Skeleton className="mx-auto aspect-[1/1.414] w-full max-w-md" aria-label="Preparing preview" />;
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-full max-w-md [perspective:1600px]">
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <motion.img
                        key={index}
                        src={pages[index]}
                        alt={`Page ${index + 1} of ${pages.length}`}
                        className="w-full rounded-(--radius-md) bg-surface shadow-(--shadow-overlay) ring-1 ring-hairline"
                        style={{ transformOrigin: direction > 0 ? 'left center' : 'right center' }}
                        initial={reduce ? { opacity: 0 } : { rotateY: direction > 0 ? 70 : -70, opacity: 0.4 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { rotateY: direction > 0 ? -70 : 70, opacity: 0.4 }}
                        transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.76, 0, 0.24, 1] }}
                        drag="x"
                        dragSnapToOrigin
                        onDragEnd={(_, info) => (info.offset.x < -60 ? go(1) : info.offset.x > 60 ? go(-1) : undefined)}
                    />
                </AnimatePresence>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => go(-1)}
                    disabled={index === 0}
                    aria-label="Previous page"
                >
                    <ChevronLeft aria-hidden />
                </Button>
                <span className="text-sm text-fg-muted tabular-nums" aria-live="polite">
                    Page {index + 1} of {pages.length}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => go(1)}
                    disabled={index >= pages.length - 1}
                    aria-label="Next page"
                >
                    <ChevronRight aria-hidden />
                </Button>
            </div>
        </div>
    );
}
