import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share } from 'lucide-react';

// A small card near the bottom of the screen. Shown once; any button closes it for good.
const PromptCard = ({ icon: Icon, title, message, children, onClose }) => (
    <div className="fixed inset-x-0 bottom-6 z-[1200] flex justify-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <motion.div
            role="dialog"
            aria-labelledby="prompt-card-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="panel w-full max-w-sm rounded-3xl p-5 text-left"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
            <div className="flex items-start gap-3 mb-4">
                <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-peach/15 text-peach">
                    <Icon size={20} />
                </span>
                <span className="min-w-0">
                    <span id="prompt-card-title" className="block font-bold text-text">{title}</span>
                    <span className="block text-sm text-muted mt-0.5">{message}</span>
                </span>
            </div>
            <div className="flex gap-3">{children}</div>
        </motion.div>
    </div>
);

export const InstallPrompt = ({ iosSafari, onInstall, onDone }) =>
    iosSafari ? (
        <PromptCard
            icon={Share}
            title="Install HMT"
            message={'Tap Share, then "Add to Home Screen". It opens full-screen and works offline.'}
            onClose={onDone}
        >
            <button type="button" onClick={onDone} className="btn btn-primary flex-1">OK</button>
        </PromptCard>
    ) : (
        <PromptCard
            icon={Download}
            title="Install HMT"
            message="Add it to your home screen. It opens full-screen and works offline."
            onClose={onDone}
        >
            <button type="button" onClick={onDone} className="btn btn-ghost flex-1">Not now</button>
            <button type="button" onClick={() => { onDone(); onInstall(); }} className="btn btn-primary flex-1">Install</button>
        </PromptCard>
    );

export default PromptCard;
