import React from 'react';
import { motion } from 'framer-motion';

const ActionButton = ({ onClick, isGuilty }) => {
    return (
        <div className={`action-button-frame ${isGuilty ? 'is-alert' : ''}`}>
            <div className="action-button-frame__inner">
                <motion.button
                    type="button"
                    onClick={onClick}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        boxShadow: isGuilty
                            ? '0 28px 70px rgba(216, 72, 93, 0.38), inset 0 1px 0 rgba(255,255,255,0.2)'
                            : '0 28px 70px rgba(237, 145, 69, 0.30), inset 0 1px 0 rgba(255,255,255,0.24)',
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`action-button-core ${isGuilty ? 'is-alert' : ''}`}
                >
                    <span className="action-button-core__glow" />
                    <span className="action-button-core__label">Log It</span>
                    <span className="action-button-core__subtext">private tap</span>
                </motion.button>
            </div>
        </div>
    );
};

export default ActionButton;
