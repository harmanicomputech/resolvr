import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Toast, type ToastTone } from '@/components/ui/toast';

interface ToastItem {
    id: number;
    title: string;
    description?: string;
    tone?: ToastTone;
    action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<((toast: Omit<ToastItem, 'id'> & { duration?: number }) => void) | null>(null);

export function useToast() {
    const push = useContext(ToastContext);
    if (!push) throw new Error('useToast must be used inside <Toaster>');
    return push;
}

/** Calm toast stack, bottom-centre on phones, bottom-right on desktop. Swipe or wait to dismiss. */
export function Toaster({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
    const push = useCallback(
        ({ duration = 4000, ...toast }: Omit<ToastItem, 'id'> & { duration?: number }) => {
            const id = Date.now() + Math.random();
            setItems((list) => [...list.slice(-2), { ...toast, id }]);
            if (duration > 0) window.setTimeout(() => dismiss(id), duration);
        },
        [dismiss],
    );
    const value = useMemo(() => push, [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end"
                aria-live="polite"
            >
                <AnimatePresence initial={false}>
                    {items.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismiss(t.id)}
                            className="pointer-events-auto"
                        >
                            <Toast
                                tone={t.tone}
                                title={t.title}
                                description={t.description}
                                action={
                                    t.action && (
                                        <button
                                            type="button"
                                            className="btn"
                                            data-size="sm"
                                            onClick={() => {
                                                t.action!.onClick();
                                                dismiss(t.id);
                                            }}
                                        >
                                            {t.action.label}
                                        </button>
                                    )
                                }
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
