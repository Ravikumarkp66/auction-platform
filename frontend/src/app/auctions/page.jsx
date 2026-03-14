"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Play, Users, Calendar, ExternalLink, Clock } from "lucide-react";

export default function AuctionsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTournaments();
    
    // Set up polling to check for new tournaments every 5 seconds
    const interval = setInterval(fetchTournaments, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`);
      
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
        setError(null);
      } else {
        throw new Error("Failed to fetch tournaments");
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err);
      setError("Unable to connect to auction server");
      setTournaments([]);
    } finally {
      setLoading(false);
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
        return "bg-green-500/10 text-green-400 border-green-500/20";
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
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Live Cricket <span className="text-emerald-500">Auctions</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Watch exciting cricket player auctions in real-time. See the bidding action, 
            player details, and team strategies as they unfold.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
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
                <div key={tournament._id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-colors">
                  {/* Live Indicator */}
                  <div className="bg-red-500/10 border-b border-red-500/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 font-medium">LIVE AUCTION</span>
                      </div>
                      <span className="text-slate-400 text-sm">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Tournament Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
                    <p className="text-slate-400 mb-4">
                      {tournament.organizerName || "Cricket Tournament"}
                    </p>

                    {/* Stats */}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        href={`/overlay?tournament=${encodeURIComponent(tournament.name)}`}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <Play className="w-5 h-5" />
                        Watch Live Auction
                      </Link>
                    </div>
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
              <div className="w-20 h-20 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors inline-flex items-center gap-2"
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
