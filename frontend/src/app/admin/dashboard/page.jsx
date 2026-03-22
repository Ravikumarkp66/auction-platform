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

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, gradient, glow, sub }) {
  return (
    <div
      className="relative group overflow-hidden rounded-2xl border border-white/10
        bg-[#111827]/60 backdrop-blur-xl p-6
        hover:scale-[1.03] hover:border-white/20
        transition-all duration-300 cursor-default shadow-lg"
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
          {sub && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{sub}</p>}
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
  const [localStats, setLocalStats] = useState({ teams: 0, players: 0, sold: 0, icons: 0 });
  const [loading, setLoading] = useState(false);

  async function fetchAuctionStats() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${selectedAuction._id}`);
      if (res.ok) {
        const data = await res.json();
        setLocalStats({
          teams: data.teams?.length || 0,
          players: data.players?.length || 0,
          sold: data.players?.filter(p => p.status === "sold").length || 0,
          icons: data.players?.filter(p => p.isIcon).length || 0
        });
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (selectedAuction) {
      const timeoutId = setTimeout(() => {
        fetchAuctionStats();
      }, 0);
      return () => clearTimeout(timeoutId);
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
          <p className="text-slate-500 text-sm font-bold mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
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
          <div className="flex items-center gap-4 p-6 bg-white/[0.03] border border-white/10 rounded-3xl group shadow-inner">
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

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Auction Teams" value={localStats.teams}        icon={Users}      gradient="linear-gradient(135deg,#7c3aed,#06b6d4)" glow="#8b5cf6" sub="Isolation active" />
            <StatCard title="Athlete Pool"  value={localStats.players}      icon={Trophy}     gradient="linear-gradient(135deg,#3b82f6,#8b5cf6)" glow="#3b82f6" sub={`${localStats.sold} Already Sold`} />
            <StatCard title="Icon Roster"   value={localStats.icons}        icon={Award}     gradient="linear-gradient(135deg,#f59e0b,#ef4444)" glow="#f59e0b" sub="Pre-retained" />
            <StatCard title="Budget Health" value="100%"                   icon={TrendingUp} gradient="linear-gradient(135deg,#10b981,#06b6d4)" glow="#10b981" sub="System Nominal" />
          </div>

          {/* ── Integrated Actions ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard title="Manage Teams" description="Organize rosters and budgets" emoji="👥" href="/admin/teams" gradient="linear-gradient(135deg,#7c3aed,#3b82f6)" />
            <ActionCard title="Athlete Pool" description="Verify and edit player stats" emoji="🏏" href="/admin/players" gradient="linear-gradient(135deg,#10b981,#06b6d4)" />
            <ActionCard title="Live Control" description="Enter the broadcast control room" emoji="⚡" href="/live-auction?role=admin" gradient="linear-gradient(135deg,#ef4444,#f97316)" />
          </div>
        </>
      )}

      {/* ── System Topology (History) ── */}
      <div className="relative pt-10">
        <div className="absolute top-0 left-0 w-20 h-1 bg-violet-500 rounded-full opacity-50" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Archived Systems (All Time)</h2>
          <Link href="/admin/tournaments" className="text-[10px] font-black text-violet-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all">
             Full Inventory <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTournaments.slice(0, 3).map(t => (
            <div key={t._id} className="relative group p-6 rounded-3xl border border-white/5 bg-[#111827]/40 hover:bg-[#111827]/80 hover:border-violet-500/30 transition-all duration-300">
               <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-xl border ${t.status === 'active' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 italic">2025 SERIES</span>
               </div>
               <h3 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors truncate">{t.name}</h3>
               <div className="flex items-center justify-between mt-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.numTeams} Node Teams</p>
                  <button onClick={() => { localStorage.setItem("selectedAuction", JSON.stringify(t)); window.location.reload(); }} className="p-2 bg-white/5 hover:bg-violet-600 text-white rounded-xl transition-all shadow-lg hover:shadow-violet-600/20">
                     <MousePointer2 className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
