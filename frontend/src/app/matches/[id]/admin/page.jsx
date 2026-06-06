"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Undo, ShieldAlert, Wifi, WifiOff, ExternalLink, X, AlertTriangle } from "lucide-react";
import { useCricketSocket } from "@/hooks/useCricketSocket";

const API = () =>
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:5050`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050");

const DISMISSAL_TYPES = ["bowled", "caught", "run out", "lbw", "stumped", "hit wicket"];

function BallChip({ ball }) {
  let display = ball.runsBat?.toString() ?? "0";
  let cls = "bg-slate-800 text-slate-300 border border-slate-700";
  if (ball.isWicket) { display = "W"; cls = "bg-red-600 text-white"; }
  else if (ball.extras?.type && ball.extras.type !== "none") {
    display = ball.extras.type.toUpperCase();
    cls = "bg-yellow-600 text-white";
  } else if (ball.runsBat === 4) { cls = "bg-blue-600 text-white"; }
  else if (ball.runsBat === 6) { cls = "bg-purple-600 text-white"; }
  return (
    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm ${cls}`}>
      {display}
    </div>
  );
}

export default function AdminScoring() {
  const { id } = useParams();
  const apiBase = API();

  const [match, setMatch] = useState(null);
  const [recentBalls, setRecentBalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selStriker, setSelStriker] = useState("");
  const [selNonStriker, setSelNonStriker] = useState("");
  const [selBowler, setSelBowler] = useState("");

  const [scoring, setScoring] = useState(false);
  const scoringLockRef = useRef(false);

  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState("bat");

  // Wicket modal state
  const [wicketModal, setWicketModal] = useState(false);
  const [dismissalType, setDismissalType] = useState("bowled");
  const [fielder, setFielder] = useState("");
  const [nextBatsman, setNextBatsman] = useState("");
  const [wicketRuns, setWicketRuns] = useState(0); // runs scored on wicket ball

  // 2nd innings setup
  const [inn2Striker, setInn2Striker] = useState("");
  const [inn2NonStriker, setInn2NonStriker] = useState("");
  const [inn2Bowler, setInn2Bowler] = useState("");

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/cricket/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setMatch(data.match);
      setRecentBalls(data.recentBalls || []);
      if (data.match) {
        setSelStriker(data.match.currentStriker || "");
        setSelNonStriker(data.match.currentNonStriker || "");
        setSelBowler(data.match.currentBowler || "");
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [id, apiBase]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  // ─── Socket ─────────────────────────────────────────────────────────────
  const onMatchUpdate = useCallback((payload) => {
    if (payload.bowling?.bowler !== undefined) setSelBowler(payload.bowling.bowler || "");
    if (payload.batting?.striker !== undefined) setSelStriker(payload.batting.striker || "");
    if (payload.batting?.nonStriker !== undefined) setSelNonStriker(payload.batting.nonStriker || "");
    fetchMatch();
  }, [fetchMatch]);

  const onBallAdded = useCallback((ball) => {
    setRecentBalls(prev => [ball, ...prev].slice(0, 12));
    setScoring(false);
    scoringLockRef.current = false;
  }, []);

  const onBallUndo = useCallback(() => {
    setScoring(false);
    scoringLockRef.current = false;
    fetchMatch();
  }, [fetchMatch]);

  const { connected, reconnecting } = useCricketSocket(id, {
    onMatchUpdate, onBallAdded, onBallUndo,
  });

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!tossWinner || !selStriker || !selBowler) return alert("Fill toss winner, striker, and bowler.");
    try {
      await fetch(`${apiBase}/api/cricket/${id}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tossWinner, tossDecision, striker: selStriker, nonStriker: selNonStriker, bowler: selBowler })
      });
      fetchMatch();
    } catch (err) { console.error(err); }
  };

  const handleStart2ndInnings = async () => {
    if (!inn2Striker || !inn2Bowler) return alert("Set opening batsman and bowler for 2nd innings.");
    try {
      await fetch(`${apiBase}/api/cricket/${id}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ striker: inn2Striker, nonStriker: inn2NonStriker, bowler: inn2Bowler })
      });
      fetchMatch();
    } catch (err) { console.error(err); }
  };

  const updatePlayers = async () => {
    try {
      await fetch(`${apiBase}/api/cricket/${id}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ striker: selStriker, nonStriker: selNonStriker, bowler: selBowler })
      });
      fetchMatch();
    } catch (err) { console.error(err); }
  };

  const handleBall = async (runs, extraType = "none", isWicket = false, extras = {}) => {
    if (scoringLockRef.current) return;
    if (!match.currentStriker || !match.currentBowler) return alert("Set Striker and Bowler first.");
    scoringLockRef.current = true;
    setScoring(true);
    try {
      const body = { runs, extraType, isWicket, ...extras };
      const res = await fetch(`${apiBase}/api/cricket/${id}/ball`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to record ball");
        scoringLockRef.current = false;
        setScoring(false);
        return;
      }
      // After wicket ball, if engine set awaitingBatsman, we need to send next batsman
      if (isWicket && nextBatsman) {
        // Update the striker to the new batsman
        await fetch(`${apiBase}/api/cricket/${id}/start`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ striker: nextBatsman })
        });
      }
      // socket events handle the rest
    } catch (err) {
      console.error(err);
      scoringLockRef.current = false;
      setScoring(false);
    }
  };

  const openWicketModal = () => {
    setDismissalType("bowled");
    setFielder("");
    setNextBatsman("");
    setWicketRuns(0);
    setWicketModal(true);
  };

  const confirmWicket = async () => {
    if (!nextBatsman) return alert("Enter the next batsman's name.");
    setWicketModal(false);

    // Determine who got out — default is striker
    const dismissedBatsman = match.currentStriker;

    await handleBall(wicketRuns, "none", true, {
      dismissalType,
      dismissedBatsman,
      fielder,
    });

    // After ball is recorded, send the new batsman
    setTimeout(async () => {
      try {
        await fetch(`${apiBase}/api/cricket/${id}/start`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ striker: nextBatsman, nonStriker: match.currentNonStriker })
        });
        fetchMatch();
      } catch (err) { console.error(err); }
    }, 500);
  };

  const handleUndo = async () => {
    try {
      await fetch(`${apiBase}/api/cricket/${id}/undo`, { method: "POST" });
    } catch (err) { console.error(err); }
  };

  // ─── Derived state ──────────────────────────────────────────────────────
  const currentInning = match?.innings?.[match.currentInnings - 1];
  const firstInning = match?.innings?.[0];

  const getBatsmanStats = (name) => {
    if (!name || !currentInning) return null;
    const team = match.teamA.name === currentInning.battingTeam ? match.teamA : match.teamB;
    return team.players?.find(p => p.name === name)?.batting;
  };
  const getBowlerStats = (name) => {
    if (!name || !currentInning) return null;
    const team = match.teamA.name === currentInning.bowlingTeam ? match.teamA : match.teamB;
    return team.players?.find(p => p.name === name)?.bowling;
  };

  const strikerStats = getBatsmanStats(selStriker);
  const nonStrikerStats = getBatsmanStats(selNonStriker);
  const bowlerStats = getBowlerStats(selBowler);

  const totalBalls = currentInning?.totalBalls || 0;
  const oversStr = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  const crr = totalBalls > 0 ? ((currentInning.totalRuns / totalBalls) * 6).toFixed(2) : "0.00";

  const overEnded = match?.awaitingBowler;
  const needsBatsman = match?.awaitingBatsman;
  const scoringBlocked = scoring || overEnded || needsBatsman || match?.status === "completed" || match?.status === "innings_break";

  // Target info
  let target = null, requiredRuns = null, rrr = null;
  if (match?.currentInnings === 2 && firstInning) {
    target = firstInning.totalRuns + 1;
    requiredRuns = target - (currentInning?.totalRuns || 0);
    const ballsLeft = (match.oversLimit * 6) - totalBalls;
    rrr = ballsLeft > 0 ? ((requiredRuns / ballsLeft) * 6).toFixed(2) : "0.00";
  }

  if (loading) return <div className="p-8 text-white text-center">Loading Admin...</div>;
  if (!match) return <div className="p-8 text-white text-center text-red-400">Match not found.</div>;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto p-4 text-white min-h-screen">

      {/* Connection Banner */}
      {!connected && (
        <div className={`mb-4 py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 ${reconnecting ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {reconnecting ? <><Wifi size={12} className="animate-pulse" /> Reconnecting...</> : <><WifiOff size={12} /> Disconnected.</>}
        </div>
      )}

      {/* ── Top Summary ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-blue-400 flex items-center gap-2">
              Admin Scorer
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}></span>
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-1">
              {match.teamA.name} vs {match.teamB.name}
              {match.currentInnings === 2 && " · 2nd Innings"}
            </p>
          </div>

          {match.status === "scheduled" ? (
            <div className="text-right">
              <div className="space-y-2">
                <select value={tossWinner} onChange={e => setTossWinner(e.target.value)} className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Toss Winner</option>
                  <option value={match.teamA.name}>{match.teamA.name}</option>
                  <option value={match.teamB.name}>{match.teamB.name}</option>
                </select>
                <select value={tossDecision} onChange={e => setTossDecision(e.target.value)} className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                  <option value="bat">Elected to Bat</option>
                  <option value="bowl">Elected to Bowl</option>
                </select>
                <button onClick={handleStart} className="w-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm transition">
                  Start Match
                </button>
              </div>
            </div>
          ) : match.status === "completed" ? (
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">COMPLETED</div>
              <p className="text-sm text-slate-400 font-bold mt-1">{match.result?.description || ""}</p>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-4xl font-black">
                {currentInning?.totalRuns || 0}
                <span className="text-2xl text-slate-500 mx-1">/</span>
                {currentInning?.totalWickets || 0}
              </div>
              <div className="text-sm font-bold text-slate-400 uppercase mt-1">
                Overs {oversStr} · CRR {crr}
              </div>
              {target && (
                <div className="text-xs text-yellow-400 font-bold mt-1">
                  Target {target} · Need {requiredRuns} · RRR {rrr}
                </div>
              )}
              <a href={`/live/${id}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 font-bold">
                <ExternalLink size={12} /> Public Live View
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Innings Break Panel ────────────────────────────────────────── */}
      {match.status === "innings_break" && (
        <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-black text-yellow-400 mb-1">Innings Break</h2>
          <p className="text-sm text-slate-400 mb-4">
            {firstInning?.battingTeam} scored <span className="text-white font-black">{firstInning?.totalRuns}/{firstInning?.totalWickets}</span> in {Math.floor((firstInning?.totalBalls || 0) / 6)}.{(firstInning?.totalBalls || 0) % 6} overs.
            Target: <span className="text-yellow-400 font-black">{(firstInning?.totalRuns || 0) + 1}</span>
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Opener 1 (Striker) *</label>
              <input type="text" value={inn2Striker} onChange={e => setInn2Striker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-yellow-500" placeholder="Batsman name" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Opener 2 (Non-Striker)</label>
              <input type="text" value={inn2NonStriker} onChange={e => setInn2NonStriker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-yellow-500" placeholder="Batsman name" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Opening Bowler *</label>
              <input type="text" value={inn2Bowler} onChange={e => setInn2Bowler(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-yellow-500" placeholder="Bowler name" />
            </div>
          </div>
          <button onClick={handleStart2ndInnings}
            className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition">
            Start 2nd Innings
          </button>
        </div>
      )}

      {/* ── Match Completed Summary ────────────────────────────────────── */}
      {match.status === "completed" && match.innings.length >= 2 && (
        <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-black text-emerald-400 mb-3">{match.result?.description}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {match.innings.map((inn, idx) => (
              <div key={idx} className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <p className="text-xs text-slate-500 font-bold uppercase">Innings {idx + 1} · {inn.battingTeam}</p>
                <p className="text-2xl font-black mt-1">{inn.totalRuns}/{inn.totalWickets}</p>
                <p className="text-xs text-slate-400 mt-1">{Math.floor(inn.totalBalls / 6)}.{inn.totalBalls % 6} overs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Scoring Grid ─────────────────────────────────────────── */}
      {(match.status === "live") && (
        <div className="grid md:grid-cols-12 gap-6">
          {/* Left — Players */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Players on Field</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400">Striker *</label>
                  <input type="text" value={selStriker} onChange={e => setSelStriker(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none ${needsBatsman ? "bg-red-500/10 border-red-500" : "bg-slate-950 border-slate-800 focus:border-blue-500"}`}
                    placeholder={needsBatsman ? "⚠ Enter next batsman!" : "Batsman name"} />
                  {strikerStats && (
                    <p className="text-xs text-blue-400 mt-1 ml-1">
                      {strikerStats.runs} ({strikerStats.balls}b) · SR {strikerStats.strikeRate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Non-Striker</label>
                  <input type="text" value={selNonStriker} onChange={e => setSelNonStriker(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-blue-500"
                    placeholder="Batsman name" />
                  {nonStrikerStats && (
                    <p className="text-xs text-blue-400 mt-1 ml-1">
                      {nonStrikerStats.runs} ({nonStrikerStats.balls}b)
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-400">Bowler *</label>
                  <input type="text" value={selBowler} onChange={e => setSelBowler(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none ${overEnded ? "bg-red-500/10 border-red-500" : "bg-slate-950 border-slate-800 focus:border-blue-500"}`}
                    placeholder={overEnded ? "⚠ Select new bowler!" : "Bowler name"} />
                  {bowlerStats && (
                    <p className="text-xs text-indigo-400 mt-1 ml-1">
                      {bowlerStats.overs}ov · {bowlerStats.runs}R/{bowlerStats.wickets}W · Eco {bowlerStats.economy}
                    </p>
                  )}
                </div>
                <button onClick={updatePlayers}
                  className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition">
                  Save Players
                </button>
              </div>
            </div>

            {/* Fall of Wickets */}
            {currentInning?.fallOfWickets?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Fall of Wickets</h3>
                <div className="space-y-1.5">
                  {currentInning.fallOfWickets.map((fow, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-red-400 font-bold">{fow.batsman}</span>
                      <span className="text-slate-400">{fow.runs}/{fow.wicketNumber} ({fow.over} ov)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Scoring Controls */}
          <div className="md:col-span-8 space-y-4">

            {/* Alerts */}
            {needsBatsman && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold">
                <AlertTriangle size={18} /> Wicket! Enter the new batsman above, then Save Players to continue.
              </div>
            )}
            {overEnded && !needsBatsman && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-3 text-orange-400 text-sm font-bold">
                <ShieldAlert size={18} /> Over complete — enter the new bowler above, then Save Players.
              </div>
            )}

            <div className={`bg-slate-900 border rounded-3xl p-6 ${scoring ? "border-blue-500/50" : "border-slate-800"}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  Scoring Pad {scoring && <span className="text-blue-400 text-xs ml-2">Recording...</span>}
                </h3>
                <button onClick={handleUndo} disabled={scoring}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40 rounded-lg text-xs font-bold transition">
                  <Undo size={14} /> Undo
                </button>
              </div>

              {/* Runs: 0–6 */}
              <div className="grid grid-cols-6 gap-3 mb-4">
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <button key={run} onClick={() => handleBall(run)} disabled={scoringBlocked}
                    className={`py-6 rounded-2xl text-2xl font-black transition active:scale-95 disabled:opacity-40
                      ${run === 4 ? "bg-blue-600 hover:bg-blue-500" : run === 6 ? "bg-purple-600 hover:bg-purple-500" : "bg-slate-800 hover:bg-slate-700"}`}>
                    {run}
                  </button>
                ))}
              </div>

              {/* Extras & Wicket */}
              <div className="grid grid-cols-5 gap-3">
                <button onClick={openWicketModal} disabled={scoringBlocked}
                  className="py-5 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-2xl text-xl font-black transition active:scale-95">W</button>
                <button onClick={() => handleBall(0, "wd")} disabled={scoring || match?.status !== "live"}
                  className="py-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-2xl text-lg font-black transition active:scale-95">WD</button>
                <button onClick={() => handleBall(0, "nb")} disabled={scoring || match?.status !== "live"}
                  className="py-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-2xl text-lg font-black transition active:scale-95">NB</button>
                <button onClick={() => handleBall(1, "b")} disabled={scoringBlocked}
                  className="py-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-2xl text-lg font-black transition active:scale-95">B</button>
                <button onClick={() => handleBall(1, "lb")} disabled={scoringBlocked}
                  className="py-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-2xl text-lg font-black transition active:scale-95">LB</button>
              </div>
            </div>

            {/* Ball Timeline */}
            {recentBalls.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Balls</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentBalls.map((ball, i) => (
                    <BallChip key={ball._id || i} ball={ball} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Wicket Modal ───────────────────────────────────────────────── */}
      {wicketModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-red-400">WICKET</h2>
              <button onClick={() => setWicketModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Dismissal Type</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {DISMISSAL_TYPES.map(dt => (
                    <button key={dt} onClick={() => setDismissalType(dt)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition ${dismissalType === dt ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {dt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {(dismissalType === "caught" || dismissalType === "run out" || dismissalType === "stumped") && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">
                    {dismissalType === "caught" ? "Caught by" : dismissalType === "stumped" ? "Stumped by" : "Fielder"}
                  </label>
                  <input type="text" value={fielder} onChange={e => setFielder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-red-500"
                    placeholder="Fielder name" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Runs scored on this ball</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[0, 1, 2, 3].map(r => (
                    <button key={r} onClick={() => setWicketRuns(r)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition ${wicketRuns === r ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-red-400 uppercase">Next Batsman *</label>
                <input type="text" value={nextBatsman} onChange={e => setNextBatsman(e.target.value)}
                  className="w-full bg-slate-950 border border-red-500/30 rounded-xl px-4 py-3 mt-1 text-sm font-bold outline-none focus:border-red-500"
                  placeholder="New batsman name" />
              </div>

              <button onClick={confirmWicket} disabled={!nextBatsman}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 py-3.5 rounded-xl font-black uppercase tracking-wider text-sm transition">
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
