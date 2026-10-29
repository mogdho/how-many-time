import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Settings, RefreshCw, Lock, ChevronRight, ChevronDown, CheckCircle2, X } from 'lucide-react';

// One tappable row: icon bubble, title, short description, trailing chevron
const SheetRow = ({ icon: Icon, title, subtitle, onClick, trailing, tone = 'peach', expanded }) => (
    <button
        onClick={onClick}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left bg-transparent hover:bg-white/5 active:bg-white/10 transition-colors"
    >
        <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${tone === 'peach' ? 'bg-peach/15 text-peach' : 'bg-white/10 text-text'}`}>
            <Icon size={20} />
        </span>
        <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold text-text">{title}</span>
            {subtitle && <span className="block text-xs text-muted mt-0.5">{subtitle}</span>}
        </span>
        {trailing ?? <ChevronRight size={18} className="text-white/30 shrink-0" />}
    </button>
);

const MenuSheet = ({
    open,
    onClose,
    user,
    monthCount,
    isUpdateAvailable,
    onUpdate,
    isInstalled,
    canInstall,
    installHelp,
    onInstall,
    onOpenSettings,
    onLock,
}) => {
    const [showInstallHelp, setShowInstallHelp] = useState(false);

    // Close with Escape, and reset the install help each time the sheet opens
    useEffect(() => {
        if (!open) return undefined;
        setShowInstallHelp(false);
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const limit = user?.monthlyLimit;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[1500] bg-ink/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet — swipe down to close */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        className="panel fixed z-[1600] inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl md:bottom-6 md:rounded-3xl px-3 pt-2"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 90 || info.velocity.y > 500) onClose();
                        }}
                    >
                        {/* Grab handle */}
                        <div className="flex justify-center py-2 cursor-grab">
                            <span className="w-10 h-1.5 rounded-full bg-white/25" />
                        </div>

                        {/* Who / what */}
                        <div className="flex items-center gap-3 px-4 pb-4 mb-2 border-b border-line">
                            <span className="w-11 h-11 shrink-0 rounded-full bg-peach text-navy font-display italic text-lg flex items-center justify-center">
                                {(user?.username || '?').charAt(0).toUpperCase()}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-bold text-text truncate">{user?.username}</span>
                                <span className="block text-xs text-muted truncate">
                                    {user?.guiltyPleasure} · {monthCount}{limit ? ` of ${limit}` : ''} this month
                                </span>
                            </span>
                            <button
                                onClick={onClose}
                                aria-label="Close menu"
                                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-1">
                            {isUpdateAvailable && (
                                <SheetRow
                                    icon={RefreshCw}
                                    title="Update app"
                                    subtitle="A new version is ready"
                                    onClick={() => { onClose(); onUpdate(); }}
                                />
                            )}

                            {isInstalled ? (
                                <SheetRow
                                    icon={CheckCircle2}
                                    title="App installed"
                                    subtitle="Works offline from your home screen"
                                    tone="muted"
                                    trailing={<span />}
                                />
                            ) : (
                                <>
                                    <SheetRow
                                        icon={Download}
                                        title="Install app"
                                        subtitle={canInstall ? 'Add it to your home screen' : 'How to add it to your home screen'}
                                        expanded={canInstall ? undefined : showInstallHelp}
                                        trailing={canInstall ? undefined : <ChevronDown size={18} className={`text-white/30 shrink-0 transition-transform ${showInstallHelp ? 'rotate-180' : ''}`} />}
                                        onClick={() => {
                                            if (canInstall) { onClose(); onInstall(); }
                                            else setShowInstallHelp(v => !v);
                                        }}
                                    />
                                    <AnimatePresence initial={false}>
                                        {showInstallHelp && (
                                            <motion.p
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden mx-4 text-sm text-text/90"
                                            >
                                                <span className="block rounded-xl bg-white/5 border border-line px-4 py-3 mb-1">{installHelp}</span>
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}

                            <SheetRow
                                icon={Settings}
                                title="Change credentials"
                                subtitle="Name, habit, monthly limit, PIN"
                                onClick={onOpenSettings}
                            />

                            <SheetRow
                                icon={Lock}
                                title="Lock now"
                                subtitle="Ask for your PIN again"
                                onClick={onLock}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MenuSheet;
