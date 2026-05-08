"use client";
import React, { useState, useEffect, useRef } from 'react';
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
  Target,
  Play,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import { API_URL, getMediaUrl } from '@/lib/apiConfig';

export default function MobileHome() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
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

  const quickActions = [
    { name: 'Live', icon: Zap, color: 'from-orange-500 to-red-600' },
    { name: 'Teams', icon: Users, color: 'from-blue-500 to-indigo-600' },
    { name: 'Players', icon: User, color: 'from-purple-500 to-pink-600' },
    { name: 'Analytics', icon: BarChart3, color: 'from-emerald-500 to-teal-600' },
    { name: 'Fixtures', icon: Calendar, color: 'from-cyan-500 to-blue-600' },
  ];

  const featured = tournaments.find(t => t.status === 'live') || tournaments[0];

  return (
    <div className="flex-1 flex flex-col bg-[#030712] relative min-h-screen pb-32">
      
      {/* 1. COMPACT TOP HEADER */}
      <header className="sticky top-0 z-[60] bg-[#030712]/60 backdrop-blur-2xl px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
             <Trophy className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-[1000] tracking-tighter text-white italic uppercase">LCE APP</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="relative p-1.5 rounded-full text-slate-400 active:scale-95 transition-transform">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full border border-[#030712]" />
          </button>
          <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center active:scale-95 transition-transform cursor-pointer">
             <User className="w-4.5 h-4.5 text-slate-500" />
          </div>
        </div>
      </header>

      {/* 2. HERO LIVE BANNER */}
      <section className="px-4 pt-4">
        {loading ? (
          <div className="w-full h-52 rounded-[2rem] bg-white/5 animate-pulse" />
        ) : featured ? (
          <Link href={`/register/${featured._id}`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-60 rounded-[2.5rem] overflow-hidden group shadow-2xl"
            >
              <img 
                src={getMediaUrl(featured.assets?.splashUrl, "/tournaments/t1_v2.jpg")} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                alt="Featured"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#030712] via-[#030712]/20 to-transparent" />
              
              {/* Floating Badge */}
              <div className="absolute top-5 left-5 px-3 py-1.5 rounded-xl bg-red-600 flex items-center gap-1.5 shadow-xl">
                 <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Auction</span>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-2xl font-[1000] text-white uppercase italic leading-tight mb-3 drop-shadow-lg">
                  {featured.name}
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border border-white/20 bg-slate-800 flex items-center justify-center text-[8px] font-black">T{i}</div>
                    ))}
                    <div className="w-6 h-6 rounded-full border border-white/20 bg-purple-600 flex items-center justify-center text-[8px] font-black">+12</div>
                  </div>
                  <button className="px-6 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform shadow-xl">
                    <Play className="w-3 h-3 fill-black" /> Enter Live
                  </button>
                </div>
              </div>
            </motion.div>
          </Link>
        ) : null}
      </section>

      {/* 3. HORIZONTAL QUICK ACTIONS */}
      <section className="pt-8 overflow-hidden">
        <div className="px-4 mb-4 flex items-center justify-between">
           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Quick Access</h3>
           <Search className="w-4 h-4 text-slate-800" />
        </div>
        <div 
          className="flex overflow-x-auto gap-5 px-4 pb-4 no-scrollbar snap-x"
        >
          {quickActions.map((action, idx) => (
            <motion.div 
              key={idx}
              whileTap={{ scale: 0.95 }}
              className="snap-start shrink-0 flex flex-col items-center gap-2.5"
            >
              <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${action.color} p-[1px] shadow-lg shadow-black/40`}>
                <div className="w-full h-full rounded-2xl bg-[#030712]/50 backdrop-blur-xl flex items-center justify-center">
                   <action.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{action.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. LIVE TOURNAMENT CARDS */}
      <section className="px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-[1000] text-white uppercase italic tracking-tight">Trending Events</h2>
          <Link href="/tournaments" className="text-[9px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1">
             Discover All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-4">
          {loading ? (
             [1,2].map(i => <div key={i} className="h-28 rounded-3xl bg-white/5 animate-pulse" />)
          ) : tournaments.map((t, idx) => (
            <Link key={t._id} href={`/register/${t._id}`}>
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileTap={{ scale: 0.98 }}
                className="relative rounded-[2rem] bg-white/2 border border-white/5 overflow-hidden group shadow-2xl active:border-purple-500/20"
              >
                <div className="absolute inset-0 bg-linear-to-br from-purple-600/5 to-transparent opacity-0 group-active:opacity-100 transition-opacity" />
                
                <div className="p-3.5 flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative">
                    <img 
                      src={getMediaUrl(t.assets?.splashUrl, "/tournaments/t1_v2.jpg")} 
                      className="w-full h-full object-cover"
                      alt={t.name}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#030712] via-transparent to-transparent opacity-40" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[6px] font-[1000] uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        {t.status}
                      </span>
                      <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                         {t.organizerName || "LCE Official"}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white truncate leading-tight uppercase italic mb-2 tracking-tight">{t.name}</h3>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[6px] font-black text-slate-700 uppercase tracking-[0.2em]">Teams</span>
                        <span className="text-[11px] font-black text-white">16</span>
                      </div>
                      <div className="w-px h-4 bg-white/5" />
                      <div className="flex flex-col">
                        <span className="text-[6px] font-black text-slate-700 uppercase tracking-[0.2em]">Players</span>
                        <span className="text-[11px] font-black text-white">180+</span>
                      </div>
                      <div className="ml-auto">
                        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-purple-500 text-[8px] font-black uppercase tracking-widest transition-all group-active:bg-purple-600 group-active:text-white group-active:border-transparent">
                          Watch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Decorative Atmosphere Glows */}
      <div className="fixed bottom-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-purple-600/5 blur-[100px] rounded-full" />
        <div className="absolute top-[20%] left-[-10%] w-[60%] h-[40%] bg-cyan-600/5 blur-[100px] rounded-full" />
      </div>

    </div>
  );
}
