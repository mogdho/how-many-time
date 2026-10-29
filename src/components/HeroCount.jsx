import React from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

const HeroCount = ({ count }) => {
    const countRef = useRef();

    useEffect(() => {
        const node = countRef.current;
        if (!node) return;

        const controls = animate(parseInt(node.innerText) || 0, count, {
            duration: 0.4,
            ease: "easeOut",
            onUpdate(value) {
                node.textContent = Math.round(value);
            }
        });

        return () => controls.stop();
    }, [count]);

    return (
        <div className="flex flex-col items-center">
            <motion.div
                key={count}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="text-[120px] font-semibold text-[#EAEAEA] leading-none tracking-tighter"
                ref={countRef}
            >
                {count}
            </motion.div>
            <span className="text-[#888888] text-xs uppercase tracking-[0.4em] mt-2">Total Hits</span>
        </div>
    );
};

export default HeroCount;
