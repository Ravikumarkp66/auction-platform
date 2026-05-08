"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  LayoutGrid
} from 'lucide-react';
import { API_URL, getMediaUrl } from '@/lib/apiConfig';

export default function MobileHome() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch(`${API_URL}/api/tournaments`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter for active/live/upcoming
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
      {/* Subtle Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[40%] bg-purple-600/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[40%] bg-cyan-600/5 blur-[100px] rounded-full" />
      </div>

      {/* 1. COMPACT APP HEADER */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
            <svg className="w-6 h-6" viewBox="0 0 120 120" fill="none">
              <path d="M40 80L75 45" stroke="white" strokeWidth="12" strokeLinecap="round" />
              <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="white" />
              <path d="M45 45L80 80" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter leading-none text-white">LAKSHMISH</span>
            <span className="text-[8px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">Cricket Events</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#030712]" />
          </button>
          <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 px-5 pt-6 space-y-8">
        
        {/* Search Bar - App Style */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search tournaments..." 
            className="w-full py-3.5 pl-11 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-700"
          />
        </div>

        {/* 2. LIVE AUCTIONS SECTION - COMPACT INTRO */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live</span>
              </div>
              <h2 className="text-xl font-black text-white">Live Auctions</h2>
            </div>
            <Link href="/auctions" className="text-xs font-bold text-purple-500 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 3. LIVE CARDS - IMMEDIATELY VISIBLE */}
          {loading ? (
            <div className="h-28 rounded-3xl bg-white/5 animate-pulse flex items-center justify-center">
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Syncing Arena...</span>
            </div>
          ) : tournaments.length > 0 ? (
            <div className="space-y-4">
              {tournaments.slice(0, 3).map((t) => (
                <Link key={t._id} href={`/register/${t._id}`}>
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    className="relative group rounded-3xl bg-[#111827]/40 backdrop-blur-3xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-purple-500/30"
                  >
                    {/* Layered Glow */}
                    <div className="absolute inset-0 bg-linear-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-4 flex gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-inner">
                        <img 
                          src={getMediaUrl(t.assets?.splashUrl, "/tournaments/t1_v2.jpg")} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          alt={t.name}
                        />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[7px] font-black uppercase tracking-[0.2em] ${t.status === 'live' ? 'text-red-400' : 'text-purple-400'}`}>
                            {t.status === 'live' ? 'Auction Live' : 'Upcoming'}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white truncate leading-tight uppercase italic">{t.name}</h3>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3 text-purple-500/60" />
                            <span className="text-[10px] font-bold truncate max-w-[80px]">{t.organizerName || "Local"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Zap className="w-3 h-3 text-yellow-500/60" />
                            <span className="text-[10px] font-bold italic uppercase">IPL Pro</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center pr-1">
                        <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-500 shadow-xl">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 px-6 rounded-[2.5rem] bg-white/2 border border-dashed border-white/5 text-center">
              <Trophy className="w-10 h-10 text-gray-800 mx-auto mb-3" />
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">No Active Tournaments</p>
            </div>
          )}
        </section>

        {/* 4. APP ACTION GRID */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white">Dashboard</h2>
            <LayoutGrid className="w-4 h-4 text-gray-700" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <motion.div whileTap={{ scale: 0.95 }} className="p-5 rounded-[2rem] bg-linear-to-br from-indigo-600/10 to-indigo-900/20 border border-white/5 flex flex-col gap-4 shadow-xl shadow-black/40">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Join League</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5 font-bold uppercase tracking-tighter">Registration Hub</p>
                </div>
             </motion.div>

             <motion.div whileTap={{ scale: 0.95 }} className="p-5 rounded-[2rem] bg-linear-to-br from-emerald-600/10 to-emerald-900/20 border border-white/5 flex flex-col gap-4 shadow-xl shadow-black/40">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Top Stats</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5 font-bold uppercase tracking-tighter">Market Value</p>
                </div>
             </motion.div>
          </div>
        </section>

        {/* 5. PRO BANNER - APP STYLE */}
        <section className="relative rounded-[2.5rem] bg-linear-to-r from-purple-800 to-indigo-950 p-7 overflow-hidden shadow-2xl border border-white/10 group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 blur-[80px] rounded-full -z-0" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 text-[7px] font-black uppercase tracking-[0.3em] text-purple-300">
               <Zap className="w-2 h-2 fill-purple-400" /> Premium Feature
            </div>
            <h3 className="text-xl font-black text-white leading-tight uppercase italic">Host Your Own <br /> Auction</h3>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter max-w-[200px]">Get professional IPL-grade tools for your local cricket tournaments.</p>
            
            <button className="mt-5 px-6 py-3 rounded-2xl bg-white text-purple-900 text-[10px] font-black uppercase tracking-widest shadow-xl transition-transform active:scale-95">
              Get Started
            </button>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 transition-transform duration-1000">
            <Trophy className="w-40 h-40 text-white" />
          </div>
        </section>

      </main>
      
      {/* 6. STICKY BOTTOM SPACING */}
      <div className="pb-24" />
    </div>
  );
}
