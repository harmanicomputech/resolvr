import { Eraser, Save, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Black out names or other details by drawing boxes. The result is saved as
 * a new file; the original is never changed, so its fingerprint still holds.
 */
export function Redactor({
    src,
    open,
    onOpenChange,
    onSave,
}: {
    src: string | null;
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onSave: (blob: Blob) => Promise<void>;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const image = useRef<HTMLImageElement | null>(null);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [draft, setDraft] = useState<Box | null>(null);
    const [saving, setSaving] = useState(false);

    const [ready, setReady] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !src) return;
        const img = new Image();
        img.onload = () => {
            image.current = img;
            setReady(src);
        };
        img.src = src;
    }, [open, src]);

    // Start fresh each time it opens.
    const [seen, setSeen] = useState(open);
    if (seen !== open) {
        setSeen(open);
        if (open) setBoxes([]);
    }

    useEffect(() => {
        const c = canvas.current;
        const img = image.current;
        if (!c || !img || !ready) return;
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = 'black';
        for (const box of [...boxes, ...(draft ? [draft] : [])]) ctx.fillRect(box.x, box.y, box.w, box.h);
    }, [boxes, draft, ready]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const sx = e.currentTarget.width / rect.width;
        const sy = e.currentTarget.height / rect.height;
        return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    };
    const start = useRef<{ x: number; y: number } | null>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                title="Redact a copy"
                description="Draw boxes over anything you want hidden. The original stays exactly as it was."
                className="max-h-[94dvh] w-[min(64rem,calc(100vw-1.5rem))] max-w-none overflow-y-auto"
            >
                <canvas
                    ref={canvas}
                    className="mx-auto max-h-[62dvh] w-auto max-w-full cursor-crosshair touch-none rounded-(--radius-md) border border-hairline"
                    aria-label="Image to redact. Drag to draw a black box."
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        start.current = point(e);
                    }}
                    onPointerMove={(e) => {
                        if (!start.current) return;
                        const p = point(e);
                        setDraft({
                            x: Math.min(start.current.x, p.x),
                            y: Math.min(start.current.y, p.y),
                            w: Math.abs(p.x - start.current.x),
                            h: Math.abs(p.y - start.current.y),
                        });
                    }}
                    onPointerUp={() => {
                        if (draft && draft.w > 3 && draft.h > 3) setBoxes((b) => [...b, draft]);
                        setDraft(null);
                        start.current = null;
                    }}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setBoxes((b) => b.slice(0, -1))} disabled={!boxes.length}>
                        <Undo2 aria-hidden /> Undo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBoxes([])} disabled={!boxes.length}>
                        <Eraser aria-hidden /> Clear
                    </Button>
                    <Button
                        size="sm"
                        variant="primary"
                        className="ml-auto"
                        disabled={!boxes.length || saving}
                        onClick={() => {
                            setSaving(true);
                            canvas.current?.toBlob(async (blob) => {
                                if (blob) await onSave(blob);
                                setSaving(false);
                                onOpenChange(false);
                            }, 'image/png');
                        }}
                    >
                        <Save aria-hidden /> {saving ? 'Saving…' : 'Save redacted copy'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
