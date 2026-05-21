"use client";

import { useState, useEffect, useRef, use } from "react";
import io from "socket.io-client";
import { Award, Flame, Zap, Shield, Trophy, Clock3, Volume2, RotateCcw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function StadiumProjectorDisplay({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cinematic takeover animation overlay state
  const [takeover, setTakeover] = useState(null); // { type, message, team }
  const [raidIntro, setRaidIntro] = useState(null); // { team, raider }
  const [rollbackCue, setRollbackCue] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Local raid timer
  const [raidTimer, setRaidTimer] = useState(30);
  const [matchClockRemaining, setMatchClockRemaining] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);
  const takeoverTimeoutRef = useRef(null);
  const raidIntroTimeoutRef = useRef(null);
  const rollbackTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousMatchRef = useRef(null);

  const unlockAudio = () => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => { });
    }
    setSoundEnabled(true);
  };

  const playTone = (frequency, duration = 0.15, type = "sine", gain = 0.06, detune = 0) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const amplifier = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    amplifier.gain.value = gain;
    oscillator.connect(amplifier);
    amplifier.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };

  const playNoiseBurst = (duration = 0.16, gain = 0.04) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    const amplifier = ctx.createGain();
    amplifier.gain.value = gain;
    noise.connect(filter);
    filter.connect(amplifier);
    amplifier.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  };

  const playBroadcastCue = (kind) => {
    if (!soundEnabled) return;
    unlockAudio();
    switch (kind) {
      case "raid-start":
        playTone(260, 0.12, "sawtooth", 0.05);
        setTimeout(() => playTone(392, 0.1, "triangle", 0.04), 90);
        setTimeout(() => playTone(523, 0.14, "triangle", 0.05), 180);
        break;
      case "raid-tick":
        playTone(880, 0.04, "square", 0.03);
        break;
      case "danger-tick":
        playTone(96, 0.08, "sine", 0.05);
        setTimeout(() => playTone(132, 0.05, "triangle", 0.035), 110);
        break;
      case "super-raid":
        playTone(170, 0.18, "sawtooth", 0.08);
        setTimeout(() => playTone(220, 0.18, "sawtooth", 0.07), 120);
        playNoiseBurst(0.2, 0.05);
        break;
      case "super-tackle":
        playTone(120, 0.16, "square", 0.07);
        playNoiseBurst(0.12, 0.03);
        break;
      case "all-out":
        playTone(90, 0.22, "sawtooth", 0.09);
        setTimeout(() => playTone(140, 0.18, "square", 0.06), 90);
        setTimeout(() => playNoiseBurst(0.18, 0.06), 120);
        break;
      case "undo":
        playTone(480, 0.12, "triangle", 0.05);
        setTimeout(() => playTone(360, 0.12, "triangle", 0.04), 80);
        break;
      case "timeout":
        playTone(196, 0.28, "sine", 0.05);
        break;
      case "do-or-die":
        playTone(110, 0.22, "sawtooth", 0.06);
        setTimeout(() => playTone(82, 0.18, "sine", 0.05), 140);
        break;
      default:
        playTone(300, 0.08, "sine", 0.03);
    }
  };

  const getPlayerProfile = (playerName) => {
    if (!match || !playerName) return null;
    const searchPool = [...(match.teamA?.players || []), ...(match.teamB?.players || [])];
    return searchPool.find((player) => player.name === playerName) || null;
  };

  const clearTransientTimers = () => {
    if (takeoverTimeoutRef.current) clearTimeout(takeoverTimeoutRef.current);
    if (raidIntroTimeoutRef.current) clearTimeout(raidIntroTimeoutRef.current);
    if (rollbackTimeoutRef.current) clearTimeout(rollbackTimeoutRef.current);
  };

  useEffect(() => {
    fetchMatchDetails();

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    socket.on("connect", () => {
      console.log("ðŸ“º Stadium Projector connected to sockets room:", matchId);
      socket.emit("join-sports-match", matchId);
    });

    socket.on("sports-score-update", (updatedMatch) => {
      console.log("ðŸ“º Projector received update:", updatedMatch);

      const previousMatch = previousMatchRef.current;
      if (previousMatch) {
        const previousRaidActive = previousMatch.kabaddiState?.isRaidActive || false;
        const currentRaidActive = updatedMatch.kabaddiState?.isRaidActive || false;

        if (!previousRaidActive && currentRaidActive) {
          setRaidIntro({
            team: updatedMatch.kabaddiState?.raidingTeam || "",
            raider: updatedMatch.kabaddiState?.currentRaider || "",
            doOrDie: Boolean(updatedMatch.kabaddiState?.doOrDie)
          });
          playBroadcastCue(updatedMatch.kabaddiState?.doOrDie ? "do-or-die" : "raid-start");
          raidIntroTimeoutRef.current = setTimeout(() => {
            setRaidIntro(null);
          }, 1500);
        }

        if (
          updatedMatch.events?.length < previousMatch.events?.length ||
          updatedMatch.teamA?.score < previousMatch.teamA?.score ||
          updatedMatch.teamB?.score < previousMatch.teamB?.score
        ) {
          setRollbackCue({
            teamA: updatedMatch.teamA?.score,
            teamB: updatedMatch.teamB?.score,
            eventCount: updatedMatch.events?.length || 0
          });
          playBroadcastCue("undo");
          rollbackTimeoutRef.current = setTimeout(() => {
            setRollbackCue(null);
          }, 2200);
        }
      }

      setMatch(updatedMatch);

      // Update local timer based on server state
      if (updatedMatch.kabaddiState) {
        setRaidTimer(updatedMatch.kabaddiState.raidTimer);
        setIsTimerRunning(updatedMatch.kabaddiState.isRaidActive);
      }
      if (updatedMatch.matchClock) {
        setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
      }
      previousMatchRef.current = updatedMatch;
    });

    socket.on("sports-cinematic-event", (cinematicEvent) => {
      console.log("ðŸŽ¬ Projector triggering cinematic takeover animation:", cinematicEvent);
      triggerTakeover(cinematicEvent);
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      clearTransientTimers();
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
          playBroadcastCue(match?.kabaddiState?.doOrDie || raidTimer <= 5 ? "danger-tick" : "raid-tick");
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
        previousMatchRef.current = data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerTakeover = (event) => {
    setTakeover(event);
    playBroadcastCue(event.type === "ALL_OUT" ? "all-out" : event.type === "SUPER_TACKLE" ? "super-tackle" : event.type === "SUPER_RAID" ? "super-raid" : event.type === "DO_OR_DIE" ? "do-or-die" : "timeout");
    if (takeoverTimeoutRef.current) clearTimeout(takeoverTimeoutRef.current);
    takeoverTimeoutRef.current = setTimeout(() => {
      setTakeover(null);
    }, event.type === "ALL_OUT" ? 3200 : 4000);
  };

  const currentRaider = match?.kabaddiState?.currentRaider || "";
  const currentRaidingTeam = match?.kabaddiState?.raidingTeam || "";
  const currentRaiderProfile = getPlayerProfile(currentRaider);
  const isRaidActive = match?.kabaddiState?.isRaidActive || false;
  const isDoOrDie = match?.kabaddiState?.doOrDie || false;
  const events = match?.events || [];
  const recentEvents = [...events].reverse().slice(0, 6);
  const raidFill = Math.max((raidTimer / 30) * 100, 0);
  const raidDangerMode = isDoOrDie || raidTimer <= 5;
  const isClutchClock = match?.matchClock?.mode === "SMART_CLUTCH" && matchClockRemaining <= (match?.matchClock?.clutchThreshold ?? 0);
  const formatClock = (seconds = 0) => `${Math.floor(Math.max(seconds, 0) / 60)}:${String(Math.max(seconds, 0) % 60).padStart(2, "0")}`;

  const eventSummary = (evt) => {
    const teamLabel = evt.payload?.team === "teamA" ? match?.teamA?.name : evt.payload?.team === "teamB" ? match?.teamB?.name : "Team";
    switch (evt.eventType) {
      case "ALL_OUT":
        return `${teamLabel} forced an ALL OUT`;
      case "SUPER_TACKLE":
        return `${teamLabel} landed a SUPER TACKLE`;
      case "SUPER_RAID":
        return `${teamLabel} completed a SUPER RAID`;
      case "TOUCH_POINT":
        return `${teamLabel} earned ${evt.payload?.points || 1} touch point${(evt.payload?.points || 1) > 1 ? "s" : ""}`;
      case "BONUS_POINT":
        return `${teamLabel} secured a bonus point`;
      case "TACKLE_POINT":
        return `${teamLabel} stopped the raid`;
      case "EMPTY_RAID":
        return "Empty raid completed";
      default:
        return evt.eventType.replaceAll("_", " ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <h2 className="text-xl font-bold tracking-widest text-violet-400 uppercase animate-pulse">CONNECTING TO STADIUM FEED...</h2>
        <p className="text-xs text-slate-600 mt-2 font-semibold">Please wait for scoring events authorization...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold text-xl uppercase tracking-wider">
        Match Offline or Missing
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#02040b] text-slate-100 font-sans flex flex-col justify-between p-6 relative overflow-hidden"
      onPointerDown={unlockAudio}
      onTouchStart={unlockAudio}
    >

      {/* â”€â”€ BACKGROUND STADIUM LIGHTS GLOW â”€â”€ */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[180px] pointer-events-none -z-10"></div>
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[180px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-violet-600/5 rounded-full blur-[200px] pointer-events-none -z-10"></div>

      {/* â”€â”€ SECTION 1: TOP TV BROADCAST HEADER â”€â”€ */}
      <header className="flex justify-between items-center bg-slate-900/40 border border-white/5 rounded-2xl px-8 py-4 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">LAKSHMISH SPORTS LIVE</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{match.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Venue</span>
            <p className="text-xs font-black text-slate-300">{match.venue}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-right">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Match Flow</span>
            <p className="text-xs font-black text-slate-300">{isRaidActive ? "Raid Live" : "Awaiting Raid"}</p>

          </div>
        </div>
      </header>

      {/* â”€â”€ SECTION 2: MAIN GIANT SCOREBOARD â”€â”€ */}
      <main className={`flex-1 flex flex-col justify-center items-center my-6 z-10 ${takeover ? "animate-[broadcast-shake_0.38s_linear_infinite]" : ""}`}>
        <div className="w-full max-w-6xl grid md:grid-cols-12 gap-8 items-center">

          {/* TEAM A PORTRAIT */}
          <div className="md:col-span-4 text-center p-6 bg-slate-900/20 border border-slate-850 rounded-3xl backdrop-blur-md relative overflow-hidden group">
            {/* Team color accent line */}
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: match.teamA.color }} />
            <h2 className="text-3xl font-black tracking-wide truncate mb-3" style={{ textShadow: `0 0 20px ${match.teamA.color}33` }}>
              {match.teamA.name.toUpperCase()}
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              {/* Render player dots */}
              {Array.from({ length: 7 }).map((_, idx) => {
                const isActive = match.teamA.activePlayerIds.length > idx;
                return (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all border ${isActive
                        ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-slate-950 border-slate-800"
                      }`}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Active Lineup ({match.teamA.activePlayerIds.length}/7)</p>
          </div>

          {/* CENTRAL GIANT SCORE & RAIDER */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
            <div className={`mb-6 w-full max-w-[460px] rounded-[1.75rem] border px-6 py-4 backdrop-blur-xl transition-all duration-300 ${isClutchClock
                ? "border-red-400/35 bg-red-500/10 shadow-[0_0_48px_rgba(239,68,68,0.25)] animate-pulse"
                : "border-white/10 bg-slate-950/45 shadow-[0_0_42px_rgba(255,255,255,0.08)]"
              }`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.32em] ${isClutchClock ? "text-red-200" : "text-slate-400"}`}>
                Half {match.kabaddiState.half} - Official Time
              </p>
              <p className={`mt-1 text-5xl md:text-6xl font-black tracking-tight ${isClutchClock ? "text-red-200 drop-shadow-[0_0_22px_rgba(248,113,113,0.45)]" : "text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.22)]"}`}>
                {formatClock(matchClockRemaining)}
              </p>
              {!match.matchClock?.running && (
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.28em] text-amber-300">Official time stopped</p>
              )}
            </div>

            {/* GIANT DIGITS */}
            <div className="flex items-center gap-8 justify-center mb-6">
              <span className="text-8xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] transition-colors duration-300">
                {match.teamA.score}
              </span>
              <span className="text-slate-700 text-5xl font-black drop-shadow-none">:</span>
              <span className="text-8xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] transition-colors duration-300">
                {match.teamB.score}
              </span>
            </div>

            {/* RAID TIMER (TICKING OVER) */}
            {raidIntro ? (
              <div className="relative w-full max-w-[420px] min-h-[180px] flex items-center justify-center overflow-hidden rounded-[2rem] border border-yellow-400/25 bg-black/40 shadow-[0_0_60px_rgba(234,179,8,0.2)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.2),transparent_60%)] animate-pulse" />
                <div className="relative text-center px-6 py-10">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-yellow-400 font-black">Raid Transition</p>
                  <h2 className="mt-2 text-4xl md:text-5xl font-black uppercase tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200">
                    {raidIntro.team === "teamA" ? match.teamA.name : match.teamB.name} RAIDING
                  </h2>
                  <p className="mt-4 text-sm uppercase tracking-[0.24em] text-slate-300 font-bold">{raidIntro.raider || "Raider locked in"}</p>
                </div>
              </div>
            ) : isRaidActive ? (
              <div className={`relative w-[178px] h-[178px] md:w-[210px] md:h-[210px] rounded-full flex items-center justify-center mb-2 border ${raidDangerMode ? "border-red-500/60" : "border-violet-500/45"}`}>
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-300 ${raidDangerMode ? "shadow-[0_0_70px_rgba(239,68,68,0.45)]" : "shadow-[0_0_60px_rgba(139,92,246,0.22)]"}`}
                  style={{
                    background: `conic-gradient(${raidDangerMode ? "#ef4444" : "#8b5cf6"} ${raidFill}%, rgba(255,255,255,0.06) 0)`,
                  }}
                />
                <div className="absolute inset-[16px] rounded-full bg-[#050814]/90 backdrop-blur-md border border-white/5" />
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className={`text-5xl md:text-6xl font-black tracking-tight ${raidDangerMode ? "text-red-400" : "text-violet-300"}`}>
                    {raidTimer}
                  </div>
                  <div className={`mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] ${isDoOrDie ? "text-red-300 animate-pulse" : "text-slate-400"}`}>
                    <Clock3 size={12} /> {isDoOrDie ? "Do Or Die" : "Live Raid"}
                  </div>
                </div>
                <div className={`absolute inset-0 rounded-full animate-pulse ${raidDangerMode ? "bg-red-500/5" : "bg-violet-500/5"}`} />
              </div>
            ) : (
              <div className="px-6 py-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                <span className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">WAITING FOR RAID INITIATION</span>
              </div>
            )}

            {isRaidActive && !raidIntro && (
              <div className="mt-4 flex items-center gap-3 rounded-full border border-white/5 bg-slate-950/60 px-4 py-3 shadow-[0_0_28px_rgba(0,0,0,0.35)]">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/5">
                  {currentRaiderProfile?.jerseyNumber ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-white/10 to-transparent">
                      #{currentRaiderProfile.jerseyNumber}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-violet-300">
                      <Award size={18} />
                    </div>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Player Spotlight</p>
                  <p className="text-xs md:text-sm font-black uppercase text-white truncate max-w-[190px]">{currentRaider || "RAIDER"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.22em]">
                    {currentRaiderProfile?.role || "Raider"}
                  </p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-[9px] uppercase tracking-[0.28em] text-slate-500 font-black">
                    <Volume2 size={10} /> Cue
                  </div>
                  <p className="text-[10px] text-slate-300 font-black uppercase">{currentRaidingTeam === "teamA" ? match.teamA.name : match.teamB.name}</p>
                </div>
              </div>
            )}

            {match.kabaddiState.doOrDie && (
              <div className="mt-4 bg-red-500 text-white px-5 py-1 text-xs font-black uppercase tracking-widest rounded-full shadow-[0_0_22px_rgba(239,68,68,0.5)] flex items-center gap-1.5 animate-pulse">
                <Flame size={14} className="fill-current animate-pulse" /> DO OR DIE RAID
              </div>
            )}
          </div>

          {/* TEAM B PORTRAIT */}
          <div className="md:col-span-4 text-center p-6 bg-slate-900/20 border border-slate-850 rounded-3xl backdrop-blur-md relative overflow-hidden group">
            {/* Team color accent line */}
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: match.teamB.color }} />
            <h2 className="text-3xl font-black tracking-wide truncate mb-3" style={{ textShadow: `0 0 20px ${match.teamB.color}33` }}>
              {match.teamB.name.toUpperCase()}
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              {Array.from({ length: 7 }).map((_, idx) => {
                const isActive = match.teamB.activePlayerIds.length > idx;
                return (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all border ${isActive
                        ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-slate-950 border-slate-800"
                      }`}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Active Lineup ({match.teamB.activePlayerIds.length}/7)</p>
          </div>

        </div>
      </main>

      {/* â”€â”€ SECTION 3: STADIUM NEWS TICKER â”€â”€ */}
      <footer className="w-full bg-[#070b19] border border-white/5 rounded-2xl p-4 flex items-center gap-6 overflow-hidden relative z-10 shadow-2xl backdrop-blur-md">
        <div className="bg-yellow-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 shadow-md">
          MATCH LOGS
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap text-xs font-bold text-slate-400">
          {recentEvents.length === 0 ? (
            <p className="italic text-slate-600">Broadcast feed waiting for first raid...</p>
          ) : (
            <div className="inline-flex items-center gap-8 pr-8" style={{ animation: "ticker-marquee 28s linear infinite" }}>
              {[...recentEvents, ...recentEvents].map((evt, i) => (
                <span key={`${evt.timestamp}-${i}`} className="inline-flex items-center gap-2 shrink-0 border-r border-white/5 pr-8 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span>
                    {evt.eventType.replace("_", " ")}:
                    <strong className="text-slate-200 ml-1">
                      {eventSummary(evt)}
                    </strong>
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </footer>

      {/* ==================== CINEMATIC TAKE-OVER OVERLAY ==================== */}
      {rollbackCue && (
        <div className="fixed inset-0 z-[490] pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
          <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-6 py-3 text-center shadow-[0_0_40px_rgba(34,211,238,0.18)]">
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-black uppercase tracking-[0.3em] text-[10px]">
              <RotateCcw size={12} /> Undo rollback
            </div>
            <div className="mt-1 text-xs text-slate-200 font-bold uppercase tracking-[0.2em]">
              Scores restored to {rollbackCue.teamA} - {rollbackCue.teamB}
            </div>
          </div>
        </div>
      )}

      {raidIntro && (
        <div className="fixed inset-0 z-[495] flex items-center justify-center bg-black/90 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.12),transparent_55%)] animate-pulse" />
          <div className="relative text-center px-8 py-10 border border-yellow-400/20 rounded-[2.25rem] bg-white/5 backdrop-blur-xl shadow-[0_0_80px_rgba(234,179,8,0.14)]">
            <div className="text-[11px] uppercase tracking-[0.55em] text-yellow-300 font-black">Raid Start Experience</div>
            <h1 className="mt-4 text-6xl md:text-8xl font-black uppercase tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500">
              RAID ON
            </h1>
            <p className="mt-4 text-sm md:text-base font-bold uppercase tracking-[0.28em] text-slate-200">
              {raidIntro.team === "teamA" ? match.teamA.name : match.teamB.name}
            </p>
            <p className="mt-2 text-xs text-slate-400 uppercase tracking-[0.22em]">{raidIntro.raider || "Preparing raid"}</p>
          </div>
        </div>
      )}

      {takeover && (
        <div className={`fixed inset-0 z-[500] flex flex-col items-center justify-center p-6 ${takeover.type === "ALL_OUT" ? "bg-black/96" : "bg-black/94"}`}>
          {/* Strobe background flashes */}
          <div className={`absolute inset-0 -z-10 animate-pulse ${takeover.type === "ALL_OUT" || takeover.type === "DO_OR_DIE" ? "bg-gradient-to-b from-red-950/20 via-black to-red-900/10" : takeover.type === "SUPER_TACKLE" ? "bg-gradient-to-b from-slate-900/10 via-black to-cyan-900/10" : "bg-gradient-to-b from-violet-900/10 via-black to-fuchsia-950/10"}`}></div>

          <div className="text-center relative max-w-3xl">
            {/* Glowing floating emblem */}
            <div className={`w-28 h-28 rounded-full flex items-center justify-center text-slate-950 mx-auto mb-8 border-2 ${takeover.type === "ALL_OUT" || takeover.type === "DO_OR_DIE" ? "bg-gradient-to-tr from-red-500 to-orange-500 shadow-[0_0_80px_rgba(239,68,68,0.55)] border-red-300" : takeover.type === "SUPER_TACKLE" ? "bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_80px_rgba(34,211,238,0.4)] border-cyan-200" : "bg-gradient-to-tr from-yellow-500 to-amber-600 shadow-[0_0_80px_rgba(234,179,8,0.5)] border-yellow-400"}`}>
              {takeover.type === "ALL_OUT" && <Trophy size={52} className="animate-bounce" />}
              {takeover.type === "DO_OR_DIE" && <Flame size={52} className="animate-pulse" />}
              {takeover.type === "SUPER_TACKLE" && <Shield size={52} className="animate-spin" style={{ animationDuration: '4s' }} />}
              {takeover.type === "SUPER_RAID" && <Flame size={52} className="animate-pulse" />}
            </div>

            <h1 className={`text-7xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text ${takeover.type === "ALL_OUT" || takeover.type === "DO_OR_DIE" ? "bg-gradient-to-r from-red-400 via-orange-300 to-yellow-500" : takeover.type === "SUPER_TACKLE" ? "bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400" : "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600"} drop-shadow-[0_0_40px_rgba(234,179,8,0.4)] mb-4 animate-in zoom-in-75 duration-300`}>
              {takeover.type}
            </h1>

            <p className="text-xl font-bold uppercase tracking-wider text-slate-200 bg-slate-900/65 border border-white/5 px-8 py-3 rounded-full backdrop-blur-md mt-6 shadow-xl">
              {takeover.message}
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes ticker-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes broadcast-shake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(-1px, 1px, 0); }
          50% { transform: translate3d(1px, -1px, 0); }
          75% { transform: translate3d(-1px, -1px, 0); }
        }
      `}</style>

    </div>
  );
}

