"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function TeamDrawCinematic({ event, onComplete }) {
  const [phase, setPhase] = useState("loading"); // loading, reveal, announce, move

  useEffect(() => {
    if (!event) return;

    // Shorter Phase Transitions for a snappier feel
    const t1 = setTimeout(() => setPhase("reveal"), 800);
    const t2 = setTimeout(() => setPhase("announce"), 2200);
    const t3 = setTimeout(() => setPhase("move"), 3500);
    const t4 = setTimeout(() => onComplete(), 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [event, onComplete]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden font-sans">
      {/* Background Particles/Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)] animate-pulse"></div>

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 border-8 border-slate-800 border-t-amber-500 rounded-full animate-spin mb-6 mx-auto"></div>
            <p className="text-3xl font-black text-white uppercase tracking-[0.4em] animate-pulse">Assigning Team...</p>
          </motion.div>
        )}

        {(phase === "reveal" || phase === "announce") && (
          <motion.div 
            key="reveal"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="relative"
          >
            {/* BIG REVEAL CARD */}
            <div className="relative group">
               {/* Outer Glow */}
               <div className="absolute -inset-20 bg-amber-500/20 rounded-full blur-[100px] animate-pulse"></div>
               
               <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-amber-500/50 rounded-[40px] p-12 shadow-[0_0_80px_rgba(245,158,11,0.3)] flex flex-col items-center gap-8 min-w-[400px]">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-48 h-48 rounded-full border-4 border-white/10 overflow-hidden bg-slate-800 shadow-2xl"
                  >
                    <img src={event.team.logoUrl} alt={event.team.name} className="w-full h-full object-cover" />
                  </motion.div>
                  
                  <div className="text-center">
                     <motion.h2 
                       initial={{ y: 20, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       transition={{ delay: 0.8 }}
                       className="text-5xl font-black text-white uppercase tracking-tighter mb-2"
                     >
                       {event.team.name}
                     </motion.h2>
                     
                     <AnimatePresence>
                        {phase === "announce" && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-6 py-3 px-10 rounded-full bg-amber-500 text-black font-black text-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                          >
                             {event.pool === 'poolA' ? 'POOL A' : 'POOL B'}
                          </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {phase === "move" && (
           <motion.div
             key="move"
             initial={{ 
               x: 0, 
               y: 0, 
               scale: 1,
               opacity: 1 
             }}
             animate={{ 
               x: event.pool === 'poolA' ? -600 : 600, 
               y: 200,
               scale: 0.2,
               opacity: 0
             }}
             transition={{ duration: 1, ease: "easeInOut" }}
             className="relative"
           >
              <div className="w-80 h-80 bg-slate-800 rounded-full border-8 border-amber-500 overflow-hidden shadow-2xl">
                 <img src={event.team.logoUrl} alt={event.team.name} className="w-full h-full object-cover" />
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
