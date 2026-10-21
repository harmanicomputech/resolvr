import { Hammer } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

/** Placeholder for a screen that is still being built. */
export function ComingSoon({ title }: { title: string }) {
    return (
        <EmptyState icon={<Hammer className="size-6" />} title={title} className="mt-10">
            This part of Resolvr is on its way.
        </EmptyState>
    );
}
