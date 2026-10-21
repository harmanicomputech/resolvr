import { Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Record a voice note with the microphone. The audio goes straight into the encrypted vault. */
export function Recorder({ onRecorded, autoStart }: { onRecorded: (file: File) => void; autoStart?: boolean }) {
    const [state, setState] = useState<'idle' | 'recording' | 'denied' | 'unsupported'>(() =>
        typeof MediaRecorder === 'undefined' ? 'unsupported' : 'idle',
    );
    const [seconds, setSeconds] = useState(0);
    const recorder = useRef<MediaRecorder | null>(null);
    const started = useRef(false);

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            const chunks: Blob[] = [];
            rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
            rec.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const type = rec.mimeType || 'audio/webm';
                const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
                const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
                onRecorded(new File(chunks, `voice-note-${stamp}.${ext}`, { type }));
                setState('idle');
            };
            rec.start(1000);
            recorder.current = rec;
            setSeconds(0);
            setState('recording');
        } catch {
            setState('denied');
        }
    };

    useEffect(() => {
        if (state !== 'recording') return;
        const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => window.clearInterval(timer);
    }, [state]);

    useEffect(() => {
        if (autoStart && !started.current && state === 'idle') {
            started.current = true;
            void start();
        }
        return () => {
            if (recorder.current?.state === 'recording') recorder.current.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (state === 'unsupported')
        return <p className="text-sm text-fg-muted">Voice notes are not supported in this browser.</p>;
    return (
        <div className="flex items-center gap-3">
            {state === 'recording' ? (
                <>
                    <Button variant="danger" onClick={() => recorder.current?.stop()}>
                        <Square aria-hidden /> Stop
                    </Button>
                    <span className="flex items-center gap-2 text-sm text-fg" role="timer" aria-live="off">
                        <span
                            className="size-2 animate-pulse rounded-full bg-danger motion-reduce:animate-none"
                            aria-hidden
                        />
                        Recording {mmss(seconds)}
                    </span>
                </>
            ) : (
                <Button onClick={() => void start()}>
                    <Mic aria-hidden /> Record a voice note
                </Button>
            )}
            {state === 'denied' && (
                <p className="text-sm text-fg-muted">
                    Microphone access was blocked. You can allow it in your browser settings.
                </p>
            )}
        </div>
    );
}
