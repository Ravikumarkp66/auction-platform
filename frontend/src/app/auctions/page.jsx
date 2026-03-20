"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Trophy, Play, Users, Calendar, ExternalLink, Clock } from "lucide-react";

export default function AuctionsPage() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
        setError(null);
      } else {
        throw new Error("Failed to fetch tournaments");
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

  const getStatusColor = (status) => {
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

  const liveTournaments = tournaments.filter(t => t.status?.toLowerCase() === "active" || t.status?.toLowerCase() === "live");
  const otherTournaments = tournaments.filter(t => t.status?.toLowerCase() !== "active" && t.status?.toLowerCase() !== "live");

  return (
    <div className="min-h-screen bg-[#0a0f18] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.15)_0%,_transparent_50%)]"></div>
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-violet-900/20 to-transparent"></div>
      
      {/* Hero Section - Broadcast Style */}
      <div className="relative z-10 pt-8 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Organizer Badge - Top Right */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)] bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur-sm">
            <div className="relative w-full h-full">
              <Image 
                src="/tournaments/organizer-logo.png" 
                alt="Dr. G Parameshwar Cup"
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>
          
          {/* Live Indicator + Title Row */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-full">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              <span className="text-red-400 font-black uppercase tracking-[0.2em] text-sm">Live Now</span>
            </div>
          </div>
          
          {/* Main Title */}
          <div className="text-center mb-4">
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Parmeshwar Cup
            </h1>
            <p className="text-violet-400 text-xl md:text-2xl font-bold uppercase tracking-[0.3em] mt-2">
              2026
            </p>
          </div>
          
          {/* Subtitle */}
          <p className="text-center text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            ⚡ Live Cricket Auction • Real-time bidding • Real teams • Real pressure
          </p>
          
          {/* CTA Button */}
          {liveTournaments.length > 0 && (
            <div className="flex justify-center mb-12">
              <Link
                href={status === "authenticated" ? `/live-auction?id=${liveTournaments[0].shortId || liveTournaments[0]._id}` : `/overlay`}
                className="group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-6 h-6 fill-current" />
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
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-white">{tournament.numTeams || 0}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Teams</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-violet-400">{tournament.playerCount || tournament.players?.length || 0}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Players</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-amber-400">{tournament.iconCount || tournament.players?.filter(p => p.isIcon).length || 0}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Icons</div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={status === "authenticated" ? `/live-auction?id=${tournament.shortId || tournament._id}` : `/overlay`}
                      className="group/btn relative w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black uppercase tracking-wider rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        <Play className="w-5 h-5 fill-current" />
                        Watch Live Auction
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-violet-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other Tournaments */}
        {otherTournaments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Other Tournaments</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTournaments.map((tournament) => (
                <div key={tournament._id} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(tournament.status)}`}>
                      {getStatusIcon(tournament.status)}
                      {tournament.status || "Unknown"}
                    </div>
                    <Trophy className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2">{tournament.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {tournament.organizerName || "Cricket Tournament"}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{tournament.numTeams || 0} Teams</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      <span>{tournament.players?.length || 0} Players</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-slate-400 mb-2">
                      Created: {new Date(tournament.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
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
