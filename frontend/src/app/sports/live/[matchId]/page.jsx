"use client";

import { useState, useEffect, useRef, use } from "react";
import io from "socket.io-client";
import { ArrowLeft, RefreshCw, Trophy, Shield, Flame, Activity } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MobileViewerScreen({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local raid timer
  const [raidTimer, setRaidTimer] = useState(30);
  const [matchClockRemaining, setMatchClockRemaining] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    fetchMatchDetails();

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    socket.on("connect", () => {
      console.log("ðŸ“± Mobile Viewer joined sports match room:", matchId);
      socket.emit("join-sports-match", matchId);
    });

    socket.on("sports-score-update", (updatedMatch) => {
      setMatch(updatedMatch);
      if (updatedMatch.kabaddiState) {
        setRaidTimer(updatedMatch.kabaddiState.raidTimer);
        setIsTimerRunning(updatedMatch.kabaddiState.isRaidActive);
      }
      if (updatedMatch.matchClock) setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      socket.disconnect();
    };
  }, [matchId]);

  // Client timer loop
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setRaidTimer(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sports-matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        if (data.kabaddiState) {
          setRaidTimer(data.kabaddiState.raidTimer);
          setIsTimerRunning(data.kabaddiState.isRaidActive);
        }
        if (data.matchClock) setMatchClockRemaining(data.matchClock.remaining ?? 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a1e] flex flex-col items-center justify-center text-white p-6 font-sans">
        <Activity size={24} className="text-violet-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Connecting to Stadium broadcast...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#070a1e] flex flex-col items-center justify-center text-white p-8 text-center font-bold">
        Match Offline or Private.
      </div>
    );
  }

  const isRaidActive = match.kabaddiState?.isRaidActive || false;
  const isDoOrDie = match.kabaddiState?.doOrDie || false;
  const currentRaider = match.kabaddiState?.currentRaider || "";
  const recentEvents = [...match.events].reverse();
  const isClutchClock = match.matchClock?.mode === "SMART_CLUTCH" && matchClockRemaining <= (match.matchClock?.clutchThreshold ?? 0);
  const formatClock = (seconds = 0) => `${Math.floor(Math.max(seconds, 0) / 60)}:${String(Math.max(seconds, 0) % 60).padStart(2, "0")}`;

  return (
    <div className="bg-[#050714] min-h-screen text-slate-100 font-sans flex justify-center">
      <div className="w-full max-w-md bg-[#080b1b] min-h-screen flex flex-col justify-between relative shadow-2xl border-x border-slate-900/60 pb-8">
        
        {/* â”€â”€ Top Header â”€â”€ */}
        <header className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="p-1 hover:bg-white/5 rounded-full transition">
            <ArrowLeft size={20} className="text-slate-400" />
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-xs font-black uppercase tracking-wider text-yellow-500">KPL Broadcast Arena</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase">{match.venue}</p>
          </div>
          <button onClick={fetchMatchDetails} className="p-1 hover:bg-white/5 rounded-full transition text-slate-400">
            <RefreshCw size={16} />
          </button>
        </header>

        {/* â”€â”€ Core Score Panel â”€â”€ */}
        <div className="p-4 flex flex-col items-center mt-4">
          <div className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            {match.status === "completed" ? "MATCH FINISHED" : "LIVE FEED"}
          </div>

          <div className="w-full bg-slate-950/50 border border-slate-900 rounded-3xl p-5 shadow-inner text-center">
            <div className={`mb-5 rounded-2xl border px-4 py-3 text-center transition-all ${isClutchClock
                ? "border-red-500/35 bg-red-500/10 shadow-[0_0_26px_rgba(239,68,68,0.2)] animate-pulse"
                : "border-slate-800/70 bg-black/20 shadow-[0_0_24px_rgba(255,255,255,0.04)]"
              }`}>
              <p className={`text-[9px] uppercase tracking-[0.28em] font-black ${isClutchClock ? "text-red-200" : "text-slate-500"}`}>
                Half {match.kabaddiState.half} - Official Time
              </p>
              <p className={`mt-1 text-4xl font-black tracking-tight ${isClutchClock ? "text-red-200 drop-shadow-[0_0_16px_rgba(248,113,113,0.45)]" : "text-white"}`}>
                {formatClock(matchClockRemaining)}
              </p>
              {!match.matchClock?.running && (
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">Official time stopped</p>
              )}
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider truncate">{match.teamA.name}</p>
                <p className="text-4xl font-black text-white mt-1">{match.teamA.score}</p>
              </div>
              <div className="px-4 text-slate-700 text-xl font-bold">:</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider truncate">{match.teamB.name}</p>
                <p className="text-4xl font-black text-white mt-1">{match.teamB.score}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-900/60 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Winner: <strong className="text-emerald-400">{match.winner || "Live"}</strong></span>
            </div>



          </div>

          {/* Active raid clock overlay */}
          {isRaidActive && (
            <div className={`mt-4 w-full ${isDoOrDie || raidTimer <= 5 ? "bg-red-600/10 border-red-500/25" : "bg-violet-600/10 border-violet-500/20"} border rounded-2xl p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDoOrDie || raidTimer <= 5 ? "bg-red-600/15 text-red-300" : "bg-violet-600/15 text-violet-400"}`}>
                  âš¡
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{isDoOrDie ? "Do Or Die Raid" : "Raider Active"}</p>
                  <p className="text-xs font-bold text-white uppercase">{currentRaider}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${isDoOrDie || raidTimer <= 5 ? "text-red-400" : "text-violet-400"}`}>{raidTimer}s</span>
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ Mat Player Rosters lists â”€â”€ */}
        <div className="px-4 mt-4 grid grid-cols-2 gap-4">
          {/* Team A active */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-3">
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 border-b border-slate-900 pb-1.5 flex justify-between items-center">
              <span>{match.teamA.name} Lineup</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: match.teamA.color }} />
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {match.teamA.players.map(player => {
                const isActive = match.teamA.activePlayerIds.includes(player.name);
                return (
                  <div key={player.name} className={`flex items-center justify-between text-[11px] ${isActive ? "text-slate-200" : "text-slate-650 line-through opacity-40"}`}>
                    <span className="truncate font-semibold">#{player.jerseyNumber} - {player.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team B active */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-3">
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 border-b border-slate-900 pb-1.5 flex justify-between items-center">
              <span>{match.teamB.name} Lineup</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: match.teamB.color }} />
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {match.teamB.players.map(player => {
                const isActive = match.teamB.activePlayerIds.includes(player.name);
                return (
                  <div key={player.name} className={`flex items-center justify-between text-[11px] ${isActive ? "text-slate-200" : "text-slate-650 line-through opacity-40"}`}>
                    <span className="truncate font-semibold">#{player.jerseyNumber} - {player.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* â”€â”€ Match Score logs Timeline â”€â”€ */}
        <div className="px-4 mt-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Live Playback Timeline</h3>
          <div className="max-h-60 overflow-y-auto bg-slate-950/30 border border-slate-900 rounded-2xl p-3 divide-y divide-slate-900/50">
            {recentEvents.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4 text-center">Score stream updates will show here.</p>
            ) : (
              recentEvents.map((evt, idx) => {
                let badgeEmoji = "ðŸ”¥";
                if (evt.eventType === "TACKLE_POINT" || evt.eventType === "SUPER_TACKLE") badgeEmoji = "ðŸ›¡ï¸";
                if (evt.eventType === "ALL_OUT") badgeEmoji = "ðŸ†";
                
                return (
                  <div key={idx} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-base">{badgeEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200">
                        {evt.eventType.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {evt.eventType === "ALL_OUT" 
                          ? `${match[evt.payload.team]?.name || "Team"} revived` 
                          : evt.eventType === "TOUCH_POINT"
                            ? `+${evt.payload.points} Points scored`
                            : evt.eventType === "SUPER_TACKLE"
                              ? "+2 Super Tackle"
                              : "Action logs verified"}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">
                      {new Date(evt.timestamp).toTimeString().slice(0, 5)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

