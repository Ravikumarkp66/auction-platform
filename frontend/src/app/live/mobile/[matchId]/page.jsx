"use client";

import { useEffect, useRef, useState, use, Suspense } from "react";
import io from "socket.io-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Flame, RotateCcw, Mic2, Zap, Shield, Maximize, Minimize, Volume2, VolumeX, Mic } from "lucide-react";
import { useVoiceChat } from "@/hooks/useVoiceChat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function hex2rgba(hex = "#8b5cf6", alpha = 1) {
    if (!hex || hex.length < 7) return `rgba(139,92,246,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ── Tactical Mat Formation Dots ──────────────────────────────────────
function MatDots({ team, color, currentRaider, currentRaidingTeam, teamKey, isDefending, maxSlots = 7 }) {
    const activePlayers = team.activePlayerIds || [];
    const outPlayers = team.outPlayerIds || [];
    const allPlayers = team.players || [];

    const activeCount = activePlayers.length;
    const isSuperTackle = isDefending && activeCount > 0 && activeCount <= 3;
    const isAllOutDanger = isDefending && activeCount === 1;

    // Build ordered list of the starting 7
    const starting7 = allPlayers.slice(0, maxSlots);
    
    const dots = starting7.map((player) => {
        if (!player) return { status: "empty", player: null };
        const isActive = activePlayers.includes(player.name);
        const isOut = outPlayers.includes(player.name);
        const isRaiding = currentRaider === player.name && currentRaidingTeam === teamKey;
        const isNextIn = isOut && outPlayers[0] === player.name; // First in queue

        return {
            player,
            status: isRaiding ? "raiding" : isActive ? "active" : isNextIn ? "next-in" : isOut ? "out" : "empty",
        };
    });

    const renderDot = (dot, idx) => {
        let dotClass = "relative flex items-center justify-center transition-all duration-500 group cursor-pointer ";
        let innerStyle = {};
        
        if (dot.status === "raiding") {
            dotClass += "w-5 h-5 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse z-10";
            return (
                <div key={idx} className={dotClass}>
                    <Flame size={12} className="text-white" />
                    <span className="absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-amber-400 whitespace-nowrap z-20 bg-black/80 px-1.5 py-0.5 rounded shadow-lg">{dot.player?.name}</span>
                </div>
            );
        }
        
        if (dot.status === "active") {
            // Tactical alert states
            if (isAllOutDanger) {
                dotClass += "w-4 h-4 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] animate-ping";
            } else if (isSuperTackle) {
                dotClass += "w-4 h-4 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse";
            } else {
                dotClass += "w-4 h-4 rounded-full";
                innerStyle = { backgroundColor: color, boxShadow: `0 0 12px ${hex2rgba(color, 0.7)}` };
            }
            
            return (
                <div key={idx} className={dotClass} style={innerStyle}>
                    <div className="absolute inset-0 rounded-full opacity-40 bg-white/20"></div>
                    <span className="absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black whitespace-nowrap z-20 bg-black/80 px-1.5 py-0.5 rounded shadow-lg" style={{color: isAllOutDanger || isSuperTackle ? "#f87171" : color}}>{dot.player?.name}</span>
                </div>
            );
        }
        
        if (dot.status === "next-in") {
            dotClass += "w-4 h-4 rounded-full border-[1.5px] border-amber-400 bg-amber-400/10 shadow-[0_0_10px_rgba(251,191,36,0.4)] flex items-center justify-center";
            return (
                <div key={idx} className={dotClass}>
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                    <span className="absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-amber-400 whitespace-nowrap z-20 bg-black/80 px-1.5 py-0.5 rounded shadow-lg">NEXT IN: {dot.player?.name}</span>
                </div>
            );
        }
        
        if (dot.status === "out") {
            dotClass += "w-3.5 h-3.5 rounded-full border-2 border-red-500/40 bg-black/40";
            return (
                <div key={idx} className={dotClass}>
                    <span className="absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-red-400 whitespace-nowrap z-20 bg-black/80 px-1.5 py-0.5 rounded shadow-lg">{dot.player?.name}</span>
                </div>
            );
        }
        
        // Empty slot
        return <div key={idx} className="w-3.5 h-3.5 rounded-full bg-white/5 border border-white/10" />;
    };

    return (
        <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
            {dots.map(renderDot)}
        </div>
    );
}

// ── Out queue with names ─────────────────────────────────────────
function OutQueue({ team }) {
    const outIds = team.outPlayerIds || [];
    const players = team.players || [];
    if (outIds.length === 0) return null;

    const nextInPlayer = players.find(p => p.name === outIds[0]);

    return (
        <div className="mt-2 w-full flex flex-col items-center">
            <h4 className="text-[7px] uppercase tracking-[0.3em] font-black text-slate-500 mb-1">Next In</h4>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate max-w-[100px]">
                    {nextInPlayer?.name}
                </span>
            </div>
            {outIds.length > 1 && (
                <p className="text-[8px] font-black text-rose-400/60 mt-1 uppercase tracking-wider">
                    + {outIds.length - 1} more out
                </p>
            )}
        </div>
    );
}

// ── Player Stats Strip ─────────────────────────────────────────────
const STAT_MODES = ["points", "raids", "tackles"];
const STAT_LABELS = { points: "Top Points", raids: "Raid %", tackles: "Tackle %" };

function PlayerStatsStrip({ match, currentRaider, currentRaidingTeam }) {
    const [statMode, setStatMode] = useState(0);

    // Rotate stat mode every 4 seconds
    useEffect(() => {
        const t = setInterval(() => setStatMode(m => (m + 1) % STAT_MODES.length), 4000);
        return () => clearInterval(t);
    }, []);

    const buildPlayerStats = (team, teamKey) => {
        const players = team.players || [];
        return players
            .map(p => {
                const s = match.playerStats?.[`${teamKey}:${p.name}`] || {};
                const raidPct = s.totalRaids > 0 ? Math.round((s.successfulRaids / s.totalRaids) * 100) : 0;
                const tacklePct = s.totalTacklesAttempted > 0 ? Math.round((s.successfulTackles / s.totalTacklesAttempted) * 100) : 0;
                const totalPts = (s.touchPoints || 0) + (s.bonusPoints || 0) + (s.tacklePoints || 0);
                return { ...p, totalPts, raidPct, tacklePct, isRaiding: p.name === currentRaider && teamKey === currentRaidingTeam, teamKey };
            })
            .sort((a, b) => {
                const mode = STAT_MODES[statMode];
                if (mode === "points") return b.totalPts - a.totalPts;
                if (mode === "raids") return b.raidPct - a.raidPct;
                return b.tacklePct - a.tacklePct;
            });
    };

    const statsA = buildPlayerStats(match.teamA, "teamA");
    const statsB = buildPlayerStats(match.teamB, "teamB");
    const colorA = match.teamA?.color || "#8b5cf6";
    const colorB = match.teamB?.color || "#06b6d4";
    const mode = STAT_MODES[statMode];

    const PlayerCard = ({ player, color }) => (
        <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all ${
            player.isRaiding
                ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.15)]"
                : "border-white/[0.04] bg-black/20"
        }`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-black text-[11px]"
                style={{ borderColor: hex2rgba(color, 0.3), backgroundColor: hex2rgba(color, 0.08), color }}>
                {player.jerseyNumber ? `#${player.jerseyNumber}` : "—"}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black text-white leading-tight">{player.name}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: hex2rgba(color, 0.7) }}>{player.role || "Player"}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-black tabular-nums" style={{ color }}>
                    {mode === "points" ? player.totalPts
                        : mode === "raids" ? `${player.raidPct}%`
                        : `${player.tacklePct}%`}
                </p>
                {player.isRaiding && <p className="text-[7px] font-black text-amber-400 animate-pulse">⚡ RAIDING</p>}
            </div>
        </div>
    );

    return (
        <section className="rounded-[2rem] border border-white/[0.04] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[8px] uppercase tracking-[0.45em] font-black text-slate-400">Live Player Stats</h3>
                <div className="flex items-center gap-1">
                    {STAT_MODES.map((m, i) => (
                        <button
                            key={m}
                            onClick={() => setStatMode(i)}
                            className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border transition ${
                                i === statMode ? "bg-white/10 border-white/20 text-white" : "border-transparent text-slate-600 hover:text-slate-400"
                            }`}
                        >
                            {STAT_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorA }} />
                        <p className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: hex2rgba(colorA, 0.8) }}>{match.teamA.name}</p>
                    </div>
                    <div className="space-y-1.5">
                        {statsA.map(p => <PlayerCard key={p.name} player={p} color={colorA} />)}
                        {statsA.length === 0 && <p className="text-[9px] text-slate-600 italic py-2">No active players</p>}
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1.5 mb-2 flex-row-reverse">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorB }} />
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-right" style={{ color: hex2rgba(colorB, 0.8) }}>{match.teamB.name}</p>
                    </div>
                    <div className="space-y-1.5">
                        {statsB.map(p => <PlayerCard key={p.name} player={p} color={colorB} />)}
                        {statsB.length === 0 && <p className="text-[9px] text-slate-600 italic py-2">No active players</p>}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════
// MAIN BROADCAST COMPONENT
// ══════════════════════════════════════════════════════
function LiveBroadcastInner({ params }) {
    const unwrappedParams = use(params);
    const matchId = unwrappedParams.matchId;
    const searchParams = useSearchParams();
    const isFullscreenParam = searchParams.get("fullscreen") === "true";

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [raidTimer, setRaidTimer] = useState(30);
    const [matchClockRemaining, setMatchClockRemaining] = useState(600);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [raidIntro, setRaidIntro] = useState(null);
    const [takeover, setTakeover] = useState(null);
    const [rollbackCue, setRollbackCue] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
    const [voiceSocket, setVoiceSocket] = useState(null);
    const [cameraSocket, setCameraSocket] = useState(null);
    const [commentaryVolume, setCommentaryVolume] = useState(0.9);

    const timerIntervalRef = useRef(null);
    const previousMatchRef = useRef(null);
    const raidIntroTimeoutRef = useRef(null);
    const takeoverTimeoutRef = useRef(null);
    const rollbackTimeoutRef = useRef(null);
    const audioContextRef = useRef(null);
    const rootRef = useRef(null);
    const commentaryAudioRef = useRef(null);
    const videoRef = useRef(null);

    const isFullscreen = isFullscreenParam || isNativeFullscreen;

    // ── Voice and Camera sockets ──────────────────────────────────
    useEffect(() => {
        const vs = io(API_URL, { 
            transports: ["websocket", "polling"], 
            withCredentials: true, 
            forceNew: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        setVoiceSocket(vs);

        const cs = io(API_URL, { 
            transports: ["websocket", "polling"], 
            withCredentials: true, 
            forceNew: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        setCameraSocket(cs);

        return () => { vs.disconnect(); cs.disconnect(); };
    }, []);

    // ── useVoiceChat viewer hook ──────────────────────────────────────
    const voiceRoomId = voiceSocket ? `kabaddi-${matchId}` : null;
    const { isLive: isMicLive, audioRef: voiceAudioRef, changeVolume: setVoiceVolume } = useVoiceChat(voiceSocket, voiceRoomId, false);

    // ── Camera viewer hook ───────────────────────────────────────────
    const cameraRoomId = cameraSocket ? `${matchId}_camera` : null;
    const { remoteVideoStream, isLive: isCameraLive } = useVoiceChat(cameraSocket, cameraRoomId, false);

    useEffect(() => {
        if (voiceAudioRef?.current) {
            voiceAudioRef.current.volume = commentaryVolume;
        }
    }, [commentaryVolume]);

    // Attach incoming camera stream
    useEffect(() => {
        if (videoRef.current && remoteVideoStream) {
            videoRef.current.srcObject = remoteVideoStream;
        }
    }, [remoteVideoStream]);

    // ── Fullscreen API ──────────────────────────────────────────
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await rootRef.current?.requestFullscreen().catch(() => { });
        } else {
            await document.exitFullscreen().catch(() => { });
        }
    };

    useEffect(() => {
        const onFsChange = () => setIsNativeFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    // ── Audio ───────────────────────────────────────────────────
    const unlockAudio = () => {
        if (typeof window === "undefined") return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
            if (!audioContextRef.current) audioContextRef.current = new AC();
            if (audioContextRef.current.state === "suspended") audioContextRef.current.resume().catch(() => { });
        }
        
        // If voice commentary is ready but paused due to autoplay policy, play it now
        if (commentaryAudioRef.current && commentaryAudioRef.current.paused && commentaryAudioRef.current.srcObject) {
            commentaryAudioRef.current.play().catch(() => {});
        }
        setSoundEnabled(true);
    };

    const playTone = (frequency, duration = 0.14, type = "sine", gain = 0.05) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type; osc.frequency.value = frequency;
        amp.gain.value = gain;
        osc.connect(amp); amp.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + duration);
    };

    const playCue = (kind) => {
        if (!soundEnabled) return;
        switch (kind) {
            case "raid-start": playTone(270, 0.1, "sawtooth", 0.05); setTimeout(() => playTone(404, 0.1, "triangle", 0.04), 80); break;
            case "tick": playTone(840, 0.04, "square", 0.03); break;
            case "danger-tick": playTone(96, 0.08, "sine", 0.05); setTimeout(() => playTone(132, 0.05, "triangle", 0.035), 110); break;
            case "do-or-die": playTone(110, 0.2, "sawtooth", 0.06); setTimeout(() => playTone(82, 0.16, "sine", 0.05), 130); break;
            case "undo": playTone(520, 0.12, "triangle", 0.04); break;
            case "super-raid": playTone(180, 0.18, "sawtooth", 0.06); break;
            case "super-tackle": playTone(120, 0.16, "square", 0.06); break;
            case "all-out": playTone(92, 0.2, "sawtooth", 0.07); break;
            default: playTone(320, 0.08, "sine", 0.03);
        }
    };

    const fetchMatchDetails = async () => {
        try {
            const res = await fetch(`${API_URL}/api/sports-matches/${matchId}`);
            if (res.ok) {
                const data = await res.json();
                setMatch(data);
                if (data.kabaddiState) { setRaidTimer(data.kabaddiState.raidTimer); setIsTimerRunning(data.kabaddiState.isRaidActive); }
                if (data.matchClock) setMatchClockRemaining(data.matchClock.remaining ?? 0);
                previousMatchRef.current = data;
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchMatchDetails();
        const socket = io(API_URL, { transports: ["websocket", "polling"], withCredentials: true });
        socket.on("connect", () => { socket.emit("join-sports-match", matchId); });

        socket.on("sports-score-update", (updatedMatch) => {
            const prev = previousMatchRef.current;
            if (prev) {
                const wasRaiding = prev.kabaddiState?.isRaidActive || false;
                const isRaiding = updatedMatch.kabaddiState?.isRaidActive || false;
                if (!wasRaiding && isRaiding) {
                    setRaidIntro({ team: updatedMatch.kabaddiState?.raidingTeam || "", raider: updatedMatch.kabaddiState?.currentRaider || "", doOrDie: Boolean(updatedMatch.kabaddiState?.doOrDie) });
                    playCue(updatedMatch.kabaddiState?.doOrDie ? "do-or-die" : "raid-start");
                    if (raidIntroTimeoutRef.current) clearTimeout(raidIntroTimeoutRef.current);
                    raidIntroTimeoutRef.current = setTimeout(() => setRaidIntro(null), 1400);
                }
                if (updatedMatch.events?.length < prev.events?.length || updatedMatch.teamA?.score < prev.teamA?.score || updatedMatch.teamB?.score < prev.teamB?.score) {
                    setRollbackCue({ teamA: updatedMatch.teamA?.score, teamB: updatedMatch.teamB?.score });
                    playCue("undo");
                    if (rollbackTimeoutRef.current) clearTimeout(rollbackTimeoutRef.current);
                    rollbackTimeoutRef.current = setTimeout(() => setRollbackCue(null), 1800);
                }
                if (wasRaiding || isRaiding) playCue(updatedMatch.kabaddiState?.doOrDie || updatedMatch.kabaddiState?.raidTimer <= 5 ? "danger-tick" : "tick");
            }
            setMatch(updatedMatch);
            if (updatedMatch.kabaddiState) { setRaidTimer(updatedMatch.kabaddiState.raidTimer); setIsTimerRunning(updatedMatch.kabaddiState.isRaidActive); }
            if (updatedMatch.matchClock) setMatchClockRemaining(updatedMatch.matchClock.remaining ?? 0);
            previousMatchRef.current = updatedMatch;
        });

        socket.on("sports-cinematic-event", (evt) => {
            setTakeover(evt);
            playCue(evt.type === "ALL_OUT" ? "all-out" : evt.type === "SUPER_TACKLE" ? "super-tackle" : evt.type === "DO_OR_DIE" ? "do-or-die" : "super-raid");
            if (takeoverTimeoutRef.current) clearTimeout(takeoverTimeoutRef.current);
            takeoverTimeoutRef.current = setTimeout(() => setTakeover(null), evt.type === "ALL_OUT" ? 3000 : 3500);
        });

        return () => {
            [timerIntervalRef, raidIntroTimeoutRef, takeoverTimeoutRef, rollbackTimeoutRef].forEach(r => { if (r.current) { clearTimeout(r.current); clearInterval(r.current); } });
            socket.disconnect();
        };
    }, [matchId]);

    useEffect(() => {
        if (isTimerRunning) {
            timerIntervalRef.current = setInterval(() => {
                setRaidTimer(prev => {
                    if (prev <= 1) { setIsTimerRunning(false); clearInterval(timerIntervalRef.current); return 0; }
                    playCue(match?.kabaddiState?.doOrDie || prev <= 6 ? "danger-tick" : "tick");
                    return prev - 1;
                });
            }, 1000);
        } else if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [isTimerRunning]);

    const formatClock = (s = 0) => `${Math.floor(Math.max(s, 0) / 60)}:${String(Math.max(s, 0) % 60).padStart(2, "0")}`;

    // ── Loading ─────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white">
            <div className="text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-violet-400 animate-spin" />
                </div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400 font-black">Connecting to live broadcast</p>
            </div>
        </div>
    );

    if (!match) return (
        <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white p-8 text-center font-black uppercase tracking-[0.3em]">
            Match offline or private
        </div>
    );

    // ── Derived values ──────────────────────────────────────────
    const currentRaider = match.kabaddiState?.currentRaider || "";
    const currentRaidingTeam = match.kabaddiState?.raidingTeam || "";
    const currentTeam = currentRaidingTeam === "teamA" ? match.teamA : match.teamB;
    const allPlayers = [...(match.teamA?.players || []), ...(match.teamB?.players || [])];
    const activeRaiderProfile = allPlayers.find(p => p.name === currentRaider);
    const isRaidActive = match.kabaddiState?.isRaidActive || false;
    const isDoOrDie = match.kabaddiState?.doOrDie || false;
    const raidPct = Math.max((raidTimer / 30) * 100, 0);
    const raidDangerMode = isDoOrDie || raidTimer <= 5;
    const isClutchClock = match.matchClock?.mode === "SMART_CLUTCH" && matchClockRemaining <= (match.matchClock?.clutchThreshold ?? 0);

    const colorA = match.teamA?.color || "#8b5cf6";
    const colorB = match.teamB?.color || "#06b6d4";
    const scoreA = match.teamA?.score ?? 0;
    const scoreB = match.teamB?.score ?? 0;
    const leadingTeam = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
    const activeA = match.teamA?.activePlayerIds?.length || 0;
    const activeB = match.teamB?.activePlayerIds?.length || 0;
    const outA = match.teamA?.outPlayerIds?.length || 0;
    const outB = match.teamB?.outPlayerIds?.length || 0;

    // Takeover styles
    const takeoverConfig = takeover ? {
        "ALL_OUT": { bg: "from-red-950/40 via-black to-red-900/10", border: "border-red-500/50 shadow-[0_0_120px_rgba(239,68,68,0.4)]", text: "text-red-300", icon: <Zap size={40} className="text-red-300" /> },
        "SUPER_RAID": { bg: "from-amber-900/30 via-black to-amber-900/10", border: "border-amber-400/50 shadow-[0_0_120px_rgba(245,158,11,0.3)]", text: "text-amber-300", icon: <Flame size={40} className="text-amber-300" /> },
        "SUPER_TACKLE": { bg: "from-cyan-900/30 via-black to-cyan-900/10", border: "border-cyan-400/50 shadow-[0_0_120px_rgba(34,211,238,0.3)]", text: "text-cyan-300", icon: <Shield size={40} className="text-cyan-300" /> },
        "DO_OR_DIE": { bg: "from-orange-900/30 via-black to-red-900/10", border: "border-orange-500/50 shadow-[0_0_120px_rgba(249,115,22,0.3)]", text: "text-orange-300", icon: <Flame size={40} className="text-orange-300" /> },
    }[takeover.type] || { bg: "from-violet-900/25 via-black to-fuchsia-900/10", border: "border-violet-500/40", text: "text-violet-300", icon: <Zap size={40} className="text-violet-300" /> }
    : null;

    // ── RENDER ──────────────────────────────────────────────────
    return (
        <div
            ref={rootRef}
            className="min-h-screen text-white font-sans overflow-y-auto relative"
            style={{ 
                background: isCameraLive 
                    ? "transparent" 
                    : `radial-gradient(ellipse 60% 40% at 10% 0%, ${hex2rgba(colorA, 0.13)}, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, ${hex2rgba(colorB, 0.13)}, transparent 55%), #04060f` 
            }}
            onPointerDown={unlockAudio}
            onTouchStart={unlockAudio}
        >
            {/* ══ MOBILE CAMERA BACKGROUND FEED ══ */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`fixed inset-0 w-[100vw] h-[100vh] object-contain z-[-10] transition-opacity duration-1000 ${isCameraLive ? "opacity-100" : "opacity-0"}`} 
            />
            {/* Slight dark overlay over camera to ensure text readability */}
            {isCameraLive && <div className="fixed inset-0 bg-black/40 z-[-9] pointer-events-none" />}
            {/* ── GLOBAL STYLES ── */}
            <style>{`
                @keyframes fadeDown  { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:none; } }
                @keyframes fadeUp    { from { opacity:0; transform:translateY(14px);  } to { opacity:1; transform:none; } }
                @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
                @keyframes pulseBig  { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
                @keyframes allOutFlash { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
                @keyframes dotPop    { 0% { transform:scale(0); opacity:0; } 70% { transform:scale(1.3); } 100% { transform:scale(1); opacity:1; } }
                @keyframes revealIn  { from { opacity:0; transform:scale(0.85) translateY(20px); filter:blur(6px); } to { opacity:1; transform:none; filter:none; } }
                .anim-fade-down { animation: fadeDown 0.4s ease both; }
                .anim-fade-up   { animation: fadeUp 0.35s ease both; }
                .anim-fade-in   { animation: fadeIn 0.3s ease both; }
                .anim-pulse-big { animation: pulseBig 2s ease-in-out infinite; }
                .anim-reveal    { animation: revealIn 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
                .anim-all-out   { animation: allOutFlash 0.5s ease infinite; }
            `}</style>

            {/* ══ HEADER (hidden in fullscreen) ══ */}
            {!isFullscreen && (
                <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
                    <div className="flex items-center justify-between px-4 py-2.5 max-w-5xl mx-auto">
                        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-slate-300 hover:bg-white/10 transition">
                            <ArrowLeft size={17} />
                        </Link>
                        <div className="text-center">
                            <p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.4em] text-red-400 font-black">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Live Broadcast
                            </p>
                            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold mt-0.5">{match.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Commentary indicator */}
                            {isMicLive && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300">
                                    <Mic size={11} className="animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-wider">Commentary</span>
                                </div>
                            )}
                            <button onClick={() => setSoundEnabled(s => !s)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-slate-300 hover:bg-white/10 transition" title="Toggle sound">
                                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                            </button>
                            <button onClick={fetchMatchDetails} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-slate-300 hover:bg-white/10 transition">
                                <RefreshCw size={15} />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* ══ FULLSCREEN BUTTON (floating, always visible) ══ */}
            <button
                onClick={toggleFullscreen}
                className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/70 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-wider hover:bg-white/10 hover:text-white transition backdrop-blur-xl shadow-xl"
                title="Toggle fullscreen"
            >
                {isNativeFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                <span className="hidden sm:inline">{isNativeFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>

            {/* ══ HIDDEN COMMENTARY AUDIO (voice chat) ══ */}
            {voiceAudioRef && <audio ref={(el) => {
                voiceAudioRef.current = el;
                commentaryAudioRef.current = el;
            }} autoPlay playsInline style={{ display: "none" }} />}

            {/* ══ MAIN STAGE ══ */}
            <main className="max-w-5xl mx-auto px-4 pt-5 pb-20 space-y-4">

                {/* ════════════════════════════════════════════════ */}
                {/* SCORE HERO + MAT DOTS + OUT QUEUE               */}
                {/* ════════════════════════════════════════════════ */}
                <section
                    className={`relative rounded-[2rem] overflow-hidden border border-white/[0.04] shadow-[0_0_80px_rgba(0,0,0,0.6)] ${isCameraLive ? "backdrop-blur-xl" : ""}`}
                    style={{ 
                        background: isCameraLive
                            ? `linear-gradient(135deg, ${hex2rgba(colorA, 0.15)} 0%, rgba(4,6,15,0.40) 35%, rgba(4,6,15,0.40) 65%, ${hex2rgba(colorB, 0.15)} 100%)`
                            : `linear-gradient(135deg, ${hex2rgba(colorA, 0.12)} 0%, rgba(4,6,15,0.98) 35%, rgba(4,6,15,0.98) 65%, ${hex2rgba(colorB, 0.12)} 100%)` 
                    }}
                >
                    {/* Live badge + venue */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-1">
                        <span className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.4em] text-red-400 font-black">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                        </span>
                        <span className="text-[8px] uppercase tracking-[0.25em] text-slate-500 font-bold">{match.venue}</span>
                    </div>

                    {/* Match clock */}
                    <div className={`mx-5 mb-3 rounded-xl border px-4 py-2 text-center transition-all ${isClutchClock ? "border-red-500/40 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse" : "border-white/[0.04] bg-black/20"}`}>
                        <p className={`text-[8px] uppercase tracking-[0.3em] font-black ${isClutchClock ? "text-red-300" : "text-slate-500"}`}>
                            Half {match.kabaddiState?.half || 1} · Official Time
                        </p>
                        <p className={`mt-0.5 text-3xl font-black tracking-tighter ${isClutchClock ? "text-red-200 drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]" : "text-white"}`}>
                            {formatClock(matchClockRemaining)}
                        </p>
                        {!match.matchClock?.running && (
                            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">Official time stopped</p>
                        )}
                    </div>
                    {/* ── Score + Mat dots row ── */}
                    <div className="px-5 pb-4 grid grid-cols-3 gap-3 items-start">

                        {/* TEAM A */}
                        <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorA }} />
                                <p className="text-[9px] uppercase tracking-[0.25em] font-black truncate" style={{ color: hex2rgba(colorA, 0.85) }}>{match.teamA.name}</p>
                            </div>
                            {/* Score */}
                            <p
                                className="text-6xl font-black leading-none tabular-nums"
                                style={{ color: colorA, textShadow: `0 0 30px ${hex2rgba(colorA, 0.5)}`, animation: leadingTeam === "A" ? "pulseBig 2s ease-in-out infinite" : "none" }}
                            >
                                {scoreA}
                            </p>
                            {/* Mat count badge */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black tracking-wider text-emerald-400">
                                    Mat {activeA}
                                </span>
                                {outA > 0 && <span className="text-[9px] font-black tracking-wider text-rose-400">Out {outA}</span>}
                            </div>
                            {/* Dots */}
                            <MatDots
                                team={match.teamA}
                                color={colorA}
                                currentRaider={currentRaider}
                                currentRaidingTeam={currentRaidingTeam}
                                teamKey="teamA"
                                isDefending={currentRaidingTeam === "teamB"}
                            />
                            {/* Out queue */}
                            <div className="w-full">
                                <OutQueue team={match.teamA} />
                            </div>
                        </div>

                        {/* CENTER */}
                        <div className="flex flex-col items-center justify-center gap-1 pt-6">
                            <p className="text-3xl font-black text-slate-700">:</p>
                            {match.winner ? (
                                <p className="text-[7px] font-black uppercase tracking-widest text-amber-400 mt-1">FINAL</p>
                            ) : (
                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-600 mt-1">LIVE</p>
                            )}
                            {leadingTeam && (
                                <div
                                    className="mt-2 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border anim-fade-in"
                                    style={{
                                        color: leadingTeam === "A" ? colorA : colorB,
                                        borderColor: leadingTeam === "A" ? hex2rgba(colorA, 0.4) : hex2rgba(colorB, 0.4),
                                        backgroundColor: leadingTeam === "A" ? hex2rgba(colorA, 0.1) : hex2rgba(colorB, 0.1),
                                    }}
                                >
                                    {leadingTeam === "A" ? match.teamA.name : match.teamB.name}
                                    <br />Leading
                                </div>
                            )}
                        </div>

                        {/* TEAM B */}
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorB }} />
                                <p className="text-[9px] uppercase tracking-[0.25em] font-black truncate" style={{ color: hex2rgba(colorB, 0.85) }}>{match.teamB.name}</p>
                            </div>
                            {/* Score */}
                            <p
                                className="text-6xl font-black leading-none tabular-nums"
                                style={{ color: colorB, textShadow: `0 0 30px ${hex2rgba(colorB, 0.5)}`, animation: leadingTeam === "B" ? "pulseBig 2s ease-in-out infinite" : "none" }}
                            >
                                {scoreB}
                            </p>
                            {/* Mat count badge */}
                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                <span className="text-[9px] font-black tracking-wider text-emerald-400">Mat {activeB}</span>
                                {outB > 0 && <span className="text-[9px] font-black tracking-wider text-rose-400">Out {outB}</span>}
                            </div>
                            {/* Dots */}
                            <div className="flex justify-end">
                                <MatDots
                                    team={match.teamB}
                                    color={colorB}
                                    currentRaider={currentRaider}
                                    currentRaidingTeam={currentRaidingTeam}
                                    teamKey="teamB"
                                />
                            </div>
                            {/* Out queue */}
                            <div className="w-full flex flex-col items-end">
                                <OutQueue team={match.teamB} color={colorB} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════ */}
                {/* PLAYER STATS STRIP                               */}
                {/* ════════════════════════════════════════════════ */}
                <PlayerStatsStrip
                    match={match}
                    currentRaider={currentRaider}
                    currentRaidingTeam={currentRaidingTeam}
                />

                {/* ════════════════════════════════════════════════ */}
                {/* RAID INTRO FLASH                                 */}

                {/* ════════════════════════════════════════════════ */}
                {raidIntro && (
                    <section className="rounded-[2rem] border border-yellow-400/25 bg-yellow-500/10 p-5 text-center shadow-[0_0_40px_rgba(234,179,8,0.15)] anim-fade-down">
                        <p className="text-[8px] uppercase tracking-[0.45em] text-yellow-400/70 font-black">Raid Transition</p>
                        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-200">
                            {raidIntro.team === "teamA" ? match.teamA.name : match.teamB.name} RAIDING
                        </h2>
                        <p className="mt-1.5 text-xs uppercase tracking-[0.25em] text-slate-200 font-bold">{raidIntro.raider || "Raider ready"}</p>
                        {raidIntro.doOrDie && (
                            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-300 animate-pulse">⚠ Do or Die Raid</p>
                        )}
                    </section>
                )}

                {/* ════════════════════════════════════════════════ */}
                {/* LIVE RAID CLOCK + RAIDER SPOTLIGHT               */}
                {/* ════════════════════════════════════════════════ */}
                {isRaidActive && !raidIntro && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-fade-down">
                        {/* Raid clock SVG ring */}
                        <section className={`rounded-[2rem] border ${raidDangerMode ? "border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]" : "border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]"} bg-white/[0.03] p-5 flex items-center justify-center`}>
                            <div className="relative w-40 h-40">
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="44" fill="none"
                                        stroke={raidDangerMode ? "#ef4444" : "#8b5cf6"}
                                        strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 44}`}
                                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - raidPct / 100)}`}
                                        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                                    />
                                </svg>
                                <div className="absolute inset-[14px] rounded-full bg-[#04060f]/95 border border-white/[0.04] flex flex-col items-center justify-center">
                                    <p className={`text-5xl font-black tabular-nums ${raidDangerMode ? "text-red-400" : "text-violet-300"}`}>{raidTimer}</p>
                                    <p className={`mt-0.5 text-[8px] uppercase tracking-[0.3em] font-black ${isDoOrDie ? "text-red-300 animate-pulse" : "text-slate-500"}`}>
                                        {isDoOrDie ? "Do or Die" : "Raid Clock"}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Raider spotlight */}
                        <section className={`rounded-[2rem] border bg-white/[0.03] p-5 flex flex-col justify-center gap-3 ${raidDangerMode ? "border-red-500/25" : "border-violet-500/15"}`}>
                            <p className="text-[8px] uppercase tracking-[0.45em] text-slate-500 font-black">Active Raider</p>
                            <div className="flex items-center gap-3">
                                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-black text-lg ${raidDangerMode ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-violet-500/25 bg-violet-500/10 text-violet-200"}`}>
                                    {activeRaiderProfile?.jerseyNumber ? `#${activeRaiderProfile.jerseyNumber}` : <Mic2 size={20} className="text-violet-300" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-black uppercase text-white">{currentRaider || "—"}</p>
                                    <p className="text-[8px] uppercase tracking-[0.25em] text-slate-400 font-bold mt-0.5">{activeRaiderProfile?.role || "Raider"}</p>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-wider" style={{ color: currentTeam?.color || "#8b5cf6" }}>{currentTeam?.name}</p>
                                </div>
                            </div>
                            {isDoOrDie && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2">
                                    <Flame size={12} className="text-red-400 shrink-0" />
                                    <p className="text-[9px] font-black uppercase tracking-wider text-red-300">Do or Die — must score or raider is out</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            {/* ════════════════════════════════════════════════════ */}
            {/* UNDO TOAST                                           */}
            {/* ════════════════════════════════════════════════════ */}
            {rollbackCue && (
                <div className="fixed inset-x-0 bottom-16 z-50 px-4 pointer-events-none">
                    <div className="mx-auto max-w-md rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-center shadow-[0_0_35px_rgba(34,211,238,0.15)] anim-fade-up">
                        <div className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.35em] text-cyan-300 font-black">
                            <RotateCcw size={11} /> Score Rollback
                        </div>
                        <p className="mt-0.5 text-xs font-bold text-slate-100">Restored to {rollbackCue.teamA} – {rollbackCue.teamB}</p>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* CINEMATIC TAKEOVER OVERLAY                           */}
            {/* ════════════════════════════════════════════════════ */}
            {takeover && takeoverConfig && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden" onClick={() => setTakeover(null)}>
                    {/* Background */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${takeoverConfig.bg}`} />

                    {/* Scanlines overlay */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)" }} />

                    {/* Giant glow ring */}
                    <div className={`absolute rounded-full border-2 opacity-20 w-[700px] h-[700px] ${takeoverConfig.border}`} />
                    <div className={`absolute rounded-full border opacity-10 w-[900px] h-[900px] ${takeoverConfig.border}`} />

                    {/* Content */}
                    <div className="relative z-10 text-center px-6 anim-reveal">
                        {/* Icon circle */}
                        <div className={`mx-auto mb-6 w-24 h-24 rounded-full border-2 flex items-center justify-center ${takeoverConfig.border}`}
                            style={{ boxShadow: "0 0 60px currentColor" }}>
                            {takeoverConfig.icon}
                        </div>

                        {/* Event label */}
                        <p className="text-[9px] uppercase tracking-[0.6em] text-white/40 font-black mb-2">Broadcast Highlight</p>
                        <h1 className={`text-6xl md:text-8xl font-black uppercase leading-none ${takeoverConfig.text} ${takeover.type === "ALL_OUT" ? "anim-all-out" : ""}`}
                            style={{ textShadow: "0 0 60px currentColor, 0 0 120px currentColor" }}>
                            {takeover.type.replaceAll("_", " ")}
                        </h1>

                        {/* Team info */}
                        {takeover.team && (
                            <p className="mt-4 text-lg font-black uppercase tracking-[0.2em] text-white/80">
                                {takeover.team === "teamA" ? match.teamA?.name : match.teamB?.name}
                            </p>
                        )}
                        {takeover.message && (
                            <p className="mt-2 text-sm font-bold uppercase tracking-[0.15em] text-white/60">{takeover.message}</p>
                        )}

                        {/* Score snapshot during takeover */}
                        <div className="mt-6 inline-flex items-center gap-4 px-6 py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur">
                            <span className="text-2xl font-black tabular-nums" style={{ color: colorA }}>{scoreA}</span>
                            <span className="text-white/30 font-black">:</span>
                            <span className="text-2xl font-black tabular-nums" style={{ color: colorB }}>{scoreB}</span>
                        </div>

                        <p className="mt-4 text-[8px] uppercase tracking-[0.3em] text-white/20 font-black">Tap to dismiss</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LiveBroadcastPage({ params }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#050816] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-violet-400 border-violet-500/20 animate-spin" />
            </div>
        }>
            <LiveBroadcastInner params={params} />
        </Suspense>
    );
}
