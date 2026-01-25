import React from 'react';
import { motion } from 'framer-motion';

const ActionButton = ({ onClick }) => {
    return (
        <div className="action-button-outer-ring">
            <div className="action-button-inner-ring">
                <motion.button
                    onClick={onClick}
                    whileHover={{
                        scale: 1.05,
                        backgroundColor: "#fff",
                        boxShadow: "0 0 50px rgba(255, 255, 255, 0.4)",
                        color: "#000"
                    }}
                    whileTap={{
                        scale: 0.92,
                        boxShadow: "inset 0 0 20px rgba(0,0,0,0.2)",
                        y: 4
                    }}
                    className="w-56 h-56 rounded-full bg-white flex items-center justify-center text-black shadow-2xl transition-all duration-200"
                >
                    <span className="text-4xl font-black tracking-tighter cursor-pointer">AGAIN!</span>
                </motion.button>
            </div>
        </div>
    );
};

export default ActionButton;
