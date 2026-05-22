"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import { ArrowLeft, RotateCcw, Share2, Flame, Play, Pause, Plus, Minus, Hourglass, X, Check, Shield, Swords, Zap, Settings, AlertTriangle, Maximize2, MonitorUp, Radio, BarChart2, Mic, MicOff, Camera, Video, Smartphone } from "lucide-react";
import { VoiceChatAdmin } from "@/components/VoiceChat";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { QRCodeSVG } from "qrcode.react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SportsMatchScorer({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scorer active selection state
  const [raidingTeam, setRaidingTeam] = useState("");
  const [selectedRaider, setSelectedRaider] = useState("");

  // Timer Ref
  const [raidTimer, setRaidTimer] = useState(30);
  const [matchClockRemaining, setMatchClockRemaining] = useState(600);
  const [matchClockRunning, setMatchClockRunning] = useState(false);
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [editClockMinutes, setEditClockMinutes] = useState("0");
  const [editClockSeconds, setEditClockSeconds] = useState("00");
  const [timerRunning, setTimerRunning] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMicPanel, setShowMicPanel] = useState(false);
  const [isMicLive, setIsMicLive] = useState(false);
  const [voiceSocket, setVoiceSocket] = useState(null);
  const [cameraSocket, setCameraSocket] = useState(null);
  const timerIntervalRef = useRef(null);
  const socketRef = useRef(null);
  const voiceSocketRef = useRef(null);
  const [showCameraPanel, setShowCameraPanel] = useState(false);

  // Hook into the dedicated camera room purely as a viewer to check if the camera is LIVE
  const { isLive: isCameraLive } = useVoiceChat(cameraSocket, `${matchId}_camera`, false);

  // ─── RAID RESOLUTION MODAL STATE ───
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveDefendersOut, setResolveDefendersOut] = useState([]);  // Selected defender names
  const [resolveBonus, setResolveBonus] = useState(false);
  const [resolveRaiderOut, setResolveRaiderOut] = useState(false);
  const [resolveTackler, setResolveTackler] = useState("");
  const [resolveTouchPoints, setResolveTouchPoints] = useState(0);
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const showAllOutConfirm = null;
  const setShowAllOutConfirm = () => {};

  // ─── ALL OUT CONFIRMATION MODAL ───
  // ─── TURN STATE: tracks which team should raid next ───
  // Load match from DB and initialize sockets
  useEffect(() => {
    fetchMatchDetails();

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Connected to socket server for sports scoring");
      socket.emit("join-sports-match", matchId);
    });

    socket.on("sports-score-update", (updatedMatch) => {
      console.log("📡 Scoring page received sports-score-update", updatedMatch);
      setMatch(updatedMatch);
      if (updatedMatch.kabaddiState) {
        setRaidTimer(updatedMatch.kabaddiState.raidTimer ?? 30);
        if (!updatedMatch.kabaddiState.isRaidActive) {
          setTimerRunning(false);
        }
      }
      if (updatedMatch.matchClock) {
        setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
        setMatchClockRunning(Boolean(updatedMatch.matchClock.running));
      }
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      socket.disconnect();
    };
  }, [matchId]);

  // ── Voice socket (separate connection for WebRTC signalling) ──
  useEffect(() => {
    const vs = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    voiceSocketRef.current = vs;
    setVoiceSocket(vs);
    const cs = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setCameraSocket(cs);
    return () => {
      vs.disconnect();
      cs.disconnect();
    };
  }, []);

  // Client timer loop
  useEffect(() => {
    if (timerRunning || matchClockRunning) {
      timerIntervalRef.current = setInterval(() => {
        postScoreEvent("TIMER_TICK");
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, matchClockRunning]);

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sports-matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        if (data.kabaddiState) setRaidTimer(data.kabaddiState.raidTimer ?? 30);
        if (data.matchClock) {
          setMatchClockRemaining(data.matchClock.remaining ?? 0);
          setMatchClockRunning(Boolean(data.matchClock.running));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── CORE API HELPER ───
  const postScoreEvent = async (eventType, payload = {}) => {
    try {
      const res = await fetch(`${API_URL}/api/sports-matches/${matchId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, payload })
      });
      if (res.ok) {
        const updatedMatch = await res.json();
        setMatch(updatedMatch);
        if (updatedMatch.kabaddiState) setRaidTimer(updatedMatch.kabaddiState.raidTimer ?? 30);
        if (updatedMatch.matchClock) {
          setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
          setMatchClockRunning(Boolean(updatedMatch.matchClock.running));
        }
        return updatedMatch;
      }
    } catch (err) {
      console.error("Failed to post score event", err);
    }
    return null;
  };

  // ─── UNDO ───
  const handleUndo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sports-matches/${matchId}/undo`, {
        method: "POST"
      });
      if (res.ok) {
        const updatedMatch = await res.json();
        setMatch(updatedMatch);
        if (updatedMatch.matchClock) {
          setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
          setMatchClockRunning(Boolean(updatedMatch.matchClock.running));
        }
        if (!updatedMatch.kabaddiState.isRaidActive) {
          setTimerRunning(false);
          setRaidTimer(30);
        }
      }
    } catch (err) {
      console.error("Undo failed", err);
    }
  };

  // ═══════════════════════════════════════════════════
  // RAID LIFECYCLE
  // ═══════════════════════════════════════════════════

  // 1. START RAID
  const handleStartRaid = async () => {
    const nextTeam = match?.kabaddiState?.nextRaidingTeam;
    if (!nextTeam) {
      alert("Please choose who raids first from toss setup.");
      return;
    }
    if (!selectedRaider) {
      alert("Please select the raider first.");
      return;
    }
    setRaidTimer(30);
    setTimerRunning(true);
    setResolveTouchPoints(0);
    setResolveDefendersOut([]);
    setResolveBonus(false);
    setResolveRaiderOut(false);
    setResolveTackler("");

    await postScoreEvent("START_RAID", {
      raider: selectedRaider
    });

  };

  const handleSetFirstRaid = async (team) => {
    await postScoreEvent("SET_FIRST_RAID", { team });
    setSelectedRaider("");
  };

  const handleOverrideTurn = async () => {
    const nextTeam = match?.kabaddiState?.nextRaidingTeam || "teamA";
    const overrideTeam = nextTeam === "teamA" ? "teamB" : "teamA";
    const ok = window.confirm(`Override official raid turn to ${match[overrideTeam]?.name}? This affects official match flow.`);
    if (!ok) return;
    await postScoreEvent("OVERRIDE_RAID_TURN", { team: overrideTeam });
    setSelectedRaider("");
  };

  // 2. END RAID → OPEN RESOLUTION MODAL
  // 3. RESOLVE RAID (compound commit)
  const handleResolveRaid = async () => {
    if (resolveTouchPoints > 0 && resolveDefendersOut.length !== resolveTouchPoints) {
      alert(`Select exactly ${resolveTouchPoints} defender${resolveTouchPoints === 1 ? "" : "s"} out before committing.`);
      return;
    }
    if (resolveRaiderOut && !resolveTackler) {
      alert("Select the defender credited with the successful tackle.");
      return;
    }
    setTimerRunning(false);
    setResolveSubmitting(true);
    const currentRaidTeam = match.kabaddiState?.raidingTeam;
    const raider = match.kabaddiState?.currentRaider || selectedRaider;

    await postScoreEvent("RESOLVE_RAID", {
      team: currentRaidTeam,
      raider: raider,
      defendersOut: resolveDefendersOut,
      bonus: resolveBonus,
      raiderOut: resolveRaiderOut,
      tackler: resolveRaiderOut ? resolveTackler : "",
    });

    // Cleanup
    setSelectedRaider("");
    setRaidTimer(30);
    setShowResolveModal(false);
    setResolveDefendersOut([]);
    setResolveBonus(false);
    setResolveRaiderOut(false);
    setResolveTackler("");
    setResolveTouchPoints(0);
    setResolveSubmitting(false);
  };

  // EMPTY RAID shortcut (no modal needed)
  const handleEmptyRaid = async () => {
    setTimerRunning(false);
    setRaidTimer(30);
    await postScoreEvent("EMPTY_RAID");

    setSelectedRaider("");
    setResolveDefendersOut([]);
    setResolveBonus(false);
    setResolveRaiderOut(false);
    setResolveTackler("");
    setResolveTouchPoints(0);
  };

  // ─── MANUAL PLAYER STATE CONTROLS ───
  // ─── ALL OUT ───
  // ─── TIMEOUT ───
  const handleTimeout = async (team) => {
    await postScoreEvent("TIMEOUT", { team });
  };

  const handleOfficialClockToggle = async () => {
    if (matchClockRunning) {
      await postScoreEvent("PAUSE_OFFICIAL_CLOCK");
      return;
    }
    await postScoreEvent("RESUME_OFFICIAL_CLOCK");
  };

  const handleAdjustOfficialClock = async (seconds) => {
    const updatedMatch = await postScoreEvent("ADJUST_OFFICIAL_CLOCK", { seconds });
    const nextRemaining = updatedMatch?.matchClock?.remaining;
    if (typeof nextRemaining === "number") {
      setEditClockMinutes(String(Math.floor(Math.max(nextRemaining, 0) / 60)));
      setEditClockSeconds(String(Math.max(nextRemaining, 0) % 60).padStart(2, "0"));
    }
  };

  const openClockEditor = () => {
    const safe = Math.max(matchClockRemaining, 0);
    setEditClockMinutes(String(Math.floor(safe / 60)));
    setEditClockSeconds(String(safe % 60).padStart(2, "0"));
    setClockEditorOpen(true);
  };

  const handleManualClockSave = async () => {
    if (isRaidActive) {
      alert("Manual clock editing is locked during a live raid. Pause after the raid decision or use quick corrections only.");
      return;
    }
    const minutes = Math.max(Number(editClockMinutes || 0), 0);
    const seconds = Math.max(Math.min(Number(editClockSeconds || 0), 59), 0);
    await postScoreEvent("SET_OFFICIAL_CLOCK", { remaining: (minutes * 60) + seconds });
    setClockEditorOpen(false);
  };

  const handleAllOut = () => {};

  // ─── HALF END ───
  const handleEndHalf = async () => {
    setTimerRunning(false);
    setRaidTimer(30);
    await postScoreEvent("HALF_END");
    setSelectedRaider("");
  };

  // ─── COMPLETE MATCH ───
  const handleCompleteMatch = async () => {
    const confirm = window.confirm("Are you sure you want to complete this match and freeze the score sheet?");
    if (!confirm) return;

    let winner = "Tie";
    if (match.teamA.score > match.teamB.score) winner = match.teamA.name;
    else if (match.teamB.score > match.teamA.score) winner = match.teamB.name;

    try {
      const res = await fetch(`${API_URL}/api/sports-matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", winner })
      });
      if (res.ok) {
        router.push("/admin/sports");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPublicMatchUrl = () => {
    if (typeof window === "undefined") return `/live/kabaddi/${matchId}`;
    return `${window.location.origin}/live/kabaddi/${matchId}`;
  };

  const copyPublicMatchLink = async () => {
    const url = getPublicMatchUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert("Kabaddi live link copied.");
    } catch {
      window.prompt("Copy Kabaddi live link", url);
    }
  };

  const enterFullscreen = async () => {
    if (typeof document === "undefined") return;
    const target = document.getElementById("kabaddi-control-room") || document.documentElement;
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

  // ═══════════════════════════════════════════════════
  // HELPER: toggle defender in resolve list
  // ═══════════════════════════════════════════════════
  const toggleDefenderOut = (playerName) => {
    if (resolveTackler === playerName) setResolveTackler("");
    setResolveDefendersOut(prev => {
      if (prev.includes(playerName)) return prev.filter(n => n !== playerName);
      if (resolveTouchPoints > 0 && prev.length >= resolveTouchPoints) return prev;
      return [...prev, playerName];
    });
  };

  // ═══════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════
  const isRaidActive = match?.kabaddiState?.isRaidActive || false;
  const currentRaidingTeam = match?.kabaddiState?.raidingTeam || "";
  const currentRaider = match?.kabaddiState?.currentRaider || "";
  const isDoOrDie = match?.kabaddiState?.doOrDie || false;
  const nextRaidingTeam = match?.kabaddiState?.nextRaidingTeam || "";
  const suggestedRaidingTeam = nextRaidingTeam;
  const defendingTeamKey = currentRaidingTeam === "teamA" ? "teamB" : currentRaidingTeam === "teamB" ? "teamA" : "";
  const nextRaidTeam = match?.[suggestedRaidingTeam] || null;
  const defendingActiveCount = defendingTeamKey ? (match?.[defendingTeamKey]?.activePlayerIds?.length || 0) : 0;
  const bonusDisabled = isRaidActive && defendingActiveCount < 6;

  // Preview points in modal
  const previewRaidTeamPts = resolveTouchPoints + (resolveBonus ? 1 : 0);
  const previewDefTeamPts = resolveRaiderOut ? (
    // auto-detect super tackle preview
    match && defendingTeamKey && ((match[defendingTeamKey]?.activePlayerIds?.length || 0)) <= 3 ? 2 : 1
  ) : 0;

  // Auto-detect potential all-out in modal (preview only)
  const previewDefActiveAfter = match && defendingTeamKey
    ? (match[defendingTeamKey]?.activePlayerIds?.length || 0) - resolveTouchPoints
    : 99;
  const previewAllOut = previewDefActiveAfter <= 0 && resolveDefendersOut.length > 0;
  const formatClock = (seconds = 0) => {
    const safe = Math.max(seconds, 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };
  const isClutchClock = match?.matchClock?.mode === "SMART_CLUTCH" && matchClockRemaining <= (match?.matchClock?.clutchThreshold ?? 0);

  // ═══════════════════════════════════════════════════
  // LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a1e] flex items-center justify-center text-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading scorer console...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#070a1e] flex items-center justify-center text-white p-8 text-center font-bold text-lg">
        Match record not found. Check match ID.
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER TEAM LINEUP SIDEBAR
  // ═══════════════════════════════════════════════════
  const getPlayerStats = (teamKey, playerName) => {
    const stats = match.playerStats || {};
    return stats[`${teamKey}:${playerName}`] || {};
  };

  const percent = (part = 0, total = 0) => {
    if (!total) return "0%";
    return `${Math.round((part / total) * 100)}%`;
  };

  const renderTeamSidebar = (teamKey) => {
    const team = match[teamKey];
    const isThisTeamRaiding = currentRaidingTeam === teamKey;
    const activeCount = team.activePlayerIds?.length || 0;
    const outCount = team.outPlayerIds?.length || 0;

    return (
      <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        {/* Team header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-base font-black truncate">{team.name}</h2>
          <div className="flex items-center gap-2">
            {isThisTeamRaiding && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                Raiding
              </span>
            )}
            <div className="w-4 h-4 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: team.color }} />
          </div>
        </div>

        {/* Active/Out count */}
        <div className="flex gap-2 mb-4">
          <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
            Mat {activeCount}/7
          </span>
          <span className="text-[10px] font-black tracking-wider uppercase text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
            Out {outCount}
          </span>
        </div>

        {/* Player list */}
        <div className="space-y-2 mb-6">
          {team.players.map((player) => {
            const isActive = team.activePlayerIds?.includes(player.name);
            const isOut = team.outPlayerIds?.includes(player.name);
            const outOrder = team.outPlayerIds?.indexOf(player.name) ?? -1;
            const isCurrentRaider = currentRaider === player.name && isThisTeamRaiding;
            const stats = getPlayerStats(teamKey, player.name);
            const totalPoints = stats.totalPoints || 0;
            const raidSuccess = percent(stats.successfulRaids, stats.totalRaids);
            const tackleSuccess = percent(stats.successfulTackles, stats.totalTacklesAttempted);

            return (
              <div
                key={player.name}
                className={`p-3 rounded-2xl border transition group ${isCurrentRaider
                    ? "bg-violet-600/25 border-violet-500 shadow-lg shadow-violet-500/10"
                    : isActive
                      ? "bg-slate-950/40 border-slate-800/50 hover:bg-slate-950/70"
                      : "bg-slate-900/10 border-slate-900/40 opacity-50"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${isCurrentRaider ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                      #{player.jerseyNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{player.name}</p>
                      <p className="text-[9px] text-slate-500 font-semibold uppercase">{player.role}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isCurrentRaider
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/15 text-rose-500 border border-rose-500/20"
                    }`}>
                    {isCurrentRaider ? "Raider" : isActive ? "Mat" : `Out ${outOrder + 1}`}
                  </span>
                </div>

                {showStats && (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-1.5" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
                      <div className="rounded-lg border border-slate-800/70 bg-black/20 px-2 py-1.5 text-center">
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-500">Pts</p>
                        <p className="mt-0.5 text-[11px] font-black text-white">{totalPoints}</p>
                      </div>
                      <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 px-2 py-1.5 text-center">
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-500">Raid%</p>
                        <p className="mt-0.5 text-[11px] font-black text-violet-200">{raidSuccess}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2 py-1.5 text-center">
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-500">Tackle%</p>
                        <p className="mt-0.5 text-[11px] font-black text-emerald-200">{tackleSuccess}</p>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-500">R {stats.successfulRaids || 0}/{stats.totalRaids || 0}</span>
                      <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-500">T {stats.successfulTackles || 0}/{stats.totalTacklesAttempted || 0}</span>
                      <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-500">TP {stats.touchPoints || 0}</span>
                      <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-500">BP {stats.bonusPoints || 0}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Roster Actions */}
        <div className="space-y-2 pt-4 border-t border-slate-800/50">
          <button
            onClick={() => handleTimeout(teamKey)}
            disabled={(match.kabaddiState?.timeoutsLeft?.[teamKey] ?? 0) === 0}
            className="w-full py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition disabled:opacity-30"
          >
            ⏸ Time Out ({match.kabaddiState?.timeoutsLeft?.[teamKey] ?? 0} left)
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div id="kabaddi-control-room" className="min-h-screen bg-[#060a1f] text-white font-sans overflow-y-auto pb-20">
      {/* ── Top Scorer Header ── */}
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/admin/sports" className="p-2 hover:bg-white/5 rounded-full transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider bg-linear-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Kabaddi Control Room</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{match.name} - {match.venue}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={enterFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-black uppercase tracking-wider transition"
            title="Fullscreen Control Room"
          >
            <Maximize2 size={15} /> Fullscreen
          </button>
          <Link
            href={`/live/kabaddi/${matchId}?fullscreen=true`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg shadow-violet-500/20"
          >
            <MonitorUp size={15} /> Overlay
          </Link>
          <Link
            href={`/live/kabaddi/${matchId}`}
            target="_blank"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-500/20"
          >
            <Radio size={15} /> Public Live
          </Link>
          <button
            onClick={() => setShowCameraPanel(s => !s)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition border ${
              isCameraLive
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse"
                : showCameraPanel
                  ? "bg-slate-700 border-slate-600 text-white shadow-lg"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title="Connect Mobile Camera"
          >
            {isCameraLive ? <Video size={15} /> : <Camera size={15} />}
            <span className="hidden lg:inline">{isCameraLive ? "Cam Live" : "Mobile Cam"}</span>
          </button>
          <button
            onClick={() => setShowStats(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition border ${
              showStats
                ? "bg-violet-600/30 border-violet-500/60 text-violet-300 shadow-lg shadow-violet-500/10"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title="Toggle player analytics stats"
          >
            <BarChart2 size={14} />
            <span className="hidden sm:inline">{showStats ? "Stats ON" : "Stats"}</span>
          </button>
          <button
            onClick={copyPublicMatchLink}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            title="Share public Kabaddi live link"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={() => setShowMicPanel(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition border ${
              isMicLive 
                ? "bg-red-600/30 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" 
                : showMicPanel
                  ? "bg-slate-700 border-slate-600 text-white shadow-lg"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title="Toggle mic panel"
          >
            {isMicLive && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
            {showMicPanel ? <Minus size={14} /> : <Mic size={14} />}
            <span className="hidden sm:inline">{isMicLive ? "Mic Live" : showMicPanel ? "Hide Mic Panel" : "Show Mic Panel"}</span>
          </button>
        </div>
      </header>

      {/* ── FLOATING MIC PANEL (Always mounted to keep broadcast alive) ── */}
      {voiceSocket && (
        <div className={`fixed top-20 right-4 z-[200] w-80 transition-all duration-300 ${showMicPanel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
          <div className="bg-slate-950/95 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-red-300">Live Commentary Mic</span>
              </div>
              <button onClick={() => setShowMicPanel(false)} className="text-slate-500 hover:text-white text-xs font-black flex items-center justify-center p-1 bg-white/5 rounded-lg">
                <Minus size={14} />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mb-3 uppercase tracking-wider">Your voice streams to all viewers on the public live page in real-time. Minimize this panel to continue scoring.</p>
            <VoiceChatAdmin
              socket={voiceSocket}
              roomId={`kabaddi-${matchId}`}
              currentAdminId={matchId}
              onLiveChange={setIsMicLive}
            />
          </div>
        </div>
      )}

      {/* Camera Connect Panel */}
      {showCameraPanel && (
        <div className="p-4 border-b border-white/5 bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 justify-center">
          <button onClick={() => setShowCameraPanel(false)} className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition">
            <X size={16} />
          </button>
          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-xl shadow-xl shadow-black/50">
              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/camera/kabaddi/${matchId}`} size={160} />
            </div>
          </div>
          <div className="max-w-md text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <Smartphone size={24} className={isCameraLive ? "text-emerald-400" : "text-slate-400"} />
              <h3 className="text-lg font-black uppercase tracking-widest text-white">Live Mobile Camera</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-semibold">
              Scan this QR code with a mobile phone to instantly turn it into a wireless broadcast camera for this match. Mount the phone on a tripod for the best stadium view!
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isCameraLive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Status: {isCameraLive ? <span className="text-emerald-400">Connected & Live</span> : "Waiting..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Scoreboard Layout */}
      <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-6 mt-4">

        {/* ==================== LEFT SIDEBAR: TEAM A LINEUP ==================== */}
        {renderTeamSidebar("teamA")}

        {/* ==================== CENTER SCORING CONSOLE ==================== */}
        <div className="lg:col-span-6 flex flex-col gap-6">

          {/* Main Score & Timer Card */}
          <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-600/5 rounded-full blur-[80px]"></div>

            <div className={`relative z-10 mx-auto mb-5 max-w-sm rounded-2xl border px-5 py-3 text-center transition-all ${isClutchClock
                ? "border-red-500/35 bg-red-500/10 shadow-[0_0_28px_rgba(239,68,68,0.18)] animate-pulse"
                : "border-slate-800/70 bg-slate-950/40 shadow-[0_0_22px_rgba(255,255,255,0.04)]"
              }`}>
              <p className={`text-[9px] font-black uppercase tracking-[0.28em] ${isClutchClock ? "text-red-200" : "text-slate-500"}`}>
                Half {match.kabaddiState?.half} - Official Time
              </p>
              <p className={`mt-1 text-4xl font-black tracking-tight ${isClutchClock ? "text-red-200 drop-shadow-[0_0_16px_rgba(248,113,113,0.4)]" : "text-white"}`}>
                {formatClock(matchClockRemaining)}
              </p>
              {!matchClockRunning && (
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">Official time stopped</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOfficialClockToggle}
                  disabled={matchClockRemaining <= 0 || match?.matchClock?.state === "COMPLETED"}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-40 ${matchClockRunning
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/18"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/18"
                    }`}
                >
                  {matchClockRunning ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                  {matchClockRunning ? "Pause Clock" : "Resume Clock"}
                </button>
                <button
                  type="button"
                  onClick={clockEditorOpen ? () => setClockEditorOpen(false) : openClockEditor}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 hover:text-white"
                >
                  <Settings size={13} />
                  {clockEditorOpen ? "Close Edit" : "Edit Clock"}
                </button>
              </div>

              {match?.matchClock?.state === "HALFTIME" && match?.kabaddiState?.half === 1 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => postScoreEvent("HALF_END")}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/50 bg-violet-600/20 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-violet-300 transition hover:bg-violet-600/30 shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse"
                  >
                    Start 2nd Half Setup
                  </button>
                  <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Clock will remain paused until the first raid of Half 2 is initiated.
                  </p>
                </div>
              )}

              {clockEditorOpen && (
                <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3 text-left">
                  <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Clock Controls</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "-1m", seconds: -60, icon: Minus },
                      { label: "-10s", seconds: -10, icon: Minus },
                      { label: "+10s", seconds: 10, icon: Plus },
                      { label: "+1m", seconds: 60, icon: Plus },
                    ].map(({ label, seconds, icon: Icon }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleAdjustOfficialClock(seconds)}
                        disabled={match?.matchClock?.state === "COMPLETED"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-950/55 px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        title={`Adjust official clock ${label}`}
                      >
                        <Icon size={11} />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800/70 bg-black/20 p-3">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Manual Time Edit</p>
                    <div className="flex items-center gap-2">
                      <input
                        value={editClockMinutes}
                        onChange={(e) => setEditClockMinutes(e.target.value.replace(/\D/g, "").slice(0, 2))}
                        disabled={isRaidActive}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm font-black text-white outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                        inputMode="numeric"
                      />
                      <span className="text-slate-500 font-black">:</span>
                      <input
                        value={editClockSeconds}
                        onChange={(e) => setEditClockSeconds(e.target.value.replace(/\D/g, "").slice(0, 2))}
                        onBlur={() => setEditClockSeconds(String(Math.max(Math.min(Number(editClockSeconds || 0), 59), 0)).padStart(2, "0"))}
                        disabled={isRaidActive}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm font-black text-white outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={handleManualClockSave}
                        disabled={isRaidActive || match?.matchClock?.state === "COMPLETED"}
                        className="rounded-lg border border-violet-500/35 bg-violet-500/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-violet-200 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                    {isRaidActive && (
                      <p className="mt-2 text-[9px] font-bold text-amber-300">Manual edit is locked during a live raid.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-center">
              <div className="flex-1">
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{match.teamA.name}</h4>
                <h2 className="text-6xl font-black tracking-tight mt-1 text-white">{match.teamA.score}</h2>
              </div>
              <div className="px-4">
                <span className="text-slate-700 font-bold text-3xl">:</span>
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{match.teamB.name}</h4>
                <h2 className="text-6xl font-black tracking-tight mt-1 text-white">{match.teamB.score}</h2>
              </div>
            </div>

            {/* Timer circle */}
            <div className="flex flex-col items-center justify-center mt-6">
              <div className={`hidden mb-4 rounded-2xl border px-5 py-3 text-center ${isClutchClock ? "border-red-500/30 bg-red-500/10 shadow-[0_0_24px_rgba(239,68,68,0.16)]" : "border-slate-800/70 bg-slate-950/40"}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Official Match Clock</p>
                <p className={`mt-1 text-3xl font-black ${isClutchClock ? "text-red-300" : "text-white"}`}>{formatClock(matchClockRemaining)}</p>
                {!matchClockRunning && (
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">Official time stopped</p>
                )}
              </div>
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all ${timerRunning
                  ? isDoOrDie || raidTimer <= 5
                    ? "border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.45)] animate-pulse"
                    : "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  : "border-slate-800"
                }`}>
                <span className={`text-4xl font-black ${timerRunning && (isDoOrDie || raidTimer <= 5) ? "text-red-400" : "text-white"}`}>{raidTimer}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isDoOrDie ? "text-red-400" : "text-slate-500"}`}>
                  {isDoOrDie ? "Do or Die" : "Raid Clock"}
                </span>
              </div>
            </div>

            {/* Quick Half & Status */}
            <div className="flex justify-center gap-6 mt-6 text-xs text-slate-400 font-bold">
              <span>Half: <strong className="text-white">{match.kabaddiState?.half}</strong></span>
              <span>•</span>
              <span>Clock: <strong className={matchClockRunning ? "text-emerald-400" : "text-amber-300"}>{matchClockRunning ? "RUNNING" : (match.matchClock?.state || "PAUSED")}</strong></span>
              <span>•</span>
              <span>Raider: <strong className="text-violet-400">{currentRaider || "None"}</strong></span>
              <span>•</span>
              <span>Status: <strong className={isRaidActive ? "text-red-400" : "text-emerald-400"}>{isRaidActive ? "RAID LIVE" : "BREAK"}</strong></span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* SCORER CONTROLS PANEL */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-6 shadow-xl backdrop-blur-md">

            {!isRaidActive ? (
              /* ─── PRE-RAID: Select team & raider, Start Raid ─── */
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Play size={16} fill="currentColor" /> Engine Control Panel
                </h3>

                {/* Turn indicator */}
                {!suggestedRaidingTeam ? (
                  <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">Toss setup: who raids first?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleSetFirstRaid("teamA")} className="rounded-xl border border-amber-500/25 bg-slate-950/50 px-3 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-500/15 transition">{match.teamA.name}</button>
                      <button onClick={() => handleSetFirstRaid("teamB")} className="rounded-xl border border-amber-500/25 bg-slate-950/50 px-3 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-500/15 transition">{match.teamB.name}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2">
                    <Swords size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 flex-1">
                      Next raid: <strong className="text-white">{match[suggestedRaidingTeam]?.name}</strong> raiding
                    </span>
                    <button onClick={handleOverrideTurn} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 transition">
                      <Settings size={12} /> Override
                    </button>
                  </div>
                )}

                {/* Team selection with turn-locking visual */}
                <div className="hidden">
                  <button
                    onClick={() => { setRaidingTeam("teamA"); setSelectedRaider(""); }}
                    className={`py-3 rounded-2xl border text-center transition relative ${raidingTeam === "teamA"
                        ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                        : suggestedRaidingTeam && suggestedRaidingTeam !== "teamA"
                          ? "bg-slate-950/30 border-slate-800/30 text-slate-600 opacity-50"
                          : "bg-slate-950/30 border-slate-800/50 text-slate-400 hover:bg-slate-950/70"
                      }`}
                  >
                    {suggestedRaidingTeam && suggestedRaidingTeam !== "teamA" && (
                      <span className="absolute -top-2 -right-2 text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-black border border-amber-500/30">
                        Engine says wait
                      </span>
                    )}
                    🚀 {match.teamA.name} Raids
                  </button>
                  <button
                    onClick={() => { setRaidingTeam("teamB"); setSelectedRaider(""); }}
                    className={`py-3 rounded-2xl border text-center transition relative ${raidingTeam === "teamB"
                        ? "bg-violet-600/25 border-violet-500 text-white font-bold"
                        : suggestedRaidingTeam && suggestedRaidingTeam !== "teamB"
                          ? "bg-slate-950/30 border-slate-800/30 text-slate-600 opacity-50"
                          : "bg-slate-950/30 border-slate-800/50 text-slate-400 hover:bg-slate-950/70"
                      }`}
                  >
                    {suggestedRaidingTeam && suggestedRaidingTeam !== "teamB" && (
                      <span className="absolute -top-2 -right-2 text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-black border border-amber-500/30">
                        Engine says wait
                      </span>
                    )}
                    🚀 {match.teamB.name} Raids
                  </button>
                </div>

                {/* Raider selection */}
                {suggestedRaidingTeam && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Raider from {match[suggestedRaidingTeam]?.name}</label>
                    <select
                      value={selectedRaider}
                      onChange={(e) => setSelectedRaider(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500 transition"
                    >
                      <option value="">-- Choose Raider --</option>
                      {match[suggestedRaidingTeam]?.players
                        ?.filter(p => match[suggestedRaidingTeam].activePlayerIds?.includes(p.name))
                        .map(p => (
                          <option key={p.name} value={p.name}>#{p.jerseyNumber} - {p.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Do or Die toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-2xl border border-slate-800/50 mb-6">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className={isDoOrDie ? "text-yellow-500" : "text-slate-500"} />
                    <div>
                      <p className="text-xs font-bold">Do or Die Status</p>
                      <p className="text-[9px] text-slate-500 font-medium">System activates raid 3 after two empty raids</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isDoOrDie ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-slate-800/60 border-slate-700 text-slate-400"}`}>
                    {isDoOrDie ? "Active" : "Pending"}
                  </span>
                </div>

                <button
                  onClick={handleStartRaid}
                  disabled={!suggestedRaidingTeam || !selectedRaider}
                  className="w-full py-4 bg-linear-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 disabled:opacity-40 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-lg shadow-violet-500/25 active:scale-95"
                >
                  ▶ Start Live Raid
                </button>
              </div>
            ) : (
              /* ─── RAID ACTIVE: End Raid buttons ─── */
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 mb-6">
                  <span className="flex items-center gap-1.5 text-red-500 text-xs font-black uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    Raid Active
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Raider: <strong className="text-white">{currentRaider}</strong> ({match[currentRaidingTeam]?.name})
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Scoring Actions</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((points) => (
                        <button
                          key={points}
                          onClick={() => {
                            setTimerRunning(false);
                            setResolveTouchPoints(points);
                            setResolveDefendersOut([]);
                          }}
                          className={`h-12 rounded-xl border text-sm font-black transition ${resolveTouchPoints === points ? "border-violet-400 bg-violet-500/25 text-white" : "border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800"}`}
                        >
                          +{points}
                        </button>
                      ))}
                      <button
                        onClick={handleEmptyRaid}
                        className="h-12 rounded-xl border border-slate-700 bg-slate-800/70 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-700 transition"
                      >
                        Empty
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => !bonusDisabled && setResolveBonus(!resolveBonus)}
                    disabled={bonusDisabled}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition ${resolveBonus ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300" : bonusDisabled ? "bg-slate-950/30 border-slate-800/50 text-slate-600 cursor-not-allowed" : "bg-slate-950/40 border-slate-800/50 text-slate-300 hover:bg-slate-950/70"}`}
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider"><Zap size={15} /> Bonus</span>
                    <span className="text-[10px] font-bold">{bonusDisabled ? "Disabled: defenders < 6" : resolveBonus ? "Selected +1" : "Tap for +1"}</span>
                  </button>

                  {resolveTouchPoints > 0 && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/35 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select defenders out</p>
                        <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-300">{resolveDefendersOut.length}/{resolveTouchPoints}</span>
                      </div>
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {match[defendingTeamKey]?.players
                          ?.filter(p => match[defendingTeamKey].activePlayerIds?.includes(p.name))
                          .map((player) => {
                            const isSelected = resolveDefendersOut.includes(player.name);
                            return (
                              <button
                                key={player.name}
                                onClick={() => toggleDefenderOut(player.name)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${isSelected ? "bg-rose-500/15 border-rose-500/40" : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/70"}`}
                              >
                                <span className="text-xs font-bold text-white">#{player.jerseyNumber} {player.name}</span>
                                {isSelected && <Check size={14} className="text-rose-300" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const nextRaiderOut = !resolveRaiderOut;
                      setResolveRaiderOut(nextRaiderOut);
                      if (!nextRaiderOut) setResolveTackler("");
                    }}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition ${resolveRaiderOut ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-slate-950/40 border-slate-800/50 text-slate-300 hover:bg-slate-950/70"}`}
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider"><Shield size={15} /> Raider Out</span>
                    <span className="text-[10px] font-bold">{resolveRaiderOut && previewDefTeamPts === 2 ? "Super tackle auto" : resolveRaiderOut ? "Defense +1" : "Optional"}</span>
                  </button>

                  {resolveRaiderOut && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/35 p-4">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Credit successful tackler</label>
                      <select
                        value={resolveTackler}
                        onChange={(e) => setResolveTackler(e.target.value)}
                        className="w-full rounded-xl border border-slate-800/60 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-200 outline-none focus:border-violet-500"
                      >
                        <option value="">Select defender</option>
                        {match[defendingTeamKey]?.players
                          ?.filter(p => match[defendingTeamKey].activePlayerIds?.includes(p.name) && !resolveDefendersOut.includes(p.name))
                          .map((player) => (
                            <option key={player.name} value={player.name}>#{player.jerseyNumber} - {player.name}</option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/35 p-3">
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{match[currentRaidingTeam]?.name}</p>
                      <p className="text-2xl font-black text-emerald-400">+{previewRaidTeamPts}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{match[defendingTeamKey]?.name}</p>
                      <p className="text-2xl font-black text-rose-400">+{previewDefTeamPts}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleResolveRaid}
                    disabled={resolveSubmitting || (resolveTouchPoints > 0 && resolveDefendersOut.length !== resolveTouchPoints) || (resolveRaiderOut && !resolveTackler) || (!resolveBonus && resolveTouchPoints === 0 && !resolveRaiderOut)}
                    className="w-full py-4 rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-600 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-violet-500/25 transition disabled:opacity-40"
                  >
                    Commit Raid
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scorer Utilities */}
          <div className="flex gap-4">
            <button
              onClick={handleUndo}
              className="flex-1 py-3 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/50 text-slate-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> Undo Last Action
            </button>
            <button
              onClick={handleEndHalf}
              className="flex-1 py-3 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/50 text-slate-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
            >
              <Hourglass size={14} /> End Current Half
            </button>
          </div>

          <button
            onClick={handleCompleteMatch}
            className="w-full py-3.5 bg-red-600/15 border border-red-500/20 hover:bg-red-600/25 text-red-500 font-black text-xs uppercase tracking-widest rounded-2xl transition"
          >
            Freeze Scoreboard & Complete Match
          </button>
        </div>

        {/* ==================== RIGHT SIDEBAR: TEAM B LINEUP ==================== */}
        {renderTeamSidebar("teamB")}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* RAID RESOLUTION MODAL — The core of the rule engine UI                        */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showResolveModal && match && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ zIndex: 100 }}>
          <div className="bg-[#0d1228] border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0d1228] border-b border-slate-800/50 p-5 rounded-t-3xl z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Resolve Raid Outcome
                </h2>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  Raider: <span className="text-white">{currentRaider}</span> • {match[currentRaidingTeam]?.name}
                </p>
              </div>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-2 hover:bg-white/5 rounded-full transition text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* ─── SECTION 1: SELECT DEFENDERS ELIMINATED ─── */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Swords size={14} className="text-violet-400" />
                  Defenders Eliminated ({resolveDefendersOut.length})
                </h3>
                <p className="text-[10px] text-slate-500 mb-3 font-medium">Select which {match[defendingTeamKey]?.name} defenders were touched out this raid</p>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {match[defendingTeamKey]?.players
                    ?.filter(p => match[defendingTeamKey].activePlayerIds?.includes(p.name))
                    .map((player) => {
                      const isSelected = resolveDefendersOut.includes(player.name);
                      return (
                        <button
                          key={player.name}
                          onClick={() => toggleDefenderOut(player.name)}
                          className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${isSelected
                              ? "bg-rose-500/15 border-rose-500/40 shadow-md"
                              : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-950/70"
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${isSelected ? "bg-rose-500 border-rose-500" : "border-slate-600 bg-transparent"
                              }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              #{player.jerseyNumber}
                            </span>
                            <div className="text-left">
                              <p className="text-xs font-bold">{player.name}</p>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase">{player.role}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              Eliminated
                            </span>
                          )}
                        </button>
                      );
                    })}

                  {/* Empty state */}
                  {match[defendingTeamKey]?.players
                    ?.filter(p => match[defendingTeamKey].activePlayerIds?.includes(p.name))
                    .length === 0 && (
                      <p className="text-xs text-slate-500 font-bold text-center py-4">No active defenders on mat</p>
                    )}
                </div>
              </div>

              {/* ─── SECTION 2: BONUS POINT ─── */}
              <div className="border-t border-slate-800/50 pt-5">
                <button
                  onClick={() => setResolveBonus(!resolveBonus)}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition ${resolveBonus
                      ? "bg-yellow-500/15 border-yellow-500/40"
                      : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-950/70"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${resolveBonus ? "bg-yellow-500 border-yellow-500" : "border-slate-600 bg-transparent"
                      }`}>
                      {resolveBonus && <Check size={12} className="text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <Zap size={14} className="text-yellow-400" />
                        Bonus Point Earned
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium mt-0.5">+1 point, no revival or elimination</p>
                    </div>
                  </div>
                  {resolveBonus && (
                    <span className="text-sm font-black text-yellow-400">+1</span>
                  )}
                </button>
              </div>

              {/* ─── SECTION 3: RAIDER TACKLED ─── */}
              <div className="border-t border-slate-800/50 pt-5">
                <button
                  onClick={() => setResolveRaiderOut(!resolveRaiderOut)}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition ${resolveRaiderOut
                      ? "bg-rose-500/15 border-rose-500/40"
                      : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-950/70"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${resolveRaiderOut ? "bg-rose-500 border-rose-500" : "border-slate-600 bg-transparent"
                      }`}>
                      {resolveRaiderOut && <Check size={12} className="text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <Shield size={14} className="text-rose-400" />
                        Raider Tackled / Out
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                        {match[defendingTeamKey]?.name} gets {previewDefTeamPts === 2 ? "+2 (Super Tackle!)" : "+1"} point, raider benched
                      </p>
                    </div>
                  </div>
                  {resolveRaiderOut && (
                    <span className={`text-sm font-black ${previewDefTeamPts === 2 ? "text-amber-400" : "text-rose-400"}`}>
                      +{previewDefTeamPts} DEF
                    </span>
                  )}
                </button>

                {/* Super Tackle auto-detection notice */}
                {resolveRaiderOut && previewDefTeamPts === 2 && (
                  <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                    <Zap size={14} className="text-amber-400 shrink-0" />
                    <p className="text-[10px] text-amber-300 font-bold">
                      SUPER TACKLE auto-detected! Defending team has ≤3 active players → +2 points instead of +1
                    </p>
                  </div>
                )}
              </div>

              {/* ─── SECTION 4: ALL OUT PREVIEW ─── */}
              {previewAllOut && (
                <div className="border-t border-slate-800/50 pt-5">
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-400 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-red-400 uppercase">⚡ All Out Will Trigger!</p>
                      <p className="text-[10px] text-red-300/80 font-medium mt-0.5">
                        All {match[defendingTeamKey]?.name} defenders will be eliminated → {match[currentRaidingTeam]?.name} earns +2 bonus, all defenders revived
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECTION 5: LIVE POINT PREVIEW ─── */}
              <div className="border-t border-slate-800/50 pt-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Point Preview</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-2xl border text-center ${previewRaidTeamPts > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-950/30 border-slate-800/50"
                    }`}>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{match[currentRaidingTeam]?.name}</p>
                    <p className={`text-3xl font-black ${previewRaidTeamPts > 0 ? "text-emerald-400" : "text-slate-700"}`}>
                      +{previewRaidTeamPts}
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase">
                      {resolveDefendersOut.length > 0 && `${resolveDefendersOut.length} Touch`}
                      {resolveDefendersOut.length > 0 && resolveBonus && " + "}
                      {resolveBonus && "Bonus"}
                      {previewRaidTeamPts === 0 && "No Points"}
                      {previewAllOut && " + 2 All Out"}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${previewDefTeamPts > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-slate-950/30 border-slate-800/50"
                    }`}>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{match[defendingTeamKey]?.name}</p>
                    <p className={`text-3xl font-black ${previewDefTeamPts > 0 ? "text-rose-400" : "text-slate-700"}`}>
                      +{previewDefTeamPts}
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase">
                      {resolveRaiderOut ? (previewDefTeamPts === 2 ? "Super Tackle" : "Tackle") : "No Points"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#0d1228] border-t border-slate-800/50 p-5 rounded-b-3xl flex gap-3">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveRaid}
                disabled={resolveSubmitting}
                className="flex-2 py-3 bg-linear-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-violet-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {resolveSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check size={16} />
                    Commit Raid Outcome
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ALL OUT CONFIRMATION MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showAllOutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ zIndex: 100 }}>
          <div className="bg-[#0d1228] border border-red-500/30 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h3 className="text-base font-black text-red-400 uppercase mb-2">Confirm All Out</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">
              This will award <strong className="text-white">+2 points</strong> to <strong className="text-white">{match[showAllOutConfirm.team]?.name}</strong> and revive all {match[showAllOutConfirm.team === "teamA" ? "teamB" : "teamA"]?.name} players.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAllOutConfirm(null)}
                className="flex-1 py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAllOut(showAllOutConfirm.team)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-500/20"
              >
                ⚡ Confirm All Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
