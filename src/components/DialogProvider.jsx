import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

/*
  Themed replacement for the browser's alert() and confirm().

  const dialog = useDialog();
  await dialog.alert({ title, message });
  if (await dialog.confirm({ title, message, confirmText, danger: true })) { ... }
*/

const DialogContext = createContext(null);

export const useDialog = () => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
    return ctx;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);
    const resolveRef = useRef(null);

    const open = useCallback((options) => new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog(options);
    }), []);

    const close = useCallback((result) => {
        resolveRef.current?.(result);
        resolveRef.current = null;
        setDialog(null);
    }, []);

    const api = useRef({
        alert: (opts) => open({ ...opts, kind: 'alert' }),
        confirm: (opts) => open({ ...opts, kind: 'confirm' }),
    }).current;

    return (
        <DialogContext.Provider value={api}>
            {children}
            <DialogView dialog={dialog} onClose={close} />
        </DialogContext.Provider>
    );
};

const DialogView = ({ dialog, onClose }) => {
    const cancelRef = useRef(null);
    const confirmRef = useRef(null);

    // Escape cancels; focus the safe choice first (Cancel for dangerous actions)
    useEffect(() => {
        if (!dialog) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose(false);
        };
        window.addEventListener('keydown', onKey);
        const t = setTimeout(() => (dialog.danger && cancelRef.current ? cancelRef.current : confirmRef.current)?.focus(), 50);
        return () => {
            window.removeEventListener('keydown', onKey);
            clearTimeout(t);
        };
    }, [dialog, onClose]);

    const isConfirm = dialog?.kind === 'confirm';
    const Icon = dialog?.danger ? AlertTriangle : Info;

    return (
        <AnimatePresence>
            {dialog && (
                <motion.div
                    key="dialog"
                    className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onClose(false)}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="dialog-title"
                        aria-describedby="dialog-message"
                        className="panel w-full max-w-sm rounded-3xl p-6 text-center"
                        initial={{ scale: 0.92, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center ${dialog.danger ? 'bg-crimson/25 text-[#ff8a9f]' : 'bg-peach/15 text-peach'}`}>
                            <Icon size={26} />
                        </span>

                        <h2 id="dialog-title" className="font-display italic uppercase text-xl tracking-wider text-text mb-2">
                            {dialog.title}
                        </h2>
                        {dialog.message && (
                            <p id="dialog-message" className="text-sm text-muted leading-relaxed mb-6">
                                {dialog.message}
                            </p>
                        )}

                        <div className="flex gap-3">
                            {isConfirm && (
                                <button ref={cancelRef} onClick={() => onClose(false)} className="btn btn-ghost flex-1">
                                    {dialog.cancelText || 'Cancel'}
                                </button>
                            )}
                            <button
                                ref={confirmRef}
                                onClick={() => onClose(true)}
                                className={`btn flex-1 ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                            >
                                {dialog.confirmText || 'OK'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
