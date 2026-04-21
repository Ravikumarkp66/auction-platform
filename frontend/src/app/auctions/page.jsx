"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Trophy, Play, Users, Calendar, ExternalLink, Clock, XCircle } from "lucide-react";
import { API_URL, DEFAULT_ASSETS } from "@/lib/apiConfig";

export default function AuctionsPage() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [squadViewTournament, setSquadViewTournament] = useState(null);

  useEffect(() => {
    fetchTournaments();
    
    // Safety timeout — if fetch hangs, force loading to false after 5s
    const safetyTimer = setTimeout(() => setLoading(false), 5000);
    
    // Poll every 60 seconds for new tournaments
    const interval = setInterval(fetchTournaments, 60000);
    
    return () => {
      clearTimeout(safetyTimer);
      clearInterval(interval);
    };
  }, []);

  const fetchTournaments = async () => {
    try {
      // Use a timeout to avoid hanging forever
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      console.log(`Fetching tournaments from: ${API_URL}/api/tournaments`);
      
      const response = await fetch(`${API_URL}/api/tournaments`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error("Backend returned error:", response.status, errorText);
        throw new Error(`Failed to fetch tournaments: ${response.status}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn("Tournament fetch timed out — using demo data");
      } else {
        console.error("Error fetching tournaments:", err);
      }
      // Use mock data when backend fails
      const mockTournaments = [
        {
          _id: "1",
          name: "PC-26 Cricket Auction",
          date: "2024-03-20",
          location: "Bangalore",
          status: "upcoming",
          teams: 8,
          totalPlayers: 50,
          basePrice: 1000
        },
        {
          _id: "2", 
          name: "Summer Cricket League",
          date: "2024-04-15",
          location: "Mumbai",
          status: "ongoing",
          teams: 6,
          totalPlayers: 40,
          basePrice: 800
        }
      ];
      setTournaments(mockTournaments);
      setError("Using demo data - backend connection failed");
    } finally {
      setLoading(false); // Always clear loading
    }
  };

  const getStatusColor = (status, isConcluded = false) => {
    if (isConcluded) {
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
    switch (status?.toLowerCase()) {
      case "active":
      case "live":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "upcoming":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusLabel = (status, tournamentName) => {
    // Show LIVE if status is active or live
    const isActive = (status?.toLowerCase() === "active" || status?.toLowerCase() === "live");
    
    if (!isActive && status?.toLowerCase() !== "upcoming") {
      return "CONCLUDED";
    }
    
    // Otherwise show actual status
    switch (status?.toLowerCase()) {
      case "active":
      case "live":
        return "LIVE";
      case "upcoming":
        return "UPCOMING";
      case "completed":
        return "COMPLETED";
      default:
        return status || "Unknown";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "live":
        return <Play className="w-4 h-4" />;
      case "upcoming":
        return <Calendar className="w-4 h-4" />;
      case "completed":
        return <Trophy className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading live auctions...</div>
      </div>
    );
  }

  const liveTournaments = tournaments.filter(t => 
    (t.status?.toLowerCase() === "active" || t.status?.toLowerCase() === "live")
  );
  
  const otherTournaments = tournaments.filter(t => 
    t.status?.toLowerCase() !== "active" && t.status?.toLowerCase() !== "live"
  );

  return (
    <div className="min-h-screen bg-[#0a0f18] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.15)_0%,_transparent_50%)]"></div>
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-violet-900/20 to-transparent"></div>
      
      {/* Hero Section - Broadcast Style */}
      <div className="relative z-10 pt-8 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Organizer Badge - Relative on mobile, Absolute on desktop */}
          <div className="flex justify-center md:absolute md:top-8 md:right-8 mb-8 md:mb-0">
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)] bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur-sm relative">
              <Image 
                src={liveTournaments[0]?.organizerLogo ? `${API_URL}${liveTournaments[0].organizerLogo}` : DEFAULT_ASSETS.BANNER_LOGO} 
                alt={liveTournaments[0]?.name || "Organizer Logo"}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>
          
          {/* Live Indicator + Title Row */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-full">
              <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              <span className="text-red-400 font-black uppercase tracking-[0.2em] text-[10px] md:text-sm">Live Now</span>
            </div>
          </div>
          
          {/* Main Title */}
          <div className="text-center mb-4">
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-black text-white uppercase tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-tight">
              {liveTournaments[0]?.name || "Live Auctions"}
            </h1>
            <p className="text-violet-400 text-lg md:text-2xl font-bold uppercase tracking-[0.3em] mt-2">
              {liveTournaments[0] ? "Tournament Live" : "Portal"}
            </p>
          </div>
          
          {/* Subtitle */}
          <p className="text-center text-slate-400 text-sm md:text-xl max-w-2xl mx-auto mb-8 px-4">
            ⚡ Live Cricket Auction • Real-time bidding • Real teams • Real pressure
          </p>
          
          {/* CTA Button */}
          {liveTournaments.length > 0 && (
            <div className="flex justify-center mb-12">
              <Link
                href={status === "authenticated" ? `/live-auction?id=${liveTournaments[0].shortId || liveTournaments[0]._id}&role=admin` : `/overlay`}
                className="group relative px-6 py-4 md:px-10 md:py-5 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider text-base md:text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                  Enter Live Auction
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={fetchTournaments}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors text-sm"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Live Auctions */}
        {liveTournaments.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">Live Auctions</h2>
              <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium">
                LIVE NOW
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {liveTournaments.map((tournament) => (
                <div 
                  key={tournament._id} 
                  className="relative group bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-violet-500/30 overflow-hidden transition-all duration-500 hover:border-violet-500/60 hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
                  
                  {/* Live Indicator */}
                  <div className="relative bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-b border-red-500/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-red-400 font-black uppercase tracking-wider text-sm">🔴 Live Auction</span>
                      </div>
                      <span className="text-slate-500 text-sm font-mono">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Tournament Info */}
                  <div className="relative p-6">
                    <h3 className="text-2xl font-black text-white uppercase tracking-wide mb-1">
                      🏏 {tournament.name}
                    </h3>
                    <p className="text-violet-400/80 text-sm font-bold uppercase tracking-wider mb-6">
                      Live Cricket Auction
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 md:p-3 text-center">
                        <div className="text-xl md:text-2xl font-black text-white">{tournament.numTeams || 0}</div>
                        <div className="text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Teams</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 md:p-3 text-center">
                        <div className="text-xl md:text-2xl font-black text-violet-400">{tournament.playerCount || tournament.players?.length || 0}</div>
                        <div className="text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Players</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 md:p-3 text-center">
                        <div className="text-xl md:text-2xl font-black text-amber-400">{tournament.iconCount || tournament.players?.filter(p => p.isIcon).length || 0}</div>
                        <div className="text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Icons</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={status === "authenticated" ? `/live-auction?id=${tournament.shortId || tournament._id}&role=admin` : `/overlay`}
                        className="group/btn relative flex-[2_1_0%] min-w-[120px] px-4 py-3 md:py-4 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider text-xs md:text-base rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                          Watch
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-violet-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </Link>

                      <button
                        onClick={() => setSquadViewTournament(tournament)}
                        className="flex-1 min-w-[100px] px-3 py-3 md:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-wider text-xs md:text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/squad"
                      >
                        <Users className="w-4 h-4 md:w-5 md:h-5 group-hover:text-violet-400 transition-colors" />
                        Squads
                      </button>

                      <Link
                        href={`/tournaments/${tournament._id}`}
                        className="flex-1 min-w-[100px] px-3 py-3 md:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-wider text-xs md:text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/details"
                      >
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5 group-hover/details:text-blue-400 transition-colors" />
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- SQUAD VIEW MODAL --- */}
        {squadViewTournament && (
          <SquadViewModal 
            tournament={squadViewTournament} 
            onClose={() => setSquadViewTournament(null)} 
          />
        )}

        {/* Other Tournaments */}
        {otherTournaments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Other Tournaments</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTournaments.map((tournament) => {
                const isConcluded = tournament.status?.toLowerCase() === "completed" || 
                                   (tournament.status?.toLowerCase() !== "active" && tournament.status?.toLowerCase() !== "live" && tournament.status?.toLowerCase() !== "upcoming");
                const statusLabel = getStatusLabel(tournament.status, tournament.name);
                
                return (
                  <Link 
                    href={`/tournaments/${tournament._id}`}
                    key={tournament._id} 
                    className="block group h-full"
                  >
                    <div className="bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-slate-700/50 hover:border-violet-500/30 p-6 transition-all duration-300 h-full flex flex-col hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest ${getStatusColor(tournament.status, isConcluded)}`}>
                          {isConcluded ? <XCircle className="w-3 h-3" /> : getStatusIcon(tournament.status)}
                          {statusLabel}
                        </div>
                        <Trophy className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
                      </div>
                      
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-violet-400 transition-colors">
                        {tournament.name}
                      </h3>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                        {tournament.organizerName || "Cricket Tournament"}
                      </p>
                      
                      <div className="flex items-center gap-4 mb-6 mt-auto text-xs font-black uppercase tracking-wider text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-violet-500" />
                          <span>{tournament.numTeams || 0} Teams</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{tournament.players?.length || 0} Players</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                          {new Date(tournament.createdAt).toLocaleDateString()}
                        </p>
                        <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* No Live Tournaments */}
        {liveTournaments.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="w-20 h-20 border-4 border-violet-500/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">
                Waiting for Auctioneer to Start Auction
              </h2>
              
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                No live auctions are currently in progress. Please wait for the auctioneer to start the next tournament.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Clock className="w-5 h-5" />
                <span className="text-sm">
                  Live auctions will appear here when they start
                </span>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="mt-12">
              <button 
                onClick={fetchTournaments}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors inline-flex items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                Refresh for Live Auctions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HELPERS ────────────────────────────────────────────────
function SquadList({ team, players }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
         <Users className="w-4 h-4 text-violet-400" />
         <h4 className="text-sm font-black text-white uppercase tracking-widest">{team.name} Squad</h4>
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {players.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-40 italic text-xs">No players drafted yet</div>
        ) : (
          players.map((p, idx) => (
            <div key={p._id || idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group/p hover:border-violet-500/30 transition-all">
               <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img src={p.photo?.s3 || p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{p.role} • {p.village}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black text-emerald-400">₹{Number(p.soldPrice || p.basePrice || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{p.isIcon ? 'Icon' : 'Auction'}</p>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SquadViewModal({ tournament, onClose }) {
  const [data, setData] = useState({ teams: [], players: [] });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSquads() {
      try {
        const res = await fetch(`${API_URL}/api/tournaments/${tournament._id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.teams?.length > 0) setSelectedTeam(json.teams[0]);
        } else {
          console.error("Failed to fetch squad details:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch squads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSquads();
  }, [tournament]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in">
       <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col relative">
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-8 z-20 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all shadow-inner border border-white/5"
          >
            <XCircle className="w-6 h-6" />
          </button>

          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.4em] mb-1">Squad Database</p>
            <h2 className="text-3xl font-black text-white tracking-tight text-left transform-none">{tournament.name}</h2>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-full md:w-80 border-r border-white/5 overflow-y-auto p-4 space-y-2 bg-black/20">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3">Teams</p>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-16 w-full animate-pulse bg-white/5 rounded-2xl border border-white/5" />
                ))
              ) : (
                data.teams.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTeam(t)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group
                      ${selectedTeam?._id === t._id 
                        ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10' 
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'}`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                       <img src={t.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                       <p className={`text-sm font-black truncate ${selectedTeam?._id === t._id ? 'text-white' : 'text-slate-300'}`}>{t.name}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {data.players?.filter(p => p.team === t._id).length} Players
                       </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8">
               {loading ? (
                 <div className="space-y-4">
                    <div className="h-8 w-48 animate-pulse bg-white/5 rounded-lg" />
                    <div className="grid grid-cols-1 gap-2">
                       {Array(5).fill(0).map((_, i) => (
                         <div key={i} className="h-20 w-full animate-pulse bg-white/5 rounded-xl border border-white/5" />
                       ))}
                    </div>
                 </div>
               ) : selectedTeam ? (
                 <SquadList 
                    team={selectedTeam} 
                    players={data.players.filter(p => p.team === selectedTeam._id)} 
                 />
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">
                    Select a team to view their roster
                 </div>
               )}
            </div>
          </div>
       </div>
    </div>
  );
}
