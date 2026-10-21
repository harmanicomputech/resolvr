import { useEffect, useRef, useState } from 'react';

import type { EvidenceFile } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { useFileUrl } from '../hooks/use-file-url';

/**
 * Blur-up image: the tiny encrypted preview shows at once; the full image is
 * decrypted only when the tile scrolls near the screen, then fades in.
 */
export function BlurImage({ file, className, alt = '' }: { file: EvidenceFile; className?: string; alt?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const url = useFileUrl(visible ? file.id : undefined);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && (setVisible(true), io.disconnect()), {
            rootMargin: '300px',
        });
        io.observe(node);
        return () => io.disconnect();
    }, []);

    const ratio = file.width && file.height ? file.height / file.width : 0.75;
    return (
        <div
            ref={ref}
            className={cn('relative overflow-hidden bg-raised', className)}
            style={{ aspectRatio: `${1} / ${ratio}` }}
        >
            {file.thumb && (
                <img
                    src={file.thumb}
                    alt=""
                    aria-hidden
                    className={cn(
                        'absolute inset-0 size-full scale-110 object-cover blur-md transition-opacity duration-(--dur-slow)',
                        loaded && 'opacity-0',
                    )}
                />
            )}
            {url && (
                <img
                    src={url}
                    alt={alt}
                    className={cn(
                        'absolute inset-0 size-full object-cover transition-opacity duration-(--dur-slow)',
                        loaded ? 'opacity-100' : 'opacity-0',
                    )}
                    onLoad={() => setLoaded(true)}
                />
            )}
        </div>
    );
}
