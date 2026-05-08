"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Bell, 
  User, 
  Trophy, 
  Zap, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  Search,
  LayoutGrid,
  ChevronRight,
  Target
} from 'lucide-react';
import { API_URL, getMediaUrl } from '@/lib/apiConfig';

export default function MobileHome() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate static particles for background
    setParticles(Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 5 + 5
    })));

    async function fetchTournaments() {
      try {
        const res = await fetch(`${API_URL}/api/tournaments`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const active = data.filter(t => t.status === 'active' || t.status === 'live' || t.status === 'upcoming');
          active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setTournaments(active);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#030712] relative min-h-screen">
      {/* 1. COMPACT APP HEADER */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-2xl border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40 ring-1 ring-white/10">
             <Trophy className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tighter leading-none text-white italic">LCE PREMIUM</span>
            <span className="text-[6px] font-black text-purple-500 uppercase tracking-[0.3em] mt-0.5">Auction Arena</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full text-slate-400 active:bg-white/5 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-purple-500 rounded-full ring-2 ring-[#030712]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/5 p-0.5 border border-white/10 overflow-hidden active:scale-95 transition-transform">
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Particles */}
      <section className="relative px-4 pt-6 pb-2 overflow-hidden">
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle"
            style={{ 
              left: p.left, 
              top: p.top, 
              width: p.size, 
              height: p.size,
              animationDuration: `${p.duration}s`
            }}
          />
        ))}
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest mb-3">
             <Target className="w-2.5 h-2.5" /> Discovery Center
          </div>
          <h1 className="text-3xl font-[1000] tracking-tighter text-white uppercase italic leading-tight">
            League <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-indigo-400">Dashboard</span>
          </h1>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em] mt-1">Live Cricket Economy</p>
        </motion.div>
      </section>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-12 space-y-7 relative z-10">
        
        {/* Compact Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input 
            type="text" 
            placeholder="Search leagues or players..." 
            className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-bold text-white focus:border-purple-500/30 outline-none transition-all placeholder:text-slate-800"
          />
        </div>

        {/* LIVE AUCTIONS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Active Battles</h2>
            </div>
            <Link href="/auctions" className="text-[9px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-0.5">
              Explorer <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              [1, 2].map(i => <div key={i} className="h-28 rounded-3xl bg-white/5 animate-pulse" />)
            ) : tournaments.length > 0 ? (
              tournaments.slice(0, 3).map((t, idx) => (
                <Link key={t._id} href={`/register/${t._id}`}>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative rounded-3xl bg-white/5 border border-white/5 overflow-hidden shadow-2xl active:border-purple-500/40 transition-colors"
                  >
                    <div className="absolute inset-0 bg-linear-to-br from-purple-600/5 to-transparent opacity-0 group-active:opacity-100 transition-opacity" />
                    
                    <div className="p-3 flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-lg relative">
                        <img 
                          src={getMediaUrl(t.assets?.splashUrl, "/tournaments/t1_v2.jpg")} 
                          className="w-full h-full object-cover"
                          alt={t.name}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-[#030712] via-transparent to-transparent opacity-60" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[6px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">
                            {t.status === 'live' ? 'Bidding Live' : 'Open'}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-white truncate leading-tight uppercase italic mb-2 tracking-tight group-active:text-purple-400 transition-colors">{t.name}</h3>
                        
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5 text-purple-500/60" />
                            <span className="text-[8px] font-bold truncate tracking-tight uppercase text-slate-600">{t.organizerName || "Official Arena"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Zap className="w-2.5 h-2.5 text-yellow-500/60" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">IPL Pro Engine</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pr-1">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-700 group-active:text-purple-400 group-active:border-purple-500/20 transition-all">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            ) : (
              <div className="py-10 px-6 rounded-3xl bg-white/2 border border-dashed border-white/5 text-center">
                <Trophy className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">No Active Sessions</p>
              </div>
            )}
          </div>
        </section>

        {/* DASHBOARD GRID */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Elite Services</h2>
            <LayoutGrid className="w-3.5 h-3.5 text-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <motion.div whileTap={{ scale: 0.96 }} className="p-4 rounded-3xl bg-linear-to-br from-indigo-600/10 to-indigo-950/30 border border-white/5 flex flex-col gap-4 shadow-xl">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider italic">Join League</h4>
                  <p className="text-[7px] text-slate-600 mt-0.5 font-black uppercase tracking-widest leading-none">Register Team</p>
                </div>
             </motion.div>

             <motion.div whileTap={{ scale: 0.96 }} className="p-4 rounded-3xl bg-linear-to-br from-emerald-600/10 to-emerald-950/30 border border-white/5 flex flex-col gap-4 shadow-xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider italic">Leaderboard</h4>
                  <p className="text-[7px] text-slate-600 mt-0.5 font-black uppercase tracking-widest leading-none">Market Stats</p>
                </div>
             </motion.div>
          </div>
        </section>

        {/* PRO BANNER */}
        <section className="relative rounded-3xl bg-linear-to-r from-purple-800 to-indigo-950 p-6 overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/15 blur-[60px] rounded-full" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 text-[6px] font-black uppercase tracking-[0.3em] text-purple-300">
               <Zap className="w-2 h-2 fill-purple-400" /> Host Auctions
            </div>
            <h3 className="text-lg font-black text-white leading-tight uppercase italic tracking-tight">Launch Your <br /> Own Pro League</h3>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest max-w-[180px] leading-relaxed">IPL-grade management for your local matches.</p>
            
            <button className="px-5 py-2.5 rounded-xl bg-white text-purple-950 text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
              Apply Now
            </button>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12 scale-125">
            <Trophy className="w-32 h-32 text-white" />
          </div>
        </section>

      </main>
    </div>
  );
}
