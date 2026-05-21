"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SuperRaidOverlay({ event, onComplete }) {
    // event: { title, iconUrl, teamColor, scoreFrom, scoreTo }
    useEffect(() => {
        if (!event) return;
        const t = setTimeout(() => onComplete && onComplete(), 4200);
        return () => clearTimeout(t);
    }, [event, onComplete]);

    if (!event) return null;

    const bgFade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

    const iconVariants = {
        initial: { scale: 0, opacity: 0 },
        pop: { scale: [0, 1.4, 1], opacity: 1, transition: { times: [0, 0.5, 1], duration: 0.8, ease: "easeOut" } },
        exit: { scale: 0.6, opacity: 0, transition: { duration: 0.4 } }
    };

    const textVariants = {
        initial: { y: 40, opacity: 0 },
        in: { y: 0, opacity: 1, transition: { delay: 0.5, duration: 0.6, ease: "backOut" } },
        exit: { y: -20, opacity: 0 }
    };

    const shake = {
        animate: {
            x: [0, -6, 6, -3, 3, 0],
            transition: { delay: 0.9, duration: 0.6, ease: "easeInOut" }
        }
    };

    return (
        <AnimatePresence>
            <motion.div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 600 }} {...bgFade} initial="initial" animate="animate" exit="exit">
                {/* Dim Background instantly */}
                <div className="absolute inset-0 bg-black/75" />

                <motion.div className="relative flex flex-col items-center justify-center text-center px-6" {...shake}>
                    {/* Icon */}
                    <motion.div
                        className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden flex items-center justify-center mb-6"
                        variants={iconVariants}
                        initial="initial"
                        animate="pop"
                        style={{ boxShadow: `0 20px 60px ${event.teamColor || '#ff7a59'}33`, border: `6px solid ${event.teamColor || '#ff7a59'}` }}
                    >
                        {event.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={event.iconUrl} alt={event.title || 'raid'} className="w-full h-full object-cover" />
                        ) : (
                            <div style={{ width: '60%', height: '60%', borderRadius: 9999, background: event.teamColor || '#ff7a59' }} />
                        )}
                    </motion.div>

                    {/* Title */}
                    <motion.h2 className="text-6xl md:text-8xl font-black uppercase tracking-tight mb-2"
                        variants={textVariants}
                        initial="initial"
                        animate="in"
                        style={{ color: '#fff', textShadow: `0 8px 40px ${event.teamColor || '#ff7a59'}66` }}
                    >
                        {event.title || 'SUPER RAID'}
                    </motion.h2>

                    {/* Score animate (simple pulse) */}
                    <motion.div className="mt-4 text-white font-black text-4xl md:text-6xl tabular-nums"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: [1, 1.12, 1], opacity: [0, 1, 1] }}
                        transition={{ delay: 1.1, duration: 0.9, ease: 'easeOut' }}
                        style={{ textShadow: `0 6px 30px ${event.teamColor || '#ff7a59'}44` }}
                    >
                        {(event.scoreFrom !== undefined && event.scoreTo !== undefined)
                            ? `${event.scoreFrom} → ${event.scoreTo}`
                            : ''}
                    </motion.div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
