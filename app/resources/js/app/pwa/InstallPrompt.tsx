import { Download, Share, SquarePlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { useInstall } from './use-install';

/** Offered only once the person has logged at least one incident. */
export function InstallPrompt({ eligible }: { eligible: boolean }) {
    const { canPrompt, showIosHelp, install, dismiss } = useInstall();
    if (!eligible) return null;

    if (canPrompt) {
        return (
            <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 md:right-6 md:bottom-6 md:left-auto md:w-96">
                <div className="glass flex items-center gap-3 p-4">
                    <span className="icon-badge" aria-hidden>
                        <Download className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">Install Resolvr</p>
                        <p className="text-fg-muted">Opens faster and works offline.</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => void install()}>
                        Install
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Not now" onClick={dismiss}>
                        <X aria-hidden />
                    </Button>
                </div>
            </div>
        );
    }

    if (showIosHelp) {
        return (
            <Sheet defaultOpen onOpenChange={(open) => !open && dismiss()}>
                <SheetContent
                    side="bottom"
                    title="Add Resolvr to your Home Screen"
                    description="It opens like an app and works offline."
                >
                    <ol className="space-y-4 text-sm">
                        <li className="flex items-center gap-3">
                            <span className="icon-badge" aria-hidden>
                                <Share className="size-4" />
                            </span>
                            Tap the Share button in Safari's toolbar.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="icon-badge" aria-hidden>
                                <SquarePlus className="size-4" />
                            </span>
                            Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
                        </li>
                    </ol>
                    <Button className="mt-6 w-full" onClick={dismiss}>
                        Got it
                    </Button>
                </SheetContent>
            </Sheet>
        );
    }
    return null;
}
