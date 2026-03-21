"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function TeamDrawOverlay({ poolA, poolB, drawEvent }) {
  const slots = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-[150] bg-[#071821] flex flex-col items-center p-12 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,212,163,0.1)_0%,_transparent_70%)] opacity-50"></div>
      
      {/* Header */}
      <div className="relative z-10 text-center mb-16">
        <p className="text-amber-500 font-black text-xs uppercase tracking-[0.5em] mb-2">Tournament Grouping</p>
        <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">Team <span className="text-amber-500">Pool Draw</span></h1>
      </div>

      {/* Pools Grid */}
      <div className="relative z-10 w-full max-w-7xl flex justify-between items-start gap-20">
        
        {/* Pool A */}
        <div className="flex-1">
           <div className="flex items-center gap-4 mb-8 border-b-4 border-blue-500/50 pb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">🔵</div>
              <div>
                 <h2 className="text-4xl font-black text-white uppercase italic">Pool A</h2>
                 <p className="text-blue-400 font-bold text-xs uppercase tracking-widest">{poolA.length} / 5 Teams Assigned</p>
              </div>
           </div>
           
           <div className="grid gap-4">
              {slots.map(i => {
                const team = poolA[i];
                return (
                   <motion.div 
                     key={`poolA-${i}`}
                     initial={team ? { scale: 0.8, opacity: 0 } : {}}
                     animate={team ? { scale: 1, opacity: 1 } : {}}
                     className={`h-24 rounded-3xl border-2 flex items-center px-6 gap-6 transition-all ${team ? 'bg-slate-800/80 border-blue-500/30' : 'bg-white/5 border-dashed border-white/5 opacity-20'}`}
                   >
                     {team ? (
                        <>
                          <div className="w-14 h-14 rounded-full border-2 border-white/10 overflow-hidden shadow-lg">
                             <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-2xl font-black text-white uppercase italic tracking-tight">{team.name}</span>
                        </>
                     ) : (
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Waiting for draw...</span>
                     )}
                   </motion.div>
                );
              })}
           </div>
        </div>

        {/* Pool B */}
        <div className="flex-1">
           <div className="flex items-center gap-4 mb-8 border-b-4 border-orange-500/50 pb-4">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(234,88,12,0.4)]">🟠</div>
              <div>
                 <h2 className="text-4xl font-black text-white uppercase italic">Pool B</h2>
                 <p className="text-orange-400 font-bold text-xs uppercase tracking-widest">{poolB.length} / 5 Teams Assigned</p>
              </div>
           </div>
           
           <div className="grid gap-4">
              {slots.map(i => {
                const team = poolB[i];
                return (
                   <motion.div 
                     key={`poolB-${i}`}
                     initial={team ? { scale: 0.8, opacity: 0 } : {}}
                     animate={team ? { scale: 1, opacity: 1 } : {}}
                     className={`h-24 rounded-3xl border-2 flex items-center px-6 gap-6 transition-all ${team ? 'bg-slate-800/80 border-orange-500/30' : 'bg-white/5 border-dashed border-white/5 opacity-20'}`}
                   >
                     {team ? (
                        <>
                          <div className="w-14 h-14 rounded-full border-2 border-white/10 overflow-hidden shadow-lg">
                             <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-2xl font-black text-white uppercase italic tracking-tight">{team.name}</span>
                        </>
                     ) : (
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Waiting for draw...</span>
                     )}
                   </motion.div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 right-0 text-center opacity-30">
         <p className="text-[10px] font-bold text-white uppercase tracking-[1em]">Official Tournament Draw Ceremony • 2026</p>
      </div>
    </div>
  );
}
