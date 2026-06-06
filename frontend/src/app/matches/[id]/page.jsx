"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCricketSocket } from "@/hooks/useCricketSocket";
import { Wifi, WifiOff, ExternalLink } from "lucide-react";

function BallChip({ ball }) {
  let display = ball.runsBat?.toString() ?? "0";
  let cls = "bg-slate-800 text-slate-300 border border-slate-700";
  if (ball.isWicket) { display = "W"; cls = "bg-red-600 text-white"; }
  else if (ball.extras?.type && ball.extras.type !== "none") { display = ball.extras.type.toUpperCase(); cls = "bg-yellow-600 text-white"; }
  else if (ball.runsBat === 4) { cls = "bg-blue-600 text-white"; }
  else if (ball.runsBat === 6) { cls = "bg-purple-600 text-white"; }
  return (
    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${cls}`}>
      {display}
    </div>
  );
}

export default function MatchCenter() {
  const { id } = useParams();
  const API = typeof window !== "undefined"
    ? `http://${window.location.hostname}:5050`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050");

  const [matchData, setMatchData] = useState(null);
  const [recentBalls, setRecentBalls] = useState([]);
  const [liveState, setLiveState] = useState(null); // lean socket payload
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/cricket/${id}`);
      if (!res.ok) { setError("Match not found"); return; }
      const data = await res.json();
      setMatchData(data.match);
      setRecentBalls(data.recentBalls || []);
      setError(null);
    } catch (err) {
      setError("Failed to load match.");
    } finally {
      setLoading(false);
    }
  }, [id, API]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const onMatchUpdate = useCallback((payload) => { setLiveState(payload); }, []);
  const onBallAdded = useCallback((ball) => { setRecentBalls(prev => [ball, ...prev].slice(0, 12)); }, []);
  const onBallUndo = useCallback(() => { fetchMatch(); }, [fetchMatch]);
  const onMatchEnd = useCallback((result) => {
    setLiveState(prev => prev ? { ...prev, status: "completed", result } : prev);
    fetchMatch();
  }, [fetchMatch]);
  const onInningsEnd = useCallback(() => {
    setLiveState(prev => prev ? { ...prev, status: "innings_break" } : prev);
    fetchMatch();
  }, [fetchMatch]);

  const { connected, reconnecting } = useCricketSocket(id, {
    onMatchUpdate,
    onBallAdded,
    onBallUndo,
    onMatchEnd,
    onInningsEnd,
  });

  if (loading) return <div className="p-8 text-white text-center">Loading match...</div>;
  if (error) return <div className="p-8 text-red-400 text-center font-bold">{error}</div>;
  if (!matchData) return null;

  // Merge HTTP data with live socket overlay
  const currentInning = matchData.innings?.[matchData.currentInnings - 1];
  const firstInning = matchData.innings?.[0];
  const totalBalls = currentInning?.totalBalls || 0;
  
  const score = liveState?.score || {
    runs: currentInning?.totalRuns || 0,
    wickets: currentInning?.totalWickets || 0,
    oversStr: `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`,
    crr: totalBalls > 0 ? ((currentInning.totalRuns / totalBalls) * 6).toFixed(2) : "0.00",
  };
  
  const batting = liveState?.batting || {
    striker: matchData.currentStriker,
    nonStriker: matchData.currentNonStriker,
  };
  const bowling = liveState?.bowling || { bowler: matchData.currentBowler };
  
  const target = liveState?.target ?? null;
  const requiredRuns = liveState?.requiredRuns ?? null;
  const rrr = liveState?.rrr ?? null;
  
  const status = liveState?.status || matchData.status;
  const result = liveState?.result || matchData.result;

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 text-white min-h-screen">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === "live" && (
            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live
            </span>
          )}
          {status === "innings_break" && (
            <span className="text-xs font-black uppercase text-yellow-400">INNINGS BREAK</span>
          )}
          {status === "completed" && (
            <span className="text-xs font-black uppercase text-emerald-400">COMPLETED</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs font-bold ${connected ? "text-emerald-400" : reconnecting ? "text-yellow-400" : "text-red-400"}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? "Live" : reconnecting ? "Reconnecting..." : "Offline"}
          </span>
          <a href={`/live/${id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold">
            <ExternalLink size={12} /> Full Live View
          </a>
        </div>
      </div>

      {/* Score card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl mb-4">
        <div className="flex justify-between items-center">
          <div className="flex-1 text-center">
            <h2 className="text-xl font-black">{matchData.teamA.name}</h2>
            {matchData.innings?.[0] && (
              <p className="text-xs text-slate-500 mt-1">
                {matchData.innings[0].battingTeam === matchData.teamA.name
                  ? `${matchData.innings[0].totalRuns}/${matchData.innings[0].totalWickets}`
                  : matchData.innings[1] ? `${matchData.innings[1].totalRuns}/${matchData.innings[1].totalWickets}` : ""}
              </p>
            )}
          </div>
          <div className="flex-1 text-center px-4">
            {currentInning ? (
              <>
                <div className="text-4xl font-black tracking-tight">
                  {score.runs}<span className="text-slate-500 text-xl mx-1">/</span>{score.wickets}
                </div>
                <div className="text-sm text-slate-400 font-bold uppercase mt-2">
                  Overs {score.oversStr}
                </div>
                {status === "live" && (
                  <div className="text-xs text-emerald-400 font-bold mt-1">CRR {score.crr}</div>
                )}
              </>
            ) : (
              <span className="text-xl font-bold text-slate-500">Scheduled</span>
            )}
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-black">{matchData.teamB.name}</h2>
            {matchData.innings?.[0] && (
              <p className="text-xs text-slate-500 mt-1">
                {matchData.innings[0].battingTeam === matchData.teamB.name
                  ? `${matchData.innings[0].totalRuns}/${matchData.innings[0].totalWickets}`
                  : matchData.innings[1] ? `${matchData.innings[1].totalRuns}/${matchData.innings[1].totalWickets}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Target info for 2nd innings */}
        {target && status === "live" && (
          <div className="mt-4 p-3 bg-slate-800/60 rounded-2xl border border-slate-700 text-center text-sm font-bold">
            Target: <span className="text-yellow-400 font-black">{target}</span>
            {" · "}Need <span className="text-white font-black">{requiredRuns}</span> runs
            {" · "}RRR <span className="text-orange-400 font-black">{rrr}</span>
          </div>
        )}

        {/* Innings break */}
        {status === "innings_break" && (
          <div className="mt-4 p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-center text-sm font-bold text-yellow-400">
            Innings Break — {firstInning?.battingTeam} scored {firstInning?.totalRuns}/{firstInning?.totalWickets}. Target: {(firstInning?.totalRuns || 0) + 1}
          </div>
        )}

        {/* Match result */}
        {status === "completed" && result?.description && (
          <div className="mt-4 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center text-sm font-black text-emerald-400">
            {result.description}
          </div>
        )}
      </div>

      {/* Batting & Bowling row */}
      {status === "live" && (batting.striker || bowling.bowler) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {batting.striker && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Batting</p>
              <p className="font-black text-sm">{batting.striker} <span className="text-yellow-400">*</span></p>
              {batting.nonStriker && <p className="text-sm text-slate-400 font-bold mt-1">{batting.nonStriker}</p>}
            </div>
          )}
          {bowling.bowler && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bowling</p>
              <p className="font-black text-sm">{bowling.bowler}</p>
              {bowling.bowlerStats && (
                <p className="text-xs text-slate-400 mt-1">
                  {bowling.bowlerStats.overs}ov · {bowling.bowlerStats.runs}R/{bowling.bowlerStats.wickets}W
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Balls Timeline */}
      {recentBalls.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Balls</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentBalls.map((ball, i) => (
              <BallChip key={ball._id || i} ball={ball} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
