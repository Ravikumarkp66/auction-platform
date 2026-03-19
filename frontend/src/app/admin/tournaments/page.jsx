"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Play, Eye, Edit, Trash2, Users, Calendar, RotateCcw } from "lucide-react";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`);
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
    } catch (err) {
      console.error("Failed to fetch tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetAuction = async (tournamentId) => {
    if (!confirm("Are you sure you want to reset the auction?\n\nThis will:\n- Keep icon players in their teams\n- Reset all sold players back to auction pool\n- Reset all team budgets to ₹10,000\n\nThis action cannot be undone!")) {
      return;
    }

    setResetting(tournamentId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Auction reset successfully!\n\n- ${data.iconPlayersRetained} icon players retained\n- ${data.auctionPlayersReset} auction players reset\n- ${data.teamsReset} teams reset`);
        fetchTournaments(); // Refresh the list
      } else {
        alert("Failed to reset auction");
      }
    } catch (err) {
      console.error("Error resetting auction:", err);
      alert("Error resetting auction");
    } finally {
      setResetting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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
    switch (status) {
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
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-slate-400">Manage your auction tournaments</p>
        </div>
        <Link
          href="/admin/create-tournament"
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors flex items-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          Create Tournament
        </Link>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="bg-slate-800 rounded-lg border border-slate-700">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Created on {new Date(tournament.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(tournament.status)}`}>
                  {getStatusIcon(tournament.status)}
                  {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Teams</p>
                    <p className="text-lg font-semibold text-white">{tournament.teams}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Trophy className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Players</p>
                    <p className="text-lg font-semibold text-white">{tournament.players}</p>
                  </div>
                </div>
              </div>

              {/* Live Auction Info */}
              {tournament.status === "live" && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-medium mb-1">Live Auction</p>
                  <p className="text-white">
                    Current Player: {tournament.currentPlayer}
                  </p>
                  <p className="text-violet-400 font-semibold">
                    Current Bid: ₹{tournament.currentBid.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {tournament.status === "live" && (
                  <>
                    <Link
                      href={`/live-auction?tournament=${encodeURIComponent(tournament.name)}`}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Control Auction
                    </Link>
                    <Link
                      href={`/overlay?tournament=${encodeURIComponent(tournament.name)}`}
                      className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Overlay
                    </Link>
                  </>
                )}
                
                {tournament.status === "upcoming" && (
                  <>
                    <button className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Play className="w-4 h-4" />
                      Start Tournament
                    </button>
                    <button className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                )}
                
                {tournament.status === "completed" && (
                  <>
                    <Link
                      href={`/overlay?tournament=${encodeURIComponent(tournament.name)}`}
                      className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Results
                    </Link>
                    <button className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Edit className="w-4 h-4" />
                      Details
                    </button>
                  </>
                )}
                
                {/* Reset Auction Button */}
                <button 
                  onClick={() => resetAuction(tournament._id)}
                  disabled={resetting === tournament._id}
                  className="px-3 py-2 bg-amber-600/10 text-amber-400 rounded-lg hover:bg-amber-600/20 transition-colors flex items-center justify-center disabled:opacity-50"
                  title="Reset Auction (Keep icon players, reset sold players)"
                >
                  <RotateCcw className={`w-4 h-4 ${resetting === tournament._id ? 'animate-spin' : ''}`} />
                </button>
                
                <button className="px-3 py-2 bg-red-600/10 text-red-400 rounded-lg hover:bg-red-600/20 transition-colors flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tournaments yet</h3>
          <p className="text-slate-400 mb-4">Create your first tournament to get started</p>
          <Link
            href="/admin/create-tournament"
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Create Tournament
          </Link>
        </div>
      )}
    </div>
  );
}
