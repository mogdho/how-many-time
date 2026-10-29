import React from 'react';
import { motion } from 'framer-motion';

const ActionButton = ({ onClick, isGuilty }) => {
    return (
        <div className="action-button-outer-ring">
            <div className="action-button-inner-ring">
                <motion.button
                    onClick={onClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92, y: 4 }}
                    className="w-56 h-56 rounded-full flex items-center justify-center text-white shadow-2xl relative overflow-hidden border-none"
                    animate={{
                        backgroundColor: isGuilty ? "#ae2448" : "#ED9145",
                        boxShadow: isGuilty
                            ? '0 0 50px rgba(174, 36, 72, 0.6), 0 25px 50px -12px rgba(174, 36, 72, 0.5)'
                            : '0 0 50px rgba(239, 188, 126, 0.0), 0 25px 50px -12px rgba(237, 145, 69, 0.5)'
                    }}
                    transition={{
                        backgroundColor: { duration: 0.4, ease: "easeOut" }
                    }}
                >
                    <span 
                        className="text-4xl md:text-6xl tracking-widest drop-shadow-md uppercase italic cursor-pointer relative z-20"
                        style={{ 
                            fontFamily: "'Montserrat', sans-serif",
                            color: '#F3F4F6', 
                            fontWeight: 900,
                            WebkitTextStroke: '0.8px #F3F4F6',
                        }}
                    >
                        GUILTY
                    </span>
                </motion.button>
            </div>
        </div>
    );
};

export default ActionButton;
