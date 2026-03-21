"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function TeamDrawOverlay({ poolA, poolB, drawEvent }) {
  const slots = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-[150] bg-[#071821] flex flex-col items-center p-4 md:p-12 overflow-y-auto overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,212,163,0.1)_0%,_transparent_70%)] opacity-50 pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-10 text-center mb-8 md:mb-16 mt-4 md:mt-0">
        <p className="text-amber-500 font-black text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.5em] mb-2">Tournament Grouping</p>
        <h1 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
          Team <span className="text-amber-500">Pool Draw</span>
        </h1>
      </div>

      {/* Pools Grid */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row justify-between items-start gap-8 md:gap-20 px-2 md:px-0 mb-12">
        
        {/* Pool A */}
        <div className="w-full flex-1">
           <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b-2 md:border-b-4 border-blue-500/50 pb-3 md:pb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:2xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">🔵</div>
              <div>
                 <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic">Pool A</h2>
                 <p className="text-blue-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">{poolA.length} / 5 Teams Assigned</p>
              </div>
           </div>
           
           <div className="grid gap-3 md:gap-4">
              {slots.map(i => {
                const team = poolA[i];
                return (
                   <motion.div 
                     key={`poolA-${i}`}
                     initial={team ? { scale: 0.8, opacity: 0 } : {}}
                     animate={team ? { scale: 1, opacity: 1 } : {}}
                     transition={{ type: "spring", stiffness: 300, damping: 20 }}
                     className={`h-16 md:h-24 rounded-2xl md:rounded-3xl border-2 flex items-center px-4 md:px-6 gap-3 md:gap-6 transition-all ${team ? 'bg-slate-800/80 border-blue-500/30' : 'bg-white/5 border-dashed border-white/5 opacity-20'}`}
                   >
                     {team ? (
                        <>
                          <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white/10 overflow-hidden shadow-lg flex-shrink-0">
                             <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-lg md:text-2xl font-black text-white uppercase italic tracking-tight truncate">{team.name}</span>
                        </>
                     ) : (
                        <span className="text-slate-500 font-bold uppercase tracking-wider md:tracking-widest text-[10px] md:text-xs italic">Waiting for draw...</span>
                     )}
                   </motion.div>
                );
              })}
           </div>
        </div>

        {/* Pool B */}
        <div className="w-full flex-1">
           <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b-2 md:border-b-4 border-orange-500/50 pb-3 md:pb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-600 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:2xl shadow-[0_0_20px_rgba(234,88,12,0.4)]">🟠</div>
              <div>
                 <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic">Pool B</h2>
                 <p className="text-orange-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">{poolB.length} / 5 Teams Assigned</p>
              </div>
           </div>
           
           <div className="grid gap-3 md:gap-4">
              {slots.map(i => {
                const team = poolB[i];
                return (
                   <motion.div 
                     key={`poolB-${i}`}
                     initial={team ? { scale: 0.8, opacity: 0 } : {}}
                     animate={team ? { scale: 1, opacity: 1 } : {}}
                     transition={{ type: "spring", stiffness: 300, damping: 20 }}
                     className={`h-16 md:h-24 rounded-2xl md:rounded-3xl border-2 flex items-center px-4 md:px-6 gap-3 md:gap-6 transition-all ${team ? 'bg-slate-800/80 border-orange-500/30' : 'bg-white/5 border-dashed border-white/5 opacity-20'}`}
                   >
                     {team ? (
                        <>
                          <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white/10 overflow-hidden shadow-lg flex-shrink-0">
                             <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-lg md:text-2xl font-black text-white uppercase italic tracking-tight truncate">{team.name}</span>
                        </>
                     ) : (
                        <span className="text-slate-500 font-bold uppercase tracking-wider md:tracking-widest text-[10px] md:text-xs italic">Waiting for draw...</span>
                     )}
                   </motion.div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto py-8 text-center opacity-30">
         <p className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-[0.5em] md:tracking-[1em]">Official Tournament Draw Ceremony • 2026</p>
      </div>
    </div>
  );
}
