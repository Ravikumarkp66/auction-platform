"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Trophy, Users, Calendar, Search, 
  Filter, TrendingUp, History, Star, 
  ChevronRight, ArrowLeft, Download,
  ExternalLink, DollarSign, Activity,
  LayoutDashboard, ListChecks, CheckCircle, HelpCircle, X,
  ArrowRight, FileDown
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DEFAULT_ASSETS, API_URL } from "@/lib/apiConfig";

// Design Tokens (Matching existing system)
const C = {
  bg: '#0a0f18',
  card: 'rgba(30, 41, 59, 0.4)',
  accent: '#a855f7', // Violet
  emerald: '#10b981',
  amber: '#fbbf24',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
};

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState("all"); // all, sold, unsold, icon
  const [sortBy, setSortBy] = useState("price_desc"); // price_desc, price_asc, name_asc

  // State for Team Drill-down
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      const url = `${API_URL}/api/tournaments/${id}`;
      console.log("Fetching tournament data from:", url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // The API returns { tournament, teams, players }
        setTournament(data.tournament);
        setTeams(data.teams || []);
        setPlayers(data.players || []);
      }
    } catch (err) {
      console.error("Failed to fetch tournament data:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportTournamentData = () => {
    try {
      const dataToExport = players.map(p => ({
        'Player ID': p._id,
        'Name': p.name,
        'Role': p.role,
        'Base Price': p.basePrice,
        'Status': p.status || (p.team ? 'Sold' : 'Available'),
        'Price Sold': p.soldPrice || 0,
        'Team': p.teamName || 'Unsold',
        'Icon Player': p.isIcon ? 'Yes' : 'No',
        'Year': p.year || 'N/A',
        'Slot': p.teamSlotId || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Auction Roster");
      XLSX.writeFile(wb, `${tournament.name}_Roster.xlsx`);
    } catch (err) {
      console.error("Export Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Auction Data...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Tournament Not Found</h2>
          <button onClick={() => router.push('/auctions')} className="mt-4 text-violet-400 font-bold flex items-center gap-2 mx-auto">
            <ArrowLeft size={18} /> Back to Auctions
          </button>
        </div>
      </div>
    );
  }

  // Derive stats
  const soldPlayers = players.filter(p => p.status === 'sold' || p.team);
  const unsoldPlayers = players.filter(p => !p.team && p.status !== 'sold');
  const totalSpend = soldPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
  const iconPlayers = players.filter(p => p.isIcon);

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white pb-20 selection:bg-violet-500/30">
      
      {/* ── BACKGROUND GLOWS ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-emerald-600/5 blur-[100px] rounded-full"></div>
      </div>

      {/* ── HEADER NAVIGATION ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] bg-[#0a0f18]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push('/auctions')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">All Tournaments</span>
          </button>

          <div className="flex items-center gap-4">
             <button 
               onClick={exportTournamentData}
               className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
               title="Export Roster to Excel"
             >
                <FileDown size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export Roster</span>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8">
        
        {/* ── 1. HERO SECTION (CLEAN AUCTION HEADER) ─────────────────────── */}
        <section className="relative mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 overflow-hidden">
            
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              {/* Simple Tournament Logo */}
              <div className="w-24 h-24 shrink-0 rounded-2xl bg-[#0f172a] flex items-center justify-center overflow-hidden border border-white/10 p-1">
                  <Image 
                    src={tournament.logoUrl || DEFAULT_ASSETS.BANNER_LOGO} 
                    alt={tournament.name}
                    width={96}
                    height={96}
                    className="object-cover rounded-xl"
                    unoptimized
                  />
              </div>

              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                   <span className="px-3 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                     Auction Session
                   </span>
                   {tournament.status !== 'completed' && tournament.status !== 'concluded' ? (
                     <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        Live Auction
                     </span>
                   ) : (
                     <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Draft Concluded
                     </span>
                   )}
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none italic">
                  {tournament.name}
                </h1>
              </div>
            </div>

            <div className="mt-6 md:mt-0 flex gap-4">
               <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Export Data
               </button>
            </div>

          </div>
        </section>

        {/* ── 2. QUICK STATS BAR ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
           {[
             { id: 'teams', label: 'Registered Teams', val: teams.length, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/5' },
             { id: 'players', label: 'Auction Pool', val: players.length - iconPlayers.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/5' },
             { id: 'icons', label: 'Icon Signings', val: iconPlayers.length, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/5' },
             { id: 'sold', label: 'Players Sold', val: soldPlayers.filter(p => !p.isIcon).length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
             { id: 'unsold', label: 'Pool Unsold', val: unsoldPlayers.filter(p => !p.isIcon).length, icon: HelpCircle, color: 'text-rose-400', bg: 'bg-rose-500/5' },
           ].map((stat, i) => (
             <div 
               key={i} 
               onClick={() => {
                 if (['teams', 'players', 'icons', 'sold', 'unsold'].includes(stat.id)) {
                   if (stat.id === 'sold' || stat.id === 'unsold') {
                     setActiveTab('players');
                     setPlayerFilter(stat.id);
                   } else {
                     setActiveTab(stat.id);
                     if (stat.id === 'players') setPlayerFilter('all');
                   }
                   window.scrollTo({ top: 400, behavior: 'smooth' });
                 }
               }}
               className={`p-4 rounded-2xl border border-white/5 ${stat.bg} group hover:border-white/20 transition-all duration-300 cursor-pointer text-center`}
             >
                <div className="flex items-center justify-center mb-1">
                   <div className={`p-1 rounded-lg bg-white/5 ${stat.color}`}>
                      <stat.icon size={14} />
                   </div>
                </div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
                <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
             </div>
           ))}
        </div>

        {/* ── 3. MAIN DASHBOARD LAYOUT (Ribbon + Content) ────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* 🎗️ SIDE RIBBON NAVIGATION */}
          <aside className="lg:sticky lg:top-8 w-full lg:w-20 shrink-0 flex lg:flex-col gap-2 p-2 bg-slate-900 border border-white/5 rounded-[2rem] z-20">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Analytics' },
              { id: 'teams', icon: Users, label: 'Teams' },
              { id: 'players', icon: ListChecks, label: 'Pool' },
              { id: 'icons', icon: Star, label: 'Icons' },
              { id: 'history', icon: History, label: 'Log' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative group flex flex-col items-center justify-center w-full aspect-square lg:h-16 rounded-2xl transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-xl' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={22} />
                <span className="text-[8px] font-black uppercase mt-1 hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </aside>

          {/* 🖼️ CONTENT AREA */}
          <div className="flex-1 w-full min-h-[800px]">
            
            {/* 🔍 CONTEXTUAL SEARCH (Only for lists) */}
            {(activeTab === 'players' || activeTab === 'teams') && (
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="text" 
                      placeholder={`Find ${activeTab === 'players' ? 'Players' : 'Teams'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 bg-slate-900 border border-white/5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-white/20 transition-all"
                    />
                 </div>
                 {activeTab === 'players' && (
                   <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/5 rounded-2xl">
                        {['all', 'sold', 'unsold'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setPlayerFilter(f)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                              ${playerFilter === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-400'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="h-14 px-5 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-white/20 transition-all cursor-pointer"
                      >
                         <option value="price_desc">Price: High to Low</option>
                         <option value="price_asc">Price: Low to High</option>
                         <option value="name_asc">Name: A-Z</option>
                      </select>
                   </div>
                 )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TEAMS GRID
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'teams' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((team) => {
                  const teamPlayers = players.filter(p => (p.team?._id || p.team) === team._id);
                  const teamSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
                  const teamBudget = team.budget || tournament.baseBudget || 50000;
                  const remaining = teamBudget - teamSpent;
                  
                  return (
                    <div 
                      key={team._id} 
                      onClick={() => setSelectedTeam(team)}
                      className="group relative bg-slate-900 border border-white/5 rounded-2xl p-4 transition-all hover:bg-slate-800 hover:border-violet-500/30 cursor-pointer overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 blur-[40px] pointer-events-none group-hover:bg-violet-600/10 transition-all"></div>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 p-1 group-hover:scale-105 transition-transform">
                            <img src={team.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`} className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <div className="min-w-0">
                           <h3 className="text-sm font-black text-white uppercase italic truncate tracking-tighter">{team.name}</h3>
                           <div className="flex items-center gap-1 mt-0.5">
                              <Users size={8} className="text-slate-500" />
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                {teamPlayers.length} Players
                              </span>
                           </div>
                        </div>
                      </div>
    
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-center">
                           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Spent</p>
                           <p className="text-xs font-black text-emerald-400 tabular-nums">₹{teamSpent.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-center">
                           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Purse</p>
                           <p className="text-xs font-black text-white tabular-nums">₹{remaining.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
    
                      <button className="w-full py-2 bg-white/5 group-hover:bg-violet-600 text-[8px] font-black text-slate-500 group-hover:text-white rounded-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                         View Squad <ChevronRight size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                PLAYER POOL (Excluding Icons)
            ───────────────────────────────────────────────────────────── */}
            {(activeTab === 'players' || activeTab === 'icons') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {players
                   .filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const isIcon = p.isIcon;
                      const matchesTab = activeTab === 'icons' ? isIcon : (activeTab === 'players' ? !isIcon : true);
                      if (playerFilter === 'sold') return matchesSearch && matchesTab && (p.status === 'sold' || p.team);
                      if (playerFilter === 'unsold') return matchesSearch && matchesTab && !p.team;
                      return matchesSearch && matchesTab;
                   })
                   .sort((a, b) => {
                      if (sortBy === 'price_desc') return (b.soldPrice || b.basePrice) - (a.soldPrice || a.basePrice);
                      if (sortBy === 'price_asc') return (a.soldPrice || a.basePrice) - (b.soldPrice || b.basePrice);
                      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
                      return 0;
                   })
                   .map((p) => (
                    <div key={p._id} className="group bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all relative">
                      {p.isIcon && (
                        <div className="absolute top-3 right-3 z-10 p-1 bg-amber-500 text-slate-900 rounded shadow-xl">
                           <Star size={12} className="fill-current" />
                        </div>
                      )}
                      
                      <div className="aspect-[1/1.2] relative overflow-hidden bg-slate-800">
                         {/* Year Badge */}
                         {p.year && (
                           <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-violet-600/90 backdrop-blur-md text-[8px] font-black text-white rounded-md uppercase tracking-widest border border-white/10 shadow-xl">
                              {p.year}{p.year === 1 ? 'st' : p.year === 2 ? 'nd' : p.year === 3 ? 'rd' : 'th'} Year
                           </div>
                         )}
                         
                         <Image 
                           src={p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                           alt={p.name}
                           fill
                           className="object-cover group-hover:scale-110 transition-transform duration-700"
                           unoptimized
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
                         
                         <div className="absolute bottom-3 left-3 right-3 text-center">
                            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-0.5">{p.role}</p>
                            <h4 className="text-sm font-black text-white uppercase italic tracking-tighter truncate">{p.name}</h4>
                         </div>
                      </div>

                      <div className="p-4 text-center h-full flex flex-col justify-between">
                         <div className="mb-2">
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Base Price</p>
                            <p className="text-base font-black text-white">₹{Number(p.basePrice).toLocaleString('en-IN')}</p>
                         </div>

                          <div className="py-2 border-y border-white/10 mb-4 min-h-[50px] flex flex-col items-center justify-center">
                            {p.teamName ? (
                              <div className="space-y-1">
                                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Sold To</p>
                                 <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-lg flex items-center justify-center text-[7px] font-black text-white ${p.isIcon ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}>
                                       {p.teamName?.charAt(0) || 'T'}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase italic tracking-tighter ${p.isIcon ? 'text-amber-500' : 'text-emerald-400'}`}>
                                      {p.teamName}
                                    </span>
                                 </div>
                                 <p className="text-[10px] font-black text-white tabular-nums">₹{Number(p.soldPrice).toLocaleString('en-IN')}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic animate-pulse">Awaiting Bid</span>
                            )}
                          </div>
                         
                         <div className="flex items-center justify-between mb-3 text-left">
                            <div className="min-w-0 flex-1">
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Availability</p>
                               <div className="flex items-center gap-1.5">
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter inline-block ${p.team ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                                   {p.team ? 'DRAFTED' : 'OPEN'}
                                 </span>
                                 {p.teamSlotId && (
                                   <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                     {p.teamSlotId}
                                   </span>
                                 )}
                               </div>
                            </div>
                            <div className="text-right shrink-0">
                               <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{p.isIcon ? 'Designation' : (p.team ? 'Value' : 'Pool')}</p>
                               <p className={`text-[11px] font-black ${p.isIcon ? 'text-amber-400' : (p.team ? 'text-emerald-400' : 'text-slate-400')}`}>
                                 {p.isIcon ? 'ICON' : (p.team ? '₹' + Number(p.soldPrice).toLocaleString('en-IN') : 'Auction')}
                               </p>
                            </div>
                         </div>

                          <button className="w-full py-2 bg-white/5 hover:bg-violet-600/20 text-white border border-white/5 hover:border-violet-500/50 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">
                             Full Stats
                          </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                BID HISTORY / TIMELINE
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="relative border-l-2 border-white/5 ml-10 space-y-12">
                    {soldPlayers.slice(0, 15).map((p, i) => (
                      <div key={i} className="relative pl-12 group">
                         <div className="absolute left-[-26px] top-0 w-12 h-12 rounded-[1.2rem] bg-[#0a0f18] border-4 border-slate-900 shadow-xl flex items-center justify-center z-10 group-hover:border-violet-500/50 transition-colors">
                            <CheckCircle size={20} className="text-emerald-400" />
                         </div>

                         <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group-hover:border-violet-500/20 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                               <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-slate-800">
                                     <img src={p.photo?.s3 || p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-left">
                                     <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${p.isIcon ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {p.isIcon ? 'ICON PLAYER' : `SOLD FOR ₹${p.soldPrice?.toLocaleString('en-IN')}`}
                                     </p>
                                     <h4 className="text-2xl font-black text-white uppercase italic">{p.name}</h4>
                                     <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Acquired by <span className="text-white font-black">{p.teamName || 'Team'}</span></p>
                                  </div>
                               </div>

                               <div className="flex items-center gap-8 text-right">
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Level</p>
                                     <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                                        {p.isIcon ? 'Icon' : 'Auction Pool'}
                                     </span>
                                  </div>
                                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                                     <ChevronRight size={20} className="text-slate-600" />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                OVERVIEW DASHBOARD (ELITE TOP 5)
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
               <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="max-w-5xl mx-auto py-4">
                     <div className="bg-slate-900 border border-white/5 rounded-[3.5rem] p-12 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-violet-600/5 blur-[150px] pointer-events-none"></div>
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 relative z-10">
                           <div>
                              <h2 className="text-[12px] font-black text-violet-500 uppercase tracking-[0.5em] mb-4">Auction Masterclass</h2>
                              <h1 className="text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">Top 5 Elite</h1>
                           </div>
                           <div className="flex gap-4 p-3 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                              <div className="px-8 py-3 text-center border-r border-white/5 last:border-0">
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Peak Hammer Price</p>
                                 <p className="text-2xl font-black text-white tabular-nums">
                                    ₹{players.length > 0 ? Math.max(...players.map(p => p.soldPrice || 0)).toLocaleString('en-IN') : '0'}
                                 </p>
                              </div>
                              <div className="px-8 py-3 text-center">
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assets Drafted</p>
                                 <p className="text-2xl font-black text-emerald-400 tabular-nums">{soldPlayers.length}</p>
                              </div>
                           </div>
                        </div>

                        {/* Leaderboard Elite Cards */}
                        <div className="space-y-8 relative z-10">
                           {players
                             .filter(p => (p.status === 'sold' || p.team))
                             .sort((a,b) => (b.soldPrice || 0) - (a.soldPrice || 0))
                             .slice(0, 5)
                             .map((p, i) => (
                              <div key={i} className="group relative flex flex-col md:flex-row items-center gap-10 p-8 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-violet-500/30 rounded-[3rem] transition-all duration-700 cursor-default">
                                 <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center font-black italic text-3xl transition-all shadow-2xl
                                   ${i === 0 ? 'bg-amber-500 text-slate-900 scale-125' : 'bg-slate-800 text-slate-500'}`}>
                                    #{i + 1}
                                 </div>

                                 <div className="w-40 h-40 shrink-0 rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-slate-950 shadow-2xl group-hover:scale-105 transition-transform duration-1000">
                                    <img 
                                      src={p.photo?.s3 || p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                                      alt={p.name}
                                      className="w-full h-full object-cover transition-all"
                                    />
                                 </div>

                                 <div className="flex-1 min-w-0 text-center md:text-left">
                                    <p className="text-[12px] font-black text-violet-500 uppercase tracking-[0.5em] mb-3">{p.teamName}</p>
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4 group-hover:text-blue-400 transition-colors truncate">
                                       {p.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                       <span className="px-4 py-1.5 bg-white/5 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0 border border-white/10">
                                          {p.role}
                                       </span>
                                       {p.isIcon && (
                                          <span className="px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-tighter leading-none shrink-0 border border-amber-500/20">
                                             Icon Asset
                                          </span>
                                       )}
                                    </div>
                                 </div>

                                 <div className="text-center md:text-right shrink-0">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Acquisition Price</p>
                                    <p className="text-5xl font-black text-white tabular-nums tracking-tighter group-hover:text-emerald-400 transition-colors">
                                       ₹{p.soldPrice?.toLocaleString('en-IN')}
                                    </p>
                                 </div>
                              </div>
                             ))}

                           {players.filter(p => (p.status === 'sold' || p.team)).length === 0 && (
                              <div className="py-24 text-center">
                                 <p className="text-sm font-black text-slate-600 uppercase tracking-[0.6em] italic animate-pulse">Waiting for Bidding Data...</p>
                              </div>
                           )}
                        </div>

                        <div className="mt-16 pt-10 border-t border-white/5">
                           <button 
                             onClick={() => setActiveTab('players')}
                             className="w-full py-6 bg-white/5 border border-white/10 rounded-3xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                           >
                              Explore Entire Auction Roster <ArrowRight size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

          </div> {/* CLOSE CONTENT AREA */}
        </div> {/* CLOSE MAIN DASHBOARD LAYOUT */}
      </main>

      {/* ── 5. TEAM DRILL-DOWN MODAL ────────────────────────────────────── */}
      {selectedTeam && (
        <TeamDetailsModal 
          team={selectedTeam} 
          tournament={tournament}
          players={players.filter(p => (p.team?._id || p.team) === selectedTeam._id)}
          onClose={() => setSelectedTeam(null)} 
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEAM DETAILS MODAL COMPONENT
// ─────────────────────────────────────────────────────────────
function TeamDetailsModal({ team, players, tournament, onClose }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadSquad = async () => {
    try {
      setIsExporting(true);
      
      const loadImage = (url) => {
        return new Promise((resolve) => {
          const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
          const img = new (window.Image || Image)();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve(dataUrl);
            } catch (e) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = proxyUrl;
        });
      };

      const doc = new jsPDF();
      
      // 1. STYLISH HEADER
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`${team.name.toUpperCase()}`, 14, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`OFFICIAL SQUAD ROSTER | ${tournament?.name || 'Tournament'}`, 14, 33);
      
      // 2. LOAD IMAGES ASYNC (Using Proxy)
      const squadToExport = players.slice(0, 35);
      const imageDataUrls = await Promise.all(squadToExport.map(p => {
        const url = p.photo?.s3 || p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}`;
        return loadImage(url);
      }));

      // 3. GENERATE TABLE
      const tableData = squadToExport.map((p, index) => [
        index + 1,
        '', 
        p.name.toUpperCase(),
        p.role.toUpperCase(),
        p.isIcon ? 'ICON' : `INR ${p.soldPrice?.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['#', 'PLAYER', 'PLAYER NAME', 'ROLE', 'PRICE']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [124, 58, 237], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 25 }, // Expanded for "PLAYER" heading
          2: { halign: 'center' }, // Centered name
          3: { halign: 'center' }, // Centered role
          4: { halign: 'center', fontStyle: 'bold' } // Centered price
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 4, 
          valign: 'middle',
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawCell: (data) => {
          if (data.column.index === 1 && data.section === 'body') {
            const dataUrl = imageDataUrls[data.row.index];
            if (dataUrl) {
              const size = 26; // Much larger size
              const x = data.cell.x + (data.cell.width - size) / 2;
              const y = data.cell.y + (data.cell.height - size) / 2;
              doc.addImage(dataUrl, 'JPEG', x, y, size, size);
            } else {
              doc.setDrawColor(226, 232, 240);
              doc.circle(data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, 8, 'S');
            }
          }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            data.row.height = 30; // Increased row height to fit large photos
          }
        }
      });

      doc.save(`${team.name.replace(/\s+/g, '_')}_Official_Squad.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0a0f18]/95 backdrop-blur-3xl animate-in fade-in transition-all">
       <div className="bg-[#111827] border border-white/10 rounded-[3rem] w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col relative">
          
          <div className="absolute top-8 right-8 z-50 flex items-center gap-3">
             <button 
               onClick={handleDownloadSquad}
               disabled={isExporting}
               className={`p-3 rounded-full transition-all border border-white/10 shadow-xl shadow-black/50 group flex items-center justify-center
                 ${isExporting 
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed' 
                    : 'bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`}
               title="Download Squad PDF"
             >
               {isExporting ? (
                 <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
               ) : (
                 <FileDown size={22} className="group-hover:scale-110 transition-transform" />
               )}
             </button>
             <button 
               onClick={onClose}
               className="p-3 bg-white/5 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-all border border-white/10 shadow-xl shadow-black/50"
             >
               <X size={24} />
             </button>
          </div>

          <div className="p-10 border-b border-white/5 relative overflow-hidden bg-white/[0.01]">
             <div className="absolute top-0 right-10 opacity-5 pointer-events-none">
                <Users size={200} />
             </div>
             
             <div className="flex items-center gap-8 relative z-10">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-white/10 p-1.5 shadow-2xl">
                   <div className="w-full h-full rounded-[1.7rem] overflow-hidden bg-slate-800">
                      <img src={team.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`} className="w-full h-full object-cover" />
                   </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.5em] mb-2 leading-none">Roster Intelligence</p>
                  <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">{team.name}</h2>
                  <div className="flex items-center gap-6 mt-4">
                     <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-400">
                        Spent: <span className="text-emerald-400">₹{players.reduce((s,p) => s + (p.soldPrice || 0), 0).toLocaleString('en-IN')}</span>
                     </div>
                     <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-400">
                        Purse: <span className="text-white">₹{((team.budget || tournament.baseBudget || 50000) - players.reduce((s,p) => s + (p.soldPrice || 0), 0)).toLocaleString('en-IN')}</span>
                     </div>
                  </div>
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
             
             <div className="w-full md:w-80 border-r border-white/5 bg-black/20 p-8 flex-shrink-0">
                <div className="space-y-8">
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Purse Usage</p>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-violet-600 rounded-full" style={{ width: `${(players.reduce((s,p) => s + (p.soldPrice || 0), 0) / (team.budget || tournament.baseBudget || 50000)) * 100}%` }}></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-600">{Math.round((players.reduce((s,p) => s + (p.soldPrice || 0), 0) / (team.budget || tournament.baseBudget || 50000)) * 100)}% of budget utilized</p>
                   </div>
                   
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Squad Balance</p>
                      <div className="space-y-2">
                         {['Batsman', 'Bowler', 'All-Rounder'].map(role => (
                            <div key={role} className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-white/5 p-3 px-5 rounded-2xl border border-white/5">
                               <span>{role}</span>
                               <span className="text-white">{players.filter(p => p.role?.toLowerCase() === role.toLowerCase()).length}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-900/40">
                <div className="grid grid-cols-1 gap-3">
                   {players.length === 0 ? (
                     <div className="py-20 text-center opacity-30 italic font-medium">No players in squad.</div>
                   ) : (
                     players.map((p, i) => (
                       <div key={i} className="flex items-center gap-6 p-4 px-6 bg-slate-950/50 border border-white/5 rounded-[2rem] hover:border-violet-500/30 transition-all group">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-slate-900 shadow-inner group-hover:scale-105 transition-transform">
                             <img src={p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                             <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-0.5">{p.role}</p>
                             <h4 className="text-lg font-black text-white hover:text-violet-400 transition-colors uppercase italic truncate tracking-tight">{p.name}</h4>
                          </div>

                          <div className="flex flex-col items-end justify-center px-6">
                             <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">
                                {p.isIcon ? 'Designation' : 'Price'}
                             </p>
                             <p className={`text-lg font-black leading-none italic ${p.isIcon ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {p.isIcon ? 'ICON' : `₹${p.soldPrice?.toLocaleString('en-IN')}`}
                             </p>
                          </div>

                          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                             <ChevronRight size={18} className="text-slate-600" />
                          </button>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
