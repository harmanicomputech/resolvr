import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

interface SheetContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
    /** Bottom on phones, right on larger screens is the usual pairing. */
    side?: 'bottom' | 'right';
    title: ReactNode;
    description?: ReactNode;
}

const placement = {
    bottom: 'inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
    right: 'inset-y-0 right-0 overflow-y-auto data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
};

export function SheetContent({
    side = 'bottom',
    title,
    description,
    className,
    children,
    ...props
}: SheetContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="scrim z-40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
                className={cn(
                    'sheet fixed z-50 data-[state=closed]:animate-out data-[state=open]:animate-in',
                    'data-[state=closed]:duration-(--dur-fast) data-[state=open]:duration-(--dur-base)',
                    placement[side],
                    className,
                )}
                data-side={side}
                {...props}
            >
                <DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>
                {description ? (
                    <DialogPrimitive.Description className="dialog-description">
                        {description}
                    </DialogPrimitive.Description>
                ) : (
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                )}
                <div className="mt-5">{children}</div>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}
