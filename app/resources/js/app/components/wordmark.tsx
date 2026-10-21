import { cn } from '@/lib/utils';

export function Wordmark({ className }: { className?: string }) {
    return <span className={cn('font-display font-semibold tracking-tight text-fg', className)}>Resolvr</span>;
}
