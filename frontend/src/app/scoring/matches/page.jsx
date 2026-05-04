"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MyMatches() {
  const router = useRouter();
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

  if (loading) return <div className="p-8 text-center text-slate-500 mt-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* ── Top Tabs / Filter ── */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-100">
        <div className="flex items-center p-4 pb-2">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} className="text-slate-800" />
          </button>
          <div className="flex-1 flex overflow-x-auto no-scrollbar gap-2 px-4 py-1">
            <div className="px-5 py-2 rounded-full bg-slate-200 text-slate-500 text-sm font-semibold whitespace-nowrap">Overview</div>
            <div className="px-5 py-2 rounded-full bg-slate-200 text-slate-500 text-sm font-semibold whitespace-nowrap">Statistics</div>
            <div className="px-5 py-2 rounded-full bg-[#1e293b] text-white text-sm font-semibold whitespace-nowrap shadow-md">Matches</div>
            <div className="px-5 py-2 rounded-full bg-slate-200 text-slate-500 text-sm font-semibold whitespace-nowrap">Teams</div>
          </div>
          <button className="p-1">
            <Filter size={20} className="text-slate-800" fill="currentColor" />
          </button>
        </div>

        <div className="px-4 pb-4 pt-2 flex justify-end">
          <Link href="/scoring/start" className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-[#008060] uppercase tracking-wide bg-white hover:bg-slate-50">
            START MATCH
          </Link>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto w-full space-y-4">
        
        {matches.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No matches found.</div>
        ) : (
          matches.map(match => (
            <div key={match._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              
              <div className="flex justify-between items-start mb-4">
                <div className="text-[11px] font-semibold text-slate-500">
                  {match.venue ? `${match.venue}, ` : 'Open Match, '}
                  {match.format || 'T10'}, 
                  {match.date ? ` ${match.date}` : ' Today'}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${match.status === 'live' ? 'text-red-500' : match.status === 'completed' ? 'text-slate-400' : 'text-[#008060]'}`}>
                  {match.status}
                </div>
              </div>

              <div className="space-y-3">
                {/* Team A */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                      {(match.teamA?.logoUrl || match.teamA?.logo) ? (
                         <img src={match.teamA.logoUrl || match.teamA.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-[10px] font-bold text-slate-500">{match.teamA?.name?.slice(0,2)}</span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-800">{match.teamA?.name}</span>
                  </div>
                  {match.status !== 'scheduled' && match.innings && match.innings.length > 0 && (
                    <span className="font-bold text-base text-slate-800">
                      {match.innings[0].battingTeam === match.teamA?._id ? `${match.innings[0].totalRuns}-${match.innings[0].wickets}` : match.innings[1]?.totalRuns !== undefined ? `${match.innings[1].totalRuns}-${match.innings[1].wickets}` : "Yet to bat"}
                    </span>
                  )}
                </div>

                {/* Team B */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                      {(match.teamB?.logoUrl || match.teamB?.logo) ? (
                         <img src={match.teamB.logoUrl || match.teamB.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-[10px] font-bold text-slate-500">{match.teamB?.name?.slice(0,2)}</span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-800">{match.teamB?.name}</span>
                  </div>
                  {match.status !== 'scheduled' && match.innings && match.innings.length > 0 && (
                    <span className="font-bold text-base text-slate-800">
                      {match.innings[0].battingTeam === match.teamB?._id ? `${match.innings[0].totalRuns}-${match.innings[0].wickets}` : match.innings[1]?.totalRuns !== undefined ? `${match.innings[1].totalRuns}-${match.innings[1].wickets}` : "Yet to bat"}
                    </span>
                  )}
                </div>
              </div>

              {match.status === 'completed' && match.result && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">View Tournament</span>
                  <span className="text-slate-500">{match.result}</span>
                </div>
              )}
              
              {match.status === 'live' && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <Link href={`/match/score/${match._id}`} className="text-xs font-bold text-red-500">RESUME SCORING</Link>
                </div>
              )}
              
              {match.status === 'scheduled' && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center flex justify-between px-4">
                  <Link href={`/scoring/start?id=${match._id}`} className="text-xs font-bold text-[#008060]">START</Link>
                  <Link href={`/scoring/start?id=${match._id}`} className="text-xs font-bold text-slate-400">EDIT</Link>
                </div>
              )}

            </div>
          ))
        )}
        
      </div>
    </div>
  );
}
