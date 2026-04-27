"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy, Users, Zap, TrendingUp,
  PlusCircle, PlayCircle, Clock, ArrowRight,
  CheckCircle, XCircle, Award, AlertCircle,
  BarChart3, MousePointer2, ChevronRight, LayoutDashboard
} from "lucide-react";
import { useAuction } from "../layout";
import { useRouter } from "next/navigation";
import { API_URL, getMediaUrl } from "../../../lib/apiConfig";

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, gradient, glow, sub, href }) {
  const router = useRouter();
  
  const content = (
    <div
      onClick={() => href && router.push(href)}
      className={`relative group overflow-hidden rounded-2xl border border-white/10
        bg-[#111827]/60 backdrop-blur-xl p-6
        hover:scale-[1.03] hover:border-white/20
        transition-all duration-300 shadow-lg ${href ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ boxShadow: `0 0 0 0 ${glow}` }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 30px ${glow}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 0 0 ${glow}`}
    >
      <div
        className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: gradient }}
      />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{title}</p>
          <p className="text-4xl font-black text-white">{value}</p>
          {sub && <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex flex-wrap items-center gap-x-2">{sub}</div>}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner"
          style={{ background: gradient + "33" }}
        >
          <Icon className="w-5 h-5" style={{ color: glow }} />
        </div>
      </div>
    </div>
  );

  return content;
}

// ── Quick Action Card ──────────────────────────────────────
function ActionCard({ title, description, emoji, href, gradient }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10
        bg-[#111827]/60 backdrop-blur-xl p-6
        hover:border-white/25 hover:scale-[1.02]
        transition-all duration-300"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: gradient }}
      />
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg border border-white/10"
          style={{ background: gradient }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-white group-hover:text-violet-300 transition-colors">{title}</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { selectedAuction, allTournaments } = useAuction();
  const [localStats, setLocalStats] = useState({ teams: 0, players: 0, sold: 0, available: 0, unsold: 0, icons: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [regUrl, setRegUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visitorStats, setVisitorStats] = useState({ totalVisits: 0, recentUnique: 0, totalUnique: 0, dailyStats: [], totalUsers: 0 });
  const [userLogs, setUserLogs] = useState([]);

  async function fetchVisitorStats() {
    try {
      const res = await fetch(`${API_URL}/api/visitors/stats`);
      if (res.ok) {
        const data = await res.json();
        setVisitorStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch visitor stats:", err);
    }
  }

  async function fetchUserLogs() {
    try {
      const res = await fetch(`${API_URL}/api/visitors/user-logs`);
      if (res.ok) {
        const data = await res.json();
        setUserLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch user logs:", err);
    }
  }

  useEffect(() => {
    fetchVisitorStats();
    fetchUserLogs();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function fetchAuctionStats() {
    try {
      const url = `${API_URL}/api/tournaments/${selectedAuction._id}`;
      console.log("Fetching auction stats from:", url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const auctionPlayers = data.players?.filter(p => !p.isIcon) || [];
        const iconPlayers = data.players?.filter(p => p.isIcon) || [];
        
        setLocalStats({
          teams: data.teams?.length || 0,
          players: auctionPlayers.length,
          sold: auctionPlayers.filter(p => p.status === "sold").length,
          unsold: auctionPlayers.filter(p => p.status === "unsold").length,
          available: auctionPlayers.filter(p => !p.status || p.status === "available" || p.status === "auction").length,
          pending: auctionPlayers.filter(p => p.status === "pending").length,
          icons: iconPlayers.length
        });
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (selectedAuction) {
      setRegUrl(`${window.location.origin}/register/${selectedAuction._id}`);
      fetchAuctionStats();
    }
  }, [selectedAuction]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">

      {/* ── Welcome Area ── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{greeting} Commander</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Root<span className="text-violet-500">_Console</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1 flex items-center gap-3">
            <span>{currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-violet-400 tabular-nums">{currentTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/create-tournament"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs text-black
              bg-gradient-to-r from-yellow-400 to-yellow-500
              shadow-xl shadow-yellow-500/20
              hover:scale-105 transition-all duration-200"
          >
            <PlusCircle className="w-4 h-4" />
            CREATE NEW SYSTEM
          </Link>
        </div>
      </div>

      {/* ── Context Switcher Prompt ── */}
      {!selectedAuction && (
        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-violet-600/20 to-cyan-500/10 border border-violet-500/20 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white">System Context Missing</h2>
          <p className="text-slate-400 mt-2 max-w-md mx-auto text-sm font-semibold opacity-80 uppercase tracking-widest leading-relaxed">
            Please isolate an auction from the <span className="text-white underline decoration-violet-500 underline-offset-4">Top Monitor</span> to access dedicated management tools.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-[10px] font-black uppercase text-slate-500 tracking-tighter italic">
             <span>✓ Isolated Resources</span>
             <span>✓ Zero Data Conflict</span>
             <span>✓ Independent Ledger</span>
          </div>
        </div>
      )}

      {selectedAuction && (
        <>
          {/* ── Context Header ── */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex items-center gap-4 p-6 bg-white/[0.03] border border-white/10 rounded-3xl group shadow-inner">
               <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-cyan-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-500/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] mb-1">Active Context</p>
                  <h2 className="text-2xl font-black text-white">{selectedAuction.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-widest">{selectedAuction.status}</span>
                     <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">ID: {selectedAuction._id.slice(-6).toUpperCase()}</span>
                  </div>
               </div>
            </div>

            {/* 🔗 Registration Intelligence Panel */}
            <div className="lg:w-96 flex items-center gap-4 p-5 bg-gradient-to-br from-violet-600/20 to-cyan-500/20 border border-violet-500/30 rounded-3xl group relative overflow-hidden shadow-lg shadow-violet-500/10">
               <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 blur-2xl pointer-events-none"></div>
               <div className="shrink-0 w-12 h-12 bg-white border border-white/10 rounded-xl flex items-center justify-center p-1.5 shadow-xl">
                  {regUrl && (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(regUrl)}`} 
                      alt="Auction QR"
                      className="w-full h-full group-hover:scale-110 transition-transform"
                    />
                  )}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Public Registration Link</p>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(regUrl);
                         alert("Registration link copied to clipboard!");
                       }}
                       className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-[10px] font-black text-white rounded-lg transition-colors"
                     >
                        COPY LINK
                     </button>
                     <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                     <Link href={regUrl} target="_blank" className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white rounded-lg transition-colors">
                        VISIT PORTAL →
                     </Link>
                  </div>
               </div>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Auction Teams" value={localStats.teams}        icon={Users}      gradient="linear-gradient(135deg,#7c3aed,#06b6d4)" glow="#8b5cf6" sub="Isolation active" href="/admin/teams" />
            <StatCard 
              title="Player Pool"  
              value={localStats.players}      
              icon={Trophy}     
              gradient="linear-gradient(135deg,#3b82f6,#8b5cf6)" 
              glow="#3b82f6" 
              sub={(
                <>
                  <Link href="/admin/players?tab=AVAILABLE" className="hover:text-cyan-400 transition-colors" onClick={e => e.stopPropagation()}>{localStats.available} Available</Link>
                  <span className="opacity-20">•</span>
                  <Link href="/admin/players?tab=PENDING" className="hover:text-yellow-400 transition-colors" onClick={e => e.stopPropagation()}>{localStats.pending} Pending</Link>
                  <span className="opacity-20">•</span>
                  <Link href="/admin/players?tab=SOLD" className="hover:text-violet-400 transition-colors" onClick={e => e.stopPropagation()}>{localStats.sold} Sold</Link>
                  <span className="opacity-20">•</span>
                  <Link href="/admin/players?tab=UNSOLD" className="hover:text-red-400 transition-colors" onClick={e => e.stopPropagation()}>{localStats.unsold} Unsold</Link>
                </>
              )}
              href="/admin/players" 
            />
            <StatCard title="Icon Roster"   value={localStats.icons}        icon={Award}     gradient="linear-gradient(135deg,#f59e0b,#ef4444)" glow="#f59e0b" sub="Pre-retained" href="/admin/icons" />
            <StatCard title="Budget Health" value="100%"                   icon={TrendingUp} gradient="linear-gradient(135deg,#10b981,#06b6d4)" glow="#10b981" sub="System Nominal" />
            <StatCard 
              title="Registered Users" 
              value={visitorStats.totalUsers || 0} 
              icon={Users} 
              gradient="linear-gradient(135deg,#a855f7,#ec4899)" 
              glow="#d946ef" 
              sub="Gmail ID Collected" 
            />
          </div>

          {/* ── Integrated Actions ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard title="Manage Status"  description="Toggle auction engine states"     emoji="⚙️" href="/admin/status" gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" />
            <ActionCard title="Region Registry" description="Manage Taluks & Hoblis" emoji="🗺️" href="/admin/locations" gradient="linear-gradient(135deg,#f59e0b,#ef4444)" />
            <ActionCard title="Registry Auditor" description="Detect identity collisions" emoji="🛡️" href="/admin/audit" gradient="linear-gradient(135deg,#ef4444,#991b1b)" />
          </div>

          {/* ── Site Analytics Section ── */}
          <div className="pt-10">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <TrendingUp className="w-5 h-5" />
               </div>
               <div>
                  <h2 className="text-xl font-black text-white">Site Reach Analytics</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-time visitor monitoring</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Traffic Stats */}
               <div className="lg:col-span-1 space-y-4">
                  <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Page Hits</p>
                     <p className="text-3xl font-black text-white">{visitorStats.totalVisits.toLocaleString()}</p>
                     <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">All Time Reach</p>
                  </div>
                  <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Unique Visitors (24h)</p>
                     <p className="text-3xl font-black text-white">{visitorStats.recentUnique.toLocaleString()}</p>
                     <p className="text-[10px] font-bold text-violet-400 mt-1 uppercase tracking-widest">Active Engagement</p>
                  </div>
               </div>

               {/* Growth Chart (Simple CSS implementation) */}
               <div className="lg:col-span-2 p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <p className="text-sm font-black text-white">7-Day Trend</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Traffic volume distribution</p>
                     </div>
                     <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Updates Live
                     </div>
                  </div>

                  <div className="flex items-end justify-between h-32 gap-2">
                     {visitorStats.dailyStats.length === 0 ? (
                        <div className="w-full flex items-center justify-center text-slate-700 font-black text-[10px] uppercase italic tracking-widest">
                           Gathering Data...
                        </div>
                     ) : (
                        visitorStats.dailyStats.map((day, idx) => {
                           const max = Math.max(...visitorStats.dailyStats.map(d => d.count)) || 1;
                           const height = (day.count / max) * 100;
                           return (
                              <div key={day._id} className="flex-1 flex flex-col items-center gap-2 group">
                                 <div className="relative w-full flex flex-col items-center">
                                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none">
                                       {day.count}
                                    </div>
                                    <div 
                                       className="w-full bg-gradient-to-t from-violet-600 to-cyan-400 rounded-t-lg transition-all duration-1000 group-hover:brightness-125"
                                       style={{ height: `${Math.max(height, 5)}%` }}
                                    />
                                 </div>
                                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                    {new Date(day._id).toLocaleDateString('en-IN', { weekday: 'short' })}
                                 </p>
                              </div>
                           );
                        })
                     )}
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {/* ── System Inventory ── */}
      <div className="relative pt-10">
        <div className="absolute top-0 left-0 w-20 h-1 bg-violet-500 rounded-full opacity-50" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Past & Upcoming Systems</h2>
          <Link href="/admin/tournaments" className="text-[10px] font-black text-violet-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all">
             Full Inventory <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTournaments.filter(t => t.status !== "active").slice(0, 3).map(t => (
            <div key={t._id} className="relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0B0F2A]/60 backdrop-blur-xl hover:border-violet-500/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
               <div className="absolute inset-0 z-0">
                  <img src={getMediaUrl(t.assets?.splashUrl, "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=400&auto=format&fit=crop")} className="w-full h-full object-cover opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-1000" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F2A] via-transparent to-transparent"></div>
               </div>
               
               <div className="relative z-10 p-6">
                 <div className="flex items-start justify-between mb-6">
                    <div className={`p-2.5 rounded-2xl border ${t.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                      {t.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 italic px-2 py-1 bg-white/5 rounded-lg border border-white/5">{t.status}</span>
                 </div>
                 <h3 className="text-xl font-black text-white group-hover:text-violet-400 transition-colors truncate tracking-tighter italic">{t.name}</h3>
                 <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                    <div className="flex flex-col">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scale</p>
                       <p className="text-sm font-black text-white italic tracking-tighter">{t.numTeams} Teams</p>
                    </div>
                    <button onClick={() => { localStorage.setItem("selectedAuction", JSON.stringify(t)); window.location.reload(); }} className="w-10 h-10 bg-white/5 hover:bg-violet-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-violet-600/30 hover:scale-110 active:scale-95">
                       <MousePointer2 className="w-4 h-4" />
                    </button>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
