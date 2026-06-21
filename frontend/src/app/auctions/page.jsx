"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Trophy, Play, Users, Calendar, ExternalLink, Clock, XCircle, X, Download, Phone, MapPin, Activity, User, Shield, DollarSign } from "lucide-react";
import html2canvas from "html2canvas";
import { API_URL, DEFAULT_ASSETS, getMediaUrl, getProxiedImageUrl, calculateAge } from "../../lib/apiConfig";

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
      }];

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
    const isActive = status?.toLowerCase() === "active" || status?.toLowerCase() === "live";

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
      </div>);

  }

  const liveTournaments = tournaments.filter((t) =>
  t.status?.toLowerCase() === "active" || t.status?.toLowerCase() === "live"
  );

  const otherTournaments = tournaments.filter((t) =>
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
                src={getMediaUrl(liveTournaments[0]?.organizerLogo)}
                alt={liveTournaments[0]?.name || "Organizer Logo"}
                fill
                className="object-cover"
                unoptimized
                priority />
              
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
          {liveTournaments.length > 0 &&
          <div className="flex justify-center mb-12">
              <Link
              href={session?.user?.role?.toLowerCase() === "admin" ? `/live-auction?id=${liveTournaments[0].shortId || liveTournaments[0]._id}&role=admin` : `/overlay`}
              className="group relative px-6 py-4 md:px-10 md:py-5 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider text-base md:text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]">
              
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                  {session?.user?.role?.toLowerCase() === "admin" ? "Start Auction" : "Enter Live Auction"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          }
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
        {/* Error State */}
        {error &&
        <div className="mb-8 bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button
            onClick={fetchTournaments}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors text-sm">
            
              Retry Connection
            </button>
          </div>
        }

        {/* Live Auctions */}
        {liveTournaments.length > 0 &&
        <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">Live Auctions</h2>
              <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium">
                LIVE NOW
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {liveTournaments.map((tournament) =>
            <div
              key={tournament._id}
              className="relative group bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-violet-500/30 overflow-hidden transition-all duration-500 hover:border-violet-500/60 hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              
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
                        <div className="text-xl md:text-2xl font-black text-amber-400">{tournament.iconCount || tournament.players?.filter((p) => p.isIcon).length || 0}</div>
                        <div className="text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Icons</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                    href={session?.user?.role?.toLowerCase() === "admin" ? `/live-auction?id=${tournament.shortId || tournament._id}&role=admin` : `/overlay`}
                    className="group/btn relative flex-[2_1_0%] min-w-[120px] px-4 py-3 md:py-4 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider text-xs md:text-base rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2">
                    
                        <span className="relative z-10 flex items-center gap-2">
                          <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                          {session?.user?.role?.toLowerCase() === "admin" ? "Start Auction" : "Watch"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-violet-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </Link>

                      <button
                    onClick={() => setSquadViewTournament(tournament)}
                    className="flex-1 min-w-[100px] px-3 py-3 md:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-wider text-xs md:text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/squad">
                    
                        <Users className="w-4 h-4 md:w-5 md:h-5 group-hover:text-violet-400 transition-colors" />
                        Squads
                      </button>

                      <Link
                    href={`/tournaments/${tournament._id}`}
                    className="flex-1 min-w-[100px] px-3 py-3 md:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-wider text-xs md:text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/details">
                    
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5 group-hover/details:text-blue-400 transition-colors" />
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
            )}
            </div>
          </section>
        }

        {/* --- SQUAD VIEW MODAL --- */}
        {squadViewTournament &&
        <SquadViewModal
          tournament={squadViewTournament}
          onClose={() => setSquadViewTournament(null)} />

        }

        {/* Other Tournaments */}
        {otherTournaments.length > 0 &&
        <section>
            <h2 className="text-2xl font-bold text-white mb-6">Other Tournaments</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTournaments.map((tournament) => {
              const isConcluded = tournament.status?.toLowerCase() === "completed" ||
              tournament.status?.toLowerCase() !== "active" && tournament.status?.toLowerCase() !== "live" && tournament.status?.toLowerCase() !== "upcoming";
              const statusLabel = getStatusLabel(tournament.status, tournament.name);

              return (
                <Link
                  href={`/tournaments/${tournament._id}`}
                  key={tournament._id}
                  className="block group h-full">
                  
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
                  </Link>);

            })}
            </div>
          </section>
        }

        {/* No Live Tournaments */}
        {liveTournaments.length === 0 && !error &&
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
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors inline-flex items-center gap-2">
              
                <Clock className="w-5 h-5" />
Refresh for Live Auctions
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}

// ── HELPERS ────────────────────────────────────────────────
function SquadList({ team, players, onPlayerClick, onDownload, isDownloading }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
         <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-widest">{team.name} Squad</h4>
         </div>
         {players.length > 0 && (
           <button
             onClick={onDownload}
             disabled={isDownloading}
             className="px-3 py-1.5 bg-violet-600/35 hover:bg-violet-600/50 border border-violet-500/30 text-white font-black uppercase tracking-wider text-[10px] rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
           >
             <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
             {isDownloading ? "Generating..." : "Download Poster"}
           </button>
         )}
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {players.length === 0 ?
        <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-40 italic text-xs">No players drafted yet</div> :

        players.map((p, idx) =>
        <div 
          key={p._id || idx} 
          onClick={() => onPlayerClick && onPlayerClick(p)}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group/p hover:border-violet-500/30 hover:bg-white/[0.07] transition-all cursor-pointer"
        >
               <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img src={getMediaUrl(p.photo?.s3 || p.imageUrl || p.image, `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`)} className="w-full h-full object-cover" alt="" />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{p.role} • {p.village || p.town || "---"}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black text-emerald-400">₹{Number(p.soldPrice || p.basePrice || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{p.isIcon ? 'Icon' : 'Auction'}</p>
               </div>
            </div>
        )
        }
      </div>
    </div>);

}

function SquadViewModal({ tournament, onClose }) {
  const [data, setData] = useState({ teams: [], players: [] });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
    const handleEsc = (e) => {if (e.key === 'Escape') onClose();};
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getBase64FromUrl = async (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return url;
    try {
      const targetUrl = url.startsWith('http') && !url.includes(API_URL) ? getProxiedImageUrl(url) : getMediaUrl(url);
      const res = await fetch(targetUrl);
      if (!res.ok) return null;
      
      const blob = await res.blob();
      if (blob.type.includes('pdf')) {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8wOC8xOFR968AAAAAYdEVYdFNvZnR3YXJlAEFkb2JlIEM2IEltYWdlUmVhZHm7mNoAAAAtSURBVHic7cExAQAAAMKg9U9tCy+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+DAx9AAH5XU8AAAAAAElFTkSuQmCC";
      }

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Base64 conversion failed:", err);
      return null;
    }
  };

  const downloadSquad = async () => {
    if (!selectedTeam) return;
    const element = document.getElementById("squad-download");
    if (!element) return;
    
    setIsDownloading(true);
    element.style.display = "block";
    
    try {
      const imgs = element.getElementsByTagName("img");
      const originalSrcs = [];
      
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        originalSrcs.push({ img, src: img.src });
        const base64 = await getBase64FromUrl(img.src);
        if (base64) {
          img.src = base64;
        }
      }

      const canvas = await html2canvas(element, {
        backgroundColor: "#020617",
        scale: 1.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        imageTimeout: 0
      });

      const link = document.createElement("a");
      link.download = `${selectedTeam.name || 'squad'}.png`;
      link.href = canvas.toDataURL("image/png", 0.8);
      link.click();

      for (const item of originalSrcs) {
        item.img.src = item.src;
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      element.style.display = "none";
      setIsDownloading(false);
    }
  };

  const squadBg = data.tournament?.assets?.squadBgUrl || DEFAULT_ASSETS.SQUAD_BG;
  const squadPlayers = selectedTeam ? data.players.filter((p) => String(p.team) === String(selectedTeam._id) || p.team === selectedTeam.name) : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in">
       <div className="bg-[#0f172a] border border-white/10 rounded-3xl md:rounded-[2.5rem] w-full max-w-5xl h-[92vh] md:h-[85vh] overflow-hidden shadow-2xl flex flex-col relative">
          
          <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-8 z-20 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all shadow-inner border border-white/5">
          
            <XCircle className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="p-5 md:p-8 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.4em] mb-1">Squad Database</p>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight text-left transform-none truncate pr-10">{tournament.name}</h2>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto p-3 md:p-4 space-y-2 bg-black/20 max-h-[35vh] md:max-h-full">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 md:mb-3">Teams</p>
              {loading ?
            Array(6).fill(0).map((_, i) =>
            <div key={i} className="h-14 md:h-16 w-full animate-pulse bg-white/5 rounded-xl md:rounded-2xl border border-white/5" />
            ) :

            data.teams.map((t) =>
            <button
              key={t._id}
              onClick={() => setSelectedTeam(t)}
              className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 group
                      ${selectedTeam?._id === t._id ?
              'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10' :
              'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'}`}>
              
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                       <img src={getMediaUrl(t.logoUrl, `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                       <p className={`text-xs md:text-sm font-black truncate ${selectedTeam?._id === t._id ? 'text-white' : 'text-slate-300'}`}>{t.name}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {data.players?.filter((p) => String(p.team) === String(t._id) || p.team === t.name).length} Players
                        </p>
                    </div>
                  </button>
            )
            }
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
               {loading ?
                 <div className="space-y-4">
                    <div className="h-8 w-48 animate-pulse bg-white/5 rounded-lg" />
                    <div className="grid grid-cols-1 gap-2">
                       {Array(5).fill(0).map((_, i) =>
                         <div key={i} className="h-20 w-full animate-pulse bg-white/5 rounded-xl border border-white/5" />
                       )}
                    </div>
                 </div> :
                 selectedTeam ?
                   <SquadList
                     team={selectedTeam}
                     players={squadPlayers}
                     onPlayerClick={(p) => setSelectedPlayer(p)}
                     onDownload={downloadSquad}
                     isDownloading={isDownloading} /> :
                   <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">
                     Select a team to view their roster
                   </div>
               }
            </div>
          </div>
       </div>

       {/* --- DETAILED PLAYER PROFILE POPUP --- */}
       {selectedPlayer && (
         <PlayerDetailsModal 
           player={selectedPlayer} 
           onClose={() => setSelectedPlayer(null)} 
         />
       )}

       {/* --- HIDDEN EXPORT CONTAINER (Off-screen for html2canvas) --- */}
       {selectedTeam && (
         <div id="squad-download" style={{
           position: 'fixed',
           left: '-5000px',
           top: '0',
           width: '1200px',
           height: 'auto',
           minHeight: '1200px',
           background: `url('${getMediaUrl(squadBg)}') center/cover no-repeat`,
           backgroundColor: '#020617',
           padding: '60px 40px',
           display: 'none',
           zIndex: -9999,
           fontFamily: 'sans-serif'
         }}>
           <div style={{
             position: 'absolute',
             inset: 0,
             background: 'linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.5))',
             zIndex: 1
           }}></div>

           <div style={{ 
             position: 'relative', 
             zIndex: 3, 
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             marginBottom: '50px' 
           }}>
             <img 
               src={getMediaUrl(selectedTeam.logoUrl || selectedTeam.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeam.name)}&background=8b5cf6&color=fff&size=200`)} 
               crossOrigin="anonymous" 
               style={{ width: '130px', height: '130px', borderRadius: '50%', border: '6px solid #8b5cf6', objectFit: 'cover', marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.1)' }} 
               alt=""
               onError={(e) => {
                 e.target.src = getMediaUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeam.name)}&background=8b5cf6&color=fff&size=200`)
               }}
             />
             <h1 style={{ color: 'white', fontSize: '56px', margin: '0', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center' }}>{selectedTeam.name}</h1>
             <div style={{ height: '4px', width: '120px', background: '#8b5cf6', margin: '20px auto' }}></div>
             <p style={{ color: '#a78bfa', fontSize: '28px', margin: '0', fontWeight: '900', letterSpacing: '2px' }}>OFFICIAL SQUAD</p>
           </div>

           {(() => {
             const squadSize = squadPlayers.length;
             let columns = 5;
             let imgSize = '100px';
             let nameSize = '16px';
             let metaSize = '13px';
             let contactSize = '11px';
             let itemWidth = '160px';
             let gap = '30px 20px';

             if (squadSize > 15 && squadSize <= 24) {
               columns = 6;
               imgSize = '85px';
               nameSize = '14px';
               metaSize = '12px';
               contactSize = '10px';
               itemWidth = '140px';
               gap = '25px 15px';
             } else if (squadSize > 24) {
               columns = 7;
               imgSize = '70px';
               nameSize = '12px';
               metaSize = '11px';
               contactSize = '9px';
               itemWidth = '120px';
               gap = '20px 10px';
             }

             return (
               <div style={{ 
                 position: 'relative', 
                 zIndex: 3, 
                 display: 'grid', 
                 gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                 gap: gap,
                 justifyItems: 'center',
                 padding: '0 40px',
                 width: '100%'
               }}>
                 {squadPlayers.map((player, idx) => (
                   <div key={idx} style={{ textAlign: 'center', width: itemWidth }}>
                     <div style={{ position: 'relative', display: 'inline-block' }}>
                       <img 
                         src={getMediaUrl(player.photo?.s3 || player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`)} 
                         crossOrigin="anonymous" 
                         style={{ width: imgSize, height: imgSize, borderRadius: '50%', border: '3px solid white', objectFit: 'cover', background: 'rgba(255,255,255,0.1)' }} 
                         alt=""
                       />
                       {player.isIcon && (
                         <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#8b5cf6', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>ICON</div>
                       )}
                     </div>
                     <div style={{ 
                       color: 'white', 
                       fontWeight: '900', 
                       fontSize: nameSize, 
                       lineHeight: '1.1',
                       marginTop: '8px', 
                       marginBottom: '2px',
                       height: '34px',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       textAlign: 'center',
                       textTransform: 'uppercase'
                     }}>{player.name}</div>
                     
                     <div style={{ color: '#a78bfa', fontSize: metaSize, fontWeight: 'bold', marginBottom: '2px' }}>
                       {player.isIcon ? 'RETAINED' : `₹${(player.soldPrice || player.basePrice || 0).toLocaleString()}`}
                     </div>
                     
                     <div style={{ color: '#ffffff', fontSize: contactSize, fontWeight: '800', opacity: 0.9, marginBottom: '2px' }}>
                       {player.mobile || player.phone || 'NO CONTACT'}
                     </div>

                     <div style={{ color: '#fbbf24', fontSize: contactSize, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
                       {player.role || 'Player'}
                     </div>
                   </div>
                 ))}
               </div>
             );
           })()}
         </div>
       )}
    </div>);
}

function PlayerDetailsModal({ player, onClose }) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-4xl w-full bg-[#0f172a] border border-white/10 rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl relative max-h-[95vh] flex flex-col md:block overflow-y-auto md:overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all z-20 border border-white/5"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          <div className="md:col-span-5 bg-black/40 p-6 md:p-10 flex flex-col items-center gap-6 justify-center border-b md:border-b-0 md:border-r border-white/5">
            <div className="p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-4 bg-[#0f172a] w-full max-w-[280px]">
              <div className="text-center">
                <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-violet-400 opacity-80">PLAYER PROFILE</h2>
                <h1 className="text-xs font-black text-white italic tracking-tighter uppercase">Official Card</h1>
              </div>
              
              <div className="w-44 h-44 md:w-48 md:h-48 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-xl relative shrink-0">
                <img
                  src={getMediaUrl(player.photo?.s3 || player.imageUrl || player.image, `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`)}
                  className="w-full h-full object-cover" 
                  alt={player.name} 
                />
              </div>
            
              <div className="text-center space-y-1 w-full">
                <h3 className="text-lg md:text-xl font-black text-white italic tracking-tighter leading-tight truncate">{player.name}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  ID #{player.applicationId || player.originalApplicationId || "N/A"}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 w-full pt-3 border-t border-white/5">
                <div className="text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase">ROLE</p>
                  <p className="text-[9px] font-black text-white truncate uppercase">{player.role || "PLAYER"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase">STYLE</p>
                  <p className="text-[9px] font-black text-white truncate uppercase">{player.playingStyle || player.battingStyle || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-6 md:p-12 space-y-8 flex flex-col justify-center">
            <div>
              <p className="text-[9px] font-black text-violet-500 uppercase tracking-[0.4em] mb-2 leading-none">Registry Profile Record</p>
              <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tight leading-none uppercase">{player.name}</h2>
              {player.fatherName && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
                  FATHER: <span className="text-white">{player.fatherName}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <DetailNode icon={Phone} label="Mobile Number" value={player.mobile || player.phone} color="text-violet-300" />
              <DetailNode icon={Calendar} label="Age / Date of Birth" value={player.dob ? `${calculateAge(player.dob)} YRS (${new Date(player.dob).toLocaleDateString()})` : (player.age ? `${player.age} YRS` : "---")} />
              <DetailNode icon={MapPin} label="Taluk / Hobli" value={(player.taluk || player.hobli) ? `${player.taluk || ""} ${player.hobli ? `> ${player.hobli}` : ""}` : "---"} />
              <DetailNode icon={MapPin} label="Village / Town" value={player.village || player.town || "---"} />
              <DetailNode icon={Activity} label="Wicket Keeper" value={player.wicketKeeper ? "YES (ACTIVE)" : "NO"} color={player.wicketKeeper ? "text-emerald-400 font-black" : "text-slate-400"} />
              <DetailNode icon={Shield} label="Draft Status" value={player.status?.toUpperCase() || "AVAILABLE"} color={player.status === "sold" ? "text-emerald-400 font-black" : "text-amber-400 font-black"} />
              
              <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Base Price</p>
                  <p className="text-sm font-black text-slate-300">₹{Number(player.basePrice || 0).toLocaleString("en-IN")}</p>
                </div>
                {player.status === "sold" && (
                  <div>
                    <p className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">Sold Price</p>
                    <p className="text-sm font-black text-emerald-400">₹{Number(player.soldPrice || 0).toLocaleString("en-IN")}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/5 flex">
              <button 
                onClick={onClose} 
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailNode({ icon: Icon, label, value, color = "text-white" }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 opacity-40">
        <Icon size={12} className="text-slate-400 shrink-0" />
        <p className="text-[8px] font-black uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className={`text-xs font-bold uppercase tracking-wider truncate ${color}`}>
        {value || "---"}
      </p>
    </div>
  );
}