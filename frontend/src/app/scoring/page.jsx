"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Plus, Clock, MapPin, ChevronRight, Activity } from "lucide-react";

export default function ScoringHome() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match`);
      if (res.ok) {
        setMatches(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeMatches = matches.filter(m => m.status === 'live');
  const pastMatches = matches.filter(m => m.status === 'completed');
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');

  if (loading) return <div className="p-8 text-center text-slate-500 mt-10">Loading matches...</div>;

  return (
    <div className="p-4 max-w-md mx-auto w-full pb-20">
      
      {/* ── Start Match Hero ── */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-emerald-900/10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <h2 className="text-2xl font-black mb-1">Start a Match</h2>
        <p className="text-emerald-100 text-sm font-medium mb-6">Score your local cricket matches like a pro.</p>
        
        <Link href="/admin/matches" className="flex items-center justify-between bg-white text-emerald-700 font-bold px-5 py-3.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-2">
            <Play size={18} fill="currentColor" />
            <span>Start Match</span>
          </div>
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* ── Live Matches ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity size={18} className="text-red-500" /> Live Matches
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{activeMatches.length}</span>
        </div>
        
        <div className="space-y-4">
          {activeMatches.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Play size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No live matches right now</p>
              <p className="text-xs text-slate-400 mt-1">Start a match to see it here.</p>
            </div>
          ) : (
            activeMatches.map(match => (
              <Link key={match._id} href={`/match/score/${match._id}`} className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded animate-pulse">Live</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{match.totalOvers} Overs</span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{match.teamA?.name?.slice(0,2)}</div>
                    <span className="font-bold text-slate-800 text-sm">{match.teamA?.name}</span>
                  </div>
                  <span className="font-black text-lg text-slate-800">{match.innings[0]?.totalRuns || 0}-{match.innings[0]?.wickets || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{match.teamB?.name?.slice(0,2)}</div>
                    <span className="font-bold text-slate-800 text-sm">{match.teamB?.name}</span>
                  </div>
                  <span className="font-black text-lg text-slate-800">{match.innings.length > 1 ? `${match.innings[1].totalRuns}-${match.innings[1].wickets}` : "Yet to bat"}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ── Scheduled Matches ── */}
      {scheduledMatches.length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-slate-500" /> Scheduled
          </h3>
          <div className="space-y-4">
            {scheduledMatches.map(match => (
              <div key={match._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-500">{match.totalOvers} Overs Match</span>
                </div>
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto mb-2 flex items-center justify-center font-bold text-slate-600">{match.teamA?.name?.slice(0,2)}</div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{match.teamA?.name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 italic">VS</div>
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto mb-2 flex items-center justify-center font-bold text-slate-600">{match.teamB?.name?.slice(0,2)}</div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{match.teamB?.name}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <Link href={`/admin/matches`} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Start Match</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
