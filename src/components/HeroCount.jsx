import React, { useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';

const HeroCount = ({ count }) => {
    const countRef = useRef();

    useEffect(() => {
        const node = countRef.current;

        if (!node) {
            return undefined;
        }

        const controls = animate(parseInt(node.textContent, 10) || 0, count, {
            duration: 0.45,
            ease: 'easeOut',
            onUpdate(value) {
                node.textContent = Math.round(value);
            },
        });

        return () => controls.stop();
    }, [count]);

    return (
        <div className="hero-count">
            <p className="hero-count__label">Total entries</p>
            <motion.div
                key={count}
                initial={{ opacity: 0.6, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="hero-count__value"
                ref={countRef}
            >
                {count}
            </motion.div>
            <p className="hero-count__caption">A running record with no external memory but your own device.</p>
        </div>
    );
};

export default HeroCount;
