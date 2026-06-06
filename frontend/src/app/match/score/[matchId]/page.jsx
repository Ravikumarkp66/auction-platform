"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import io from "socket.io-client";
import { ArrowLeft, Edit2, RotateCcw, Share2, X, ExternalLink } from "lucide-react";
import Link from "next/link";

import BattingScorecard   from "@/components/cricket/BattingScorecard";
import BowlingScorecard   from "@/components/cricket/BowlingScorecard";
import CommentaryFeed     from "@/components/cricket/CommentaryFeed";
import FallOfWickets      from "@/components/cricket/FallOfWickets";
import PartnershipTracker from "@/components/cricket/PartnershipTracker";
import OverSummary        from "@/components/cricket/OverSummary";
import "@/app/cricket/scorecard/scorecard.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let _socket = null;
function getSocket() {
  if (!_socket) _socket = io(API_URL, { transports: ["websocket", "polling"] });
  return _socket;
}

const TABS = ["Scoring", "Scorecard", "Stats", "Commentary"];

export default function MatchScorer({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;

  const [match, setMatch]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("Scoring");

  // Scorecard data (fetched from /scorecard endpoint, richer than match doc)
  const [scorecard, setScorecard]     = useState(null);
  const [activeInnings, setActiveInnings] = useState(1);

  // Commentary
  const [commentary, setCommentary]   = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commPage, setCommPage]       = useState(1);
  const [commHasMore, setCommHasMore] = useState(false);

  // Player Selection State
  const [selectingRole, setSelectingRole]     = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers]   = useState(false);

  // Wicket modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType]           = useState("bowled");
  const [wicketFielder, setWicketFielder]     = useState("");
  const [wicketRuns, setWicketRuns]           = useState(0);

  // Add Player Modal
  const [showAddModal, setShowAddModal]       = useState(false);
  const [newPlayerName, setNewPlayerName]     = useState("");
  const [isAddingPlayer, setIsAddingPlayer]   = useState(false);

  // ── Fetch main match doc ──────────────────────────────────────
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match || data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // ── Fetch full scorecard ──────────────────────────────────────
  const fetchScorecard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/${matchId}/scorecard`);
      if (res.ok) {
        const data = await res.json();
        setScorecard(data);
        const lastInn = data.innings?.[data.innings.length - 1];
        if (lastInn) setActiveInnings(lastInn.inningsNumber);
      }
    } catch (err) {
      console.error(err);
    }
  }, [matchId]);

  // ── Fetch commentary ─────────────────────────────────────────
  const fetchCommentary = useCallback(async (page = 1, append = false) => {
    setCommLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/cricket/${matchId}/commentary?innings=${activeInnings}&page=${page}&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      setCommentary(prev => append ? [...prev, ...data.commentary] : data.commentary);
      setCommHasMore(data.total > page * 20);
      setCommPage(page);
    } finally {
      setCommLoading(false);
    }
  }, [matchId, activeInnings]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  // ── Refresh scorecard when non-scoring tab activated ─────────
  useEffect(() => {
    if (activeTab === "Scorecard" || activeTab === "Stats") fetchScorecard();
    if (activeTab === "Commentary") fetchCommentary(1, false);
  }, [activeTab]);

  // ── Socket.IO ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-cricket-match", matchId);

    const onUpdate = (payload) => {
      fetchMatch();
      if (activeTab === "Scorecard" || activeTab === "Stats") fetchScorecard();
      if (activeTab === "Commentary") fetchCommentary(1, false);
    };
    socket.on("match:update", onUpdate);
    socket.on("ball:add",     onUpdate);
    socket.on("ball:undo",    onUpdate);

    return () => {
      socket.off("match:update", onUpdate);
      socket.off("ball:add",     onUpdate);
      socket.off("ball:undo",    onUpdate);
    };
  }, [matchId, activeTab]);

  // ── Fetch players for selection ───────────────────────────────
  useEffect(() => {
    if (!selectingRole || !match) return;
    const currentInn = match.innings?.[match.currentInnings - 1] || {};
    const teamName = (selectingRole === "striker" || selectingRole === "nonStriker")
      ? currentInn.battingTeam
      : currentInn.bowlingTeam;
    if (!teamName) return;

    const team = match.teamA?.name === teamName ? match.teamA : match.teamB;
    setAvailablePlayers(team?.players || []);
  }, [selectingRole, match, showAddModal]);

  // ── Ball actions ──────────────────────────────────────────────
  const addBall = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/${matchId}/ball`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match);
      } else {
        const err = await res.json();
        alert(err.error || "Error recording ball");
      }
    } catch (err) {
      console.error("Failed to post ball", err);
    }
  };

  const undoBall = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/${matchId}/undo`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match);
      }
    } catch (err) {
      console.error("Undo failed", err);
    }
  };

  const handleSelectPlayer = async (playerName) => {
    if (!match || !selectingRole) return;
    try {
      const body = {};
      if (selectingRole === "striker")    body.striker    = playerName;
      if (selectingRole === "nonStriker") body.nonStriker = playerName;
      if (selectingRole === "bowler")     body.bowler     = playerName;

      const res = await fetch(`${API_URL}/api/cricket/${matchId}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        setSelectingRole(null);
      }
    } catch (err) {
      console.error("Failed to select player", err);
    }
  };

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim() || !match) return;
    setIsAddingPlayer(true);
    const currentInn = match.innings?.[match.currentInnings - 1] || {};
    const teamName = (selectingRole === "striker" || selectingRole === "nonStriker")
      ? currentInn.battingTeam
      : currentInn.bowlingTeam;
    const team = match.teamA?.name === teamName ? match.teamA : match.teamB;

    try {
      await fetch(`${API_URL}/api/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlayerName, teamId: team?._id, status: "available" }),
      });
      setNewPlayerName("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to create player", err);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1117", color: "#64748b", fontFamily: "Inter, sans-serif" }}>
        <div className="sc-spinner" style={{ marginRight: "1rem" }} />
        Loading Match…
      </div>
    );
  }
  if (!match) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1117", color: "#ef4444", fontFamily: "Inter, sans-serif" }}>
        Match not found.
      </div>
    );
  }

  const currentInning   = match.innings?.[match.currentInnings - 1] || {};
  const totalBalls      = currentInning.totalBalls || 0;
  const oversInt        = Math.floor(totalBalls / 6);
  const ballsRem        = totalBalls % 6;
  const oversDisplay    = `${oversInt}.${ballsRem}`;
  const crr             = totalBalls > 0
    ? ((currentInning.totalRuns / totalBalls) * 6).toFixed(1) : "0.0";

  // Last 6 balls of current over from overSummaries
  const lastOverBalls   = (currentInning.overSummaries?.slice(-1)[0]?.balls) || [];

  const awaiting = match.awaitingBatsman || match.awaitingBowler;
  const isLive   = match.status === "live";

  const scorecardInning = scorecard?.innings?.find(inn => inn.inningsNumber === activeInnings);

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#e2e8f0" }}>

      {/* ══ Top Header ══ */}
      <header style={{
        display: "flex", alignItems: "center", padding: "0.75rem 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#1a1d27", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/admin/matches" style={{ color: "#64748b", display: "flex" }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.02em" }}>
          Match Centre
        </h1>
        <Link href={`/cricket/scorecard/${matchId}`} style={{ color: "#6c63ff", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.72rem", fontWeight: 700 }}>
          <ExternalLink size={13} /> Full
        </Link>
      </header>

      {/* ══ Tabs ══ */}
      <div className="sc-tabs" style={{ borderTop: "none", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`sc-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ══ SCORING TAB ══ */}
      {activeTab === "Scoring" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem" }}>

          {/* Score display */}
          <div style={{ textAlign: "center", padding: "1rem 0 0.5rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", marginBottom: "0.3rem" }}>
              {currentInning.battingTeam || "–"} · {match.currentInnings === 1 ? "1st" : "2nd"} Innings
            </div>
            <div style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", color: "#e2e8f0" }}>
              {currentInning.totalRuns || 0}
              <span style={{ fontSize: "2rem", color: "#64748b", fontWeight: 700 }}>/{currentInning.totalWickets || 0}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
              <span>Ov {oversDisplay}/{match.oversLimit}</span>
              <span>CRR {crr}</span>
              <span>Ext {currentInning.extras?.total || 0}</span>
            </div>
            {match.currentInnings === 2 && match.innings.length >= 2 && (() => {
              const target = match.innings[0].totalRuns + 1;
              const need   = target - (currentInning.totalRuns || 0);
              const balls  = match.oversLimit * 6 - totalBalls;
              return (
                <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>
                  Need {need} off {balls} balls · RRR {balls > 0 ? ((need / balls) * 6).toFixed(1) : "0.0"}
                </div>
              );
            })()}
          </div>

          {/* Current over dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", margin: "0.75rem 0" }}>
            <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, marginRight: "0.25rem" }}>THIS OVER</span>
            {lastOverBalls.length === 0
              ? <span style={{ fontSize: "0.75rem", color: "#475569" }}>–</span>
              : lastOverBalls.map((b, i) => {
                  const isW = b.isWicket;
                  const is6 = b.isSix;
                  const is4 = b.isBoundary && !is6;
                  const isExtra = b.extras === "wd" || b.extras === "nb";
                  const bg = isW ? "#ef4444" : is6 ? "#22c55e" : is4 ? "#3b82f6" : isExtra ? "#f59e0b" : "#334155";
                  return (
                    <div key={i} style={{
                      width: "1.75rem", height: "1.75rem", borderRadius: "50%",
                      background: `${bg}22`, border: `1.5px solid ${bg}66`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", fontWeight: 800, color: bg,
                    }}>
                      {b.label}
                    </div>
                  );
                })
            }
          </div>

          {/* Active batters / bowler table */}
          <div style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: "1rem" }}>
            {/* Batting */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#22263a" }}>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase" }}>Batter</th>
                  <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>R</th>
                  <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>B</th>
                  <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>SR</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: match.currentStriker,    label: "*",  role: "striker"    },
                  { name: match.currentNonStriker, label: "",   role: "nonStriker" },
                ].map(({ name, label, role }) => {
                  const team = match.teamA?.name === currentInning.battingTeam ? match.teamA : match.teamB;
                  const p    = team?.players?.find(pl => pl.name === name);
                  return (
                    <tr key={role} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                        onClick={() => setSelectingRole(role)}>
                      <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "#e2e8f0" }}>
                        {name || <span style={{ color: "#475569", fontStyle: "italic" }}>Select {role === "striker" ? "Striker" : "Non-Striker"}</span>}
                        {label && <span style={{ marginLeft: "0.3rem", color: "#22c55e", fontWeight: 900 }}>{label}</span>}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: "#e2e8f0" }}>{p?.batting?.runs ?? "–"}</td>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{p?.batting?.balls ?? "–"}</td>
                      <td style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem" }}>{p?.batting?.strikeRate > 0 ? p.batting.strikeRate.toFixed(0) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bowler row */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "0.1rem 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#22263a" }}>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase" }}>Bowler</th>
                    <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>O</th>
                    <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>R</th>
                    <th style={{ padding: "0.5rem 0.4rem", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textAlign: "center" }}>W</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                      onClick={() => setSelectingRole("bowler")}>
                    {(() => {
                      const bowlTeam = match.teamA?.name === currentInning.bowlingTeam ? match.teamA : match.teamB;
                      const bp = bowlTeam?.players?.find(p => p.name === match.currentBowler);
                      const lb = bp?.bowling?.legalBalls || 0;
                      const oD = `${Math.floor(lb / 6)}.${lb % 6}`;
                      return (
                        <>
                          <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "#e2e8f0" }}>
                            {match.currentBowler || <span style={{ color: "#475569", fontStyle: "italic" }}>Select Bowler</span>}
                            <span style={{ marginLeft: "0.3rem", color: "#f59e0b", fontSize: "0.6rem" }}>▶</span>
                          </td>
                          <td style={{ textAlign: "center", color: "#64748b" }}>{bp ? oD : "–"}</td>
                          <td style={{ textAlign: "center", color: "#e2e8f0", fontWeight: 700 }}>{bp?.bowling?.runs ?? "–"}</td>
                          <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 800 }}>{bp?.bowling?.wickets ?? "–"}</td>
                        </>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Scoring pad */}
          {isLive && !awaiting && match.currentStriker && match.currentBowler && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <button onClick={undoBall} style={{
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  padding: "0.4rem 0.9rem", borderRadius: 999, background: "#22263a",
                  border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8",
                  fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                }}>
                  <RotateCcw size={13} /> Undo
                </button>
                <span style={{ fontSize: "0.65rem", color: "#475569", fontWeight: 700 }}>
                  Over {oversInt + 1} · Ball {ballsRem + 1}
                </span>
              </div>

              {/* Run buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
                {[0, 1, 2, 3].map(r => (
                  <button key={r}
                    onClick={() => addBall({ runs: r, extraType: "none" })}
                    style={{
                      height: "3.5rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
                      background: "#1a1d27", color: "#e2e8f0", fontSize: "1.3rem", fontWeight: 800, cursor: "pointer",
                    }}>
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <button onClick={() => addBall({ runs: 4, extraType: "none" })}
                  style={{ height: "3.5rem", borderRadius: 12, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", fontSize: "1.4rem", fontWeight: 900, cursor: "pointer" }}>
                  4
                </button>
                <button onClick={() => addBall({ runs: 6, extraType: "none" })}
                  style={{ height: "3.5rem", borderRadius: 12, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: "1.4rem", fontWeight: 900, cursor: "pointer" }}>
                  6
                </button>
                <button onClick={() => addBall({ runs: 0, extraType: "wd" })}
                  style={{ height: "3.5rem", borderRadius: 12, background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}>
                  WD
                </button>
                <button onClick={() => addBall({ runs: 0, extraType: "nb" })}
                  style={{ height: "3.5rem", borderRadius: 12, background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}>
                  NB
                </button>
                <button
                  onClick={() => setShowWicketModal(true)}
                  style={{ height: "3.5rem", borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: "1.2rem", fontWeight: 900, cursor: "pointer" }}>
                  W
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <button onClick={() => addBall({ runs: 1, extraType: "b" })}
                  style={{ height: "2.75rem", borderRadius: 10, background: "#1a1d27", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                  Bye (1)
                </button>
                <button onClick={() => addBall({ runs: 1, extraType: "lb" })}
                  style={{ height: "2.75rem", borderRadius: 10, background: "#1a1d27", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                  Leg Bye (1)
                </button>
              </div>
            </div>
          )}

          {/* Awaiting prompt */}
          {awaiting && isLive && (
            <div style={{
              background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.3)",
              borderRadius: 12, padding: "1rem", textAlign: "center", marginTop: "0.5rem",
            }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a5b4fc", marginBottom: "0.75rem" }}>
                {match.awaitingBatsman ? "Select next batsman" : "Select new bowler"}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                {match.awaitingBatsman && (
                  <button onClick={() => setSelectingRole("striker")}
                    style={{ padding: "0.6rem 1.2rem", borderRadius: 8, background: "#6c63ff", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", border: "none" }}>
                    Select Batsman
                  </button>
                )}
                {match.awaitingBowler && (
                  <button onClick={() => setSelectingRole("bowler")}
                    style={{ padding: "0.6rem 1.2rem", borderRadius: 8, background: "#334155", color: "#e2e8f0", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", border: "none" }}>
                    Select Bowler
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Match completed */}
          {match.status === "completed" && match.result?.description && (
            <div style={{
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 12, padding: "1.25rem", textAlign: "center", marginTop: "0.5rem",
            }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#22c55e" }}>
                🏆 {match.result.description}
              </div>
              <Link href={`/cricket/scorecard/${matchId}`}
                style={{ display: "inline-block", marginTop: "0.75rem", padding: "0.5rem 1.25rem", borderRadius: 8, background: "rgba(34,197,94,0.2)", color: "#22c55e", fontWeight: 700, fontSize: "0.8rem" }}>
                View Full Scorecard
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══ SCORECARD TAB ══ */}
      {activeTab === "Scorecard" && (
        <div className="sc-content" style={{ maxWidth: 600, margin: "0 auto", paddingTop: "1rem" }}>
          {!scorecard ? (
            <div className="sc-loader" style={{ minHeight: "50vh" }}>
              <div className="sc-spinner" />
            </div>
          ) : (
            <>
              {/* Innings switcher */}
              {scorecard.innings.length > 1 && (
                <div className="sc-innings-switcher">
                  {scorecard.innings.map(inn => (
                    <button
                      key={inn.inningsNumber}
                      className={`sc-innings-btn ${activeInnings === inn.inningsNumber ? "active" : ""}`}
                      onClick={() => setActiveInnings(inn.inningsNumber)}
                    >
                      {inn.battingTeam}
                    </button>
                  ))}
                </div>
              )}

              {scorecardInning && (
                <>
                  <BattingScorecard
                    batting={scorecardInning.batting}
                    didNotBat={scorecardInning.didNotBat}
                    currentStriker={match.currentStriker}
                    currentNonStriker={match.currentNonStriker}
                    teamName={scorecardInning.battingTeam}
                    totalRuns={scorecardInning.totalRuns}
                    totalWickets={scorecardInning.totalWickets}
                    overs={scorecardInning.overs}
                    extras={scorecardInning.extras}
                  />
                  <div className="sc-innings-divider">
                    <div className="sc-innings-divider-line" />
                    <span className="sc-innings-label">Bowling</span>
                    <div className="sc-innings-divider-line" />
                  </div>
                  <BowlingScorecard
                    bowling={scorecardInning.bowling}
                    currentBowler={match.currentBowler}
                    teamName={scorecardInning.bowlingTeam}
                  />
                  <div className="sc-innings-divider">
                    <div className="sc-innings-divider-line" />
                    <span className="sc-innings-label">Fall of Wickets</span>
                    <div className="sc-innings-divider-line" />
                  </div>
                  <FallOfWickets fallOfWickets={scorecardInning.fallOfWickets} />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ STATS TAB ══ */}
      {activeTab === "Stats" && (
        <div className="sc-content" style={{ maxWidth: 600, margin: "0 auto", paddingTop: "1rem" }}>
          {!scorecard ? (
            <div className="sc-loader" style={{ minHeight: "50vh" }}><div className="sc-spinner" /></div>
          ) : (
            <>
              {scorecard.innings.length > 1 && (
                <div className="sc-innings-switcher">
                  {scorecard.innings.map(inn => (
                    <button
                      key={inn.inningsNumber}
                      className={`sc-innings-btn ${activeInnings === inn.inningsNumber ? "active" : ""}`}
                      onClick={() => setActiveInnings(inn.inningsNumber)}
                    >
                      {inn.battingTeam}
                    </button>
                  ))}
                </div>
              )}
              {scorecardInning && (
                <>
                  <PartnershipTracker
                    currentPartnership={scorecardInning.currentPartnership}
                    partnerships={scorecardInning.partnerships}
                    highestPartnership={scorecardInning.highestPartnership}
                  />
                  <div className="sc-innings-divider">
                    <div className="sc-innings-divider-line" />
                    <span className="sc-innings-label">Over Summary</span>
                    <div className="sc-innings-divider-line" />
                  </div>
                  <OverSummary overSummaries={scorecardInning.overSummaries} />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ COMMENTARY TAB ══ */}
      {activeTab === "Commentary" && (
        <div className="sc-content" style={{ maxWidth: 600, margin: "0 auto", paddingTop: "1rem" }}>
          <CommentaryFeed
            commentary={commentary}
            loading={commLoading && commPage === 1}
            hasMore={commHasMore}
            onLoadMore={() => fetchCommentary(commPage + 1, true)}
          />
        </div>
      )}

      {/* ══ WICKET MODAL ══ */}
      {showWicketModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.75)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", maxWidth: 480, background: "#1a1d27",
            borderRadius: "20px 20px 0 0", padding: "1.5rem",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 800, color: "#ef4444" }}>🔴 Wicket</span>
              <button onClick={() => setShowWicketModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
              {["bowled", "caught", "lbw", "run out", "stumped", "hit wicket"].map(type => (
                <button key={type}
                  onClick={() => setWicketType(type)}
                  style={{
                    padding: "0.6rem 0.5rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
                    cursor: "pointer", border: "1.5px solid",
                    borderColor: wicketType === type ? "#ef4444" : "rgba(255,255,255,0.08)",
                    background: wicketType === type ? "rgba(239,68,68,0.15)" : "#22263a",
                    color: wicketType === type ? "#ef4444" : "#94a3b8",
                    textTransform: "capitalize",
                  }}>
                  {type}
                </button>
              ))}
            </div>

            {(wicketType === "caught" || wicketType === "run out" || wicketType === "stumped") && (
              <input
                placeholder="Fielder / Keeper name"
                value={wicketFielder}
                onChange={e => setWicketFielder(e.target.value)}
                style={{
                  width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8,
                  background: "#22263a", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e2e8f0", fontSize: "0.85rem", marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />
            )}

            {wicketType === "run out" && (
              <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                Runs scored before run out:
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {[0, 1, 2, 3].map(r => (
                    <button key={r}
                      onClick={() => setWicketRuns(r)}
                      style={{
                        padding: "0.4rem 0.7rem", borderRadius: 6, fontWeight: 800,
                        cursor: "pointer",
                        background: wicketRuns === r ? "#6c63ff" : "#22263a",
                        border: `1px solid ${wicketRuns === r ? "#6c63ff" : "rgba(255,255,255,0.08)"}`,
                        color: wicketRuns === r ? "#fff" : "#94a3b8",
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                addBall({
                  runs: wicketType === "run out" ? wicketRuns : 0,
                  extraType: "none",
                  isWicket: true,
                  dismissalType: wicketType,
                  dismissedBatsman: match.currentStriker,
                  fielder: wicketFielder,
                });
                setShowWicketModal(false);
                setWicketFielder("");
                setWicketRuns(0);
                setWicketType("bowled");
              }}
              style={{
                width: "100%", padding: "0.9rem",
                background: "rgba(239,68,68,0.85)", borderRadius: 10,
                color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                border: "none",
              }}>
              Confirm Wicket
            </button>
          </div>
        </div>
      )}

      {/* ══ PLAYER SELECTION MODAL ══ */}
      {selectingRole && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "#0f1117", display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "flex", alignItems: "center", padding: "1rem",
            background: "#1a1d27", borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <button onClick={() => setSelectingRole(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", marginRight: "0.75rem" }}>
              <X size={22} />
            </button>
            <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {selectingRole === "bowler" ? "Select Bowler" : selectingRole === "striker" ? "Select Striker" : "Select Non-Striker"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {availablePlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏏</div>
                <p style={{ fontWeight: 600 }}>No players in this team yet</p>
                <button onClick={() => setShowAddModal(true)}
                  style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", borderRadius: 8, background: "#6c63ff", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                  + Add Player
                </button>
              </div>
            ) : (
              availablePlayers.map((p, i) => (
                <button key={i}
                  onClick={() => handleSelectPlayer(p.name)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.9rem 1rem", background: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{
                    width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                    background: "#22263a", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: "#6c63ff",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{p.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#475569", background: "#22263a", padding: "0.2rem 0.5rem", borderRadius: 4, fontWeight: 700 }}>
                    SELECT
                  </span>
                </button>
              ))
            )}
          </div>

          {availablePlayers.length > 0 && (
            <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#1a1d27" }}>
              <button onClick={() => setShowAddModal(true)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: 10, background: "#22263a", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                + Create New Player
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ ADD PLAYER MODAL ══ */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{
            width: "100%", maxWidth: 380, background: "#1a1d27",
            borderRadius: 20, padding: "1.5rem",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Create Player</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Player full name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: 10,
                background: "#22263a", border: "1px solid rgba(255,255,255,0.08)",
                color: "#e2e8f0", fontSize: "0.9rem", marginBottom: "1rem",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleCreatePlayer}
              disabled={isAddingPlayer || !newPlayerName.trim()}
              style={{
                width: "100%", padding: "0.8rem", borderRadius: 10,
                background: isAddingPlayer ? "#334155" : "#6c63ff",
                color: "#fff", fontWeight: 800, fontSize: "0.85rem",
                cursor: isAddingPlayer ? "not-allowed" : "pointer", border: "none",
              }}>
              {isAddingPlayer ? "Creating…" : "Create & Select"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}