"use client";

import { useState, useEffect, use } from "react";
import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MatchLiveViewer({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch match details
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/api/match/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();

    socket.emit("join-match", matchId);
    socket.on("score-update", (data) => {
      setMatch(data);
    });

    return () => {
      socket.off("score-update");
    };
  }, [matchId]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Connecting to Broadcast...</div>;
  if (!match) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Match Not Found or Offline</div>;

  const currentInnings = match.innings[match.currentInnings - 1] || {};
  const overs = Math.floor((currentInnings.legalBalls || 0) / 6);
  const balls = (currentInnings.legalBalls || 0) % 6;
  const target = match.currentInnings === 2 ? match.innings[0].totalRuns + 1 : null;
  const runsNeeded = target ? target - (currentInnings.totalRuns || 0) : null;
  const ballsRemaining = match.totalOvers * 6 - (currentInnings.legalBalls || 0);

  // Extract last 6 balls for the over timeline
  const lastBalls = currentInnings.ballsData ? currentInnings.ballsData.slice(-6) : [];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans p-4 md:p-8 relative overflow-hidden">
      {/* ── Broadcast Graphics Overlay Style ── */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-end pb-12 z-10">
        
        {/* Match Situation (Chasing) */}
        {match.currentInnings === 2 && match.status === "live" && (
          <div className="mb-4 bg-black/60 backdrop-blur-md self-start px-6 py-2 rounded-full border border-slate-700/50 shadow-2xl">
            <p className="text-amber-400 font-bold uppercase tracking-widest text-sm">Target {target}</p>
            <p className="text-white text-xs">Need {runsNeeded} runs in {ballsRemaining} balls</p>
          </div>
        )}

        {/* Status / Result */}
        {match.status === "completed" && (
          <div className="mb-4 bg-emerald-600/90 backdrop-blur-md self-center px-8 py-3 rounded-2xl border border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <p className="text-white font-black uppercase tracking-widest text-xl">{match.result}</p>
          </div>
        )}

        {/* Main Score Bug (Bottom Third) */}
        <div className="flex flex-col md:flex-row gap-4 relative">
          
          {/* Main Score Panel */}
          <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#020617] rounded-3xl p-6 md:p-8 border-2 border-slate-700 shadow-2xl relative overflow-hidden">
            {/* Glowing Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-xs mb-2">Live • Innings {match.currentInnings}</p>
            <div className="flex items-end gap-6 mb-2">
              <h1 className="text-7xl md:text-8xl font-black text-white leading-none tracking-tighter">
                {currentInnings.totalRuns || 0}
                <span className="text-slate-500 font-bold text-5xl md:text-6xl tracking-normal">/{currentInnings.wickets || 0}</span>
              </h1>
              <div className="pb-2">
                <p className="text-slate-400 font-semibold text-lg">Overs</p>
                <p className="text-white font-black text-3xl leading-none">{overs}.{balls}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-800">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">CRR</p>
                <p className="text-white font-semibold text-xl">{overs > 0 || balls > 0 ? ((currentInnings.totalRuns / ((overs * 6 + balls) / 6)).toFixed(1)) : "0.0"}</p>
              </div>
              {match.currentInnings === 2 && runsNeeded > 0 && ballsRemaining > 0 && (
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">RRR</p>
                  <p className="text-amber-400 font-semibold text-xl">{(runsNeeded / (ballsRemaining / 6)).toFixed(1)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Over / Last 6 Balls Timeline */}
          <div className="md:w-80 bg-black/40 backdrop-blur-md rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-center">
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Last 6 Balls</h3>
            <div className="flex gap-2 justify-between">
              {lastBalls.length === 0 ? (
                <p className="text-slate-600 text-sm font-medium italic">Over starting...</p>
              ) : (
                lastBalls.map((b, i) => {
                  let label = b.runs;
                  let bgClass = "bg-slate-700 text-slate-300 border-slate-600";
                  
                  if (b.type === "wicket") {
                    label = "W";
                    bgClass = "bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.5)]";
                  } else if (b.type === "wide") {
                    label = "WD";
                    bgClass = "bg-slate-800 text-slate-300 border-slate-600";
                  } else if (b.type === "no-ball") {
                    label = "NB";
                    bgClass = "bg-slate-800 text-slate-300 border-slate-600";
                  } else if (b.runs === 4 || b.runs === 6) {
                    bgClass = "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]";
                  }

                  return (
                    <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${bgClass}`}>
                      {label}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Background Graphic elements to look like a broadcast screen */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black opacity-80"></div>
    </div>
  );
}
