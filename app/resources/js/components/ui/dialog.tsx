import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
    title: ReactNode;
    description?: ReactNode;
}

export function DialogContent({ title, description, className, children, ...props }: DialogContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="scrim z-40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
                className={cn(
                    'dialog fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]',
                    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]',
                    className,
                )}
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
                <DialogPrimitive.Close className="btn absolute top-4 right-4" data-variant="ghost" data-size="icon">
                    <X aria-hidden />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}
