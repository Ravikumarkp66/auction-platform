"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Zap, Play, ExternalLink, Calendar, Users, ShieldAlert, Maximize2, Trash2 } from "lucide-react";

export default function SportsManagementDashboard() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/sports-matches`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch sports matches", err));
  }, []);

  const activeMatches = matches.filter(m => m.status === "live");
  const scheduledMatches = matches.filter(m => m.status === "scheduled");
  const completedMatches = matches.filter(m => m.status === "completed");

  const openFullscreen = async () => {
    if (typeof document === "undefined") return;
    const target = document.getElementById("kabaddi-center") || document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen failed", err);
    }
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to delete this match? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/sports-matches/${matchId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMatches(matches => matches.filter(m => m._id !== matchId));
      } else {
        alert("Failed to delete match");
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Error deleting match");
    }
  };

  return (
    <div id="kabaddi-center" className="max-w-6xl mx-auto p-4 lg:p-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            KABADDI CENTER
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">
            One control room for tournaments, live scoring, broadcast overlays, public links, and match analytics.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={openFullscreen}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase px-5 py-3.5 rounded-2xl transition active:scale-95"
          >
            <Maximize2 size={18} strokeWidth={3} /> Fullscreen
          </button>
          <Link 
            href="/admin/sports/quick-match"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-black text-sm uppercase px-6 py-3.5 rounded-2xl transition duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> Create Match
          </Link>
        </div>
      </div>

      {/* Modern Flow Choices */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Quick Match Card */}
        <div className="bg-[#0f172a]/60 border border-violet-500/30 rounded-3xl p-6 relative overflow-hidden group shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-[50px] -translate-y-6 translate-x-6"></div>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 border border-violet-500/20">
            <Zap size={24} className="fill-current" />
          </div>
          <h3 className="text-xl font-bold mb-2">Tournament & Match Management</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Create matches, manage rosters, start scoring, publish overlays, and keep Kabaddi operations in one workspace.
          </p>
          <Link 
            href="/admin/sports/quick-match"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition"
          >
            <span>Create Match</span>
            <Play size={14} fill="currentColor" />
          </Link>
        </div>

        {/* Tournament Creator Card */}
        <div className="bg-[#0f172a]/30 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group shadow-2xl backdrop-blur-xl ">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[50px] -translate-y-6 translate-x-6"></div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500/80 mb-4 border border-yellow-500/10">
            <ExternalLink size={24} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold">Broadcast Controls</h3>
            
          </div>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Open overlay screens, share live links, run projector mode, and let the homepage automatically show live Kabaddi cards.
          </p>
          <div className="text-yellow-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={14} /> Same live publishing pattern as auction
          </div>
        </div>
      </div>

      {/* Matches Tables */}
      <div className="space-y-8">
        {/* Active Live Matches */}
        <div>
          <h2 className="text-lg font-black tracking-wider uppercase text-red-500 flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            Live Matches ({activeMatches.length})
          </h2>
          {activeMatches.length === 0 ? (
            <div className="bg-[#0f172a]/20 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              No live matches active currently. Start a quick match to go live!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeMatches.map(match => (
                <div key={match._id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-red-500/10 text-red-400 text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-red-500/20">
                      Live Match
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        📍 {match.venue}
                      </span>
                      <button onClick={() => deleteMatch(match._id)} className="text-slate-500 hover:text-red-500 transition" title="Delete Match">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950/40 rounded-xl p-4 mb-4 border border-slate-900">
                    <div className="text-center flex-1">
                      <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center font-bold text-sm" style={{ backgroundColor: match.teamA.color }}>
                        {match.teamA.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="font-bold text-sm truncate">{match.teamA.name}</p>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <span className="text-3xl font-black tracking-tight text-white">
                        {match.teamA.score} : {match.teamB.score}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Half {match.kabaddiState.half}</span>
                    </div>
                    <div className="text-center flex-1">
                      <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center font-bold text-sm" style={{ backgroundColor: match.teamB.color }}>
                        {match.teamB.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="font-bold text-sm truncate">{match.teamB.name}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link 
                      href={`/admin/sports/score/${match._id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold uppercase transition"
                    >
                      <Zap size={14} className="fill-current" /> Open control room
                    </Link>
                    <Link 
                      href={`/live/kabaddi/${match._id}`}
                      target="_blank"
                      className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Open Public Live Link"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Matches */}
        {scheduledMatches.length > 0 && (
          <div>
            <h2 className="text-lg font-black tracking-wider uppercase text-yellow-500 flex items-center gap-2 mb-4">
              <Calendar size={18} />
              Scheduled Matches ({scheduledMatches.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {scheduledMatches.map(match => (
                <div key={match._id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-slate-400 font-bold">{match.date} @ {match.time}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">📍 {match.venue}</span>
                      <button onClick={() => deleteMatch(match._id)} className="text-slate-500 hover:text-red-500 transition" title="Delete Match">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/20 border border-slate-900/60 rounded-xl p-3 mb-4">
                    <span className="font-bold text-sm">{match.teamA.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold italic">VS</span>
                    <span className="font-bold text-sm text-right">{match.teamB.name}</span>
                  </div>
                  <Link 
                    href={`/admin/sports/score/${match._id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase transition"
                  >
                    Start Match Scorer
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Matches */}
        {completedMatches.length > 0 && (
          <div>
            <h2 className="text-lg font-black tracking-wider uppercase text-slate-400 flex items-center gap-2 mb-4">
              <Users size={18} />
              Recent Completed ({completedMatches.length})
            </h2>
            <div className="bg-[#0f172a]/20 border border-slate-800 rounded-2xl divide-y divide-slate-800/50">
              {completedMatches.map(match => (
                <div key={match._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div>
                    <p className="font-bold text-sm text-slate-200">
                      {match.teamA.name} ({match.teamA.score}) vs {match.teamB.name} ({match.teamB.score})
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Completed • Venue: {match.venue} • Winner: <span className="text-emerald-400 font-bold">{match.winner || "Tie"}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Link 
                      href={`/live/kabaddi/${match._id}`}
                      target="_blank"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Playback Overlays
                    </Link>
                    <button onClick={() => deleteMatch(match._id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete Match">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
