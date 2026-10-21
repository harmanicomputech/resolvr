import { FileAudio, FileText, File as FileIcon, X } from 'lucide-react';

import type { EvidenceFile } from '@/lib/model/schema';

import { useFileUrl } from '../hooks/use-file-url';

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileThumb({ file, className = 'size-12' }: { file: EvidenceFile; className?: string }) {
    const url = useFileUrl(file.mimeType.startsWith('image/') ? file.id : undefined);
    if (url) return <img src={url} alt="" className={`${className} shrink-0 rounded-(--radius-md) object-cover`} />;
    const Icon = file.mimeType.startsWith('audio/')
        ? FileAudio
        : file.mimeType === 'application/pdf'
          ? FileText
          : FileIcon;
    return (
        <span className={`${className} icon-badge shrink-0`} data-tone="neutral" aria-hidden>
            <Icon className="size-5" />
        </span>
    );
}

function AudioPlayer({ file }: { file: EvidenceFile }) {
    const url = useFileUrl(file.id);
    return url ? <audio src={url} controls className="mt-1 h-8 w-full max-w-60" /> : null;
}

/** Files attached to an incident or draft. */
export function AttachmentList({ files, onRemove }: { files: EvidenceFile[]; onRemove?: (id: string) => void }) {
    if (!files.length) return null;
    return (
        <ul className="space-y-2">
            {files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 rounded-(--radius-md) border border-hairline p-2">
                    <FileThumb file={file} />
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate text-fg">{file.name}</p>
                        <p className="text-xs text-fg-subtle">
                            {formatBytes(file.size)} · <span className="mono">{file.sha256.slice(0, 12)}</span>
                        </p>
                        {file.mimeType.startsWith('audio/') && <AudioPlayer file={file} />}
                    </div>
                    {onRemove && (
                        <button
                            type="button"
                            className="btn"
                            data-variant="ghost"
                            data-size="icon"
                            onClick={() => onRemove(file.id)}
                            aria-label={`Remove ${file.name}`}
                        >
                            <X aria-hidden />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
