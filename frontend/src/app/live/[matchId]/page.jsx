"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCricketSocket } from "@/hooks/useCricketSocket";
import { Wifi, WifiOff } from "lucide-react";

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

export default function LiveViewer() {
  const { matchId } = useParams();
  const API = typeof window !== "undefined"
    ? `http://${window.location.hostname}:5050`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050");

  const [matchData, setMatchData] = useState(null);
  const [recentBalls, setRecentBalls] = useState([]);
  const [liveState, setLiveState] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/cricket/${matchId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMatchData(data.match);
      setRecentBalls(data.recentBalls || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [matchId, API]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const onMatchUpdate = useCallback((payload) => { setLiveState(payload); }, []);
  const onBallAdded = useCallback((ball) => { setRecentBalls(prev => [ball, ...prev].slice(0, 18)); }, []);
  const onBallUndo = useCallback(() => { fetchMatch(); }, [fetchMatch]);
  const onMatchEnd = useCallback((result) => {
    setLiveState(prev => prev ? { ...prev, status: "completed", result } : prev);
    fetchMatch();
  }, [fetchMatch]);
  const onInningsEnd = useCallback(() => {
    setLiveState(prev => prev ? { ...prev, status: "innings_break" } : prev);
    fetchMatch();
  }, [fetchMatch]);

  const { connected, reconnecting } = useCricketSocket(matchId, {
    onMatchUpdate, onBallAdded, onBallUndo, onMatchEnd, onInningsEnd,
  });

  if (loading) return <div className="p-8 text-white text-center">Loading Live...</div>;
  if (!matchData) return <div className="p-8 text-red-400 text-center font-bold">Match not found.</div>;

  // Merge HTTP + live socket data
  const currentInning = matchData.innings?.[matchData.currentInnings - 1];
  const firstInning = matchData.innings?.[0];
  const totalBalls = currentInning?.totalBalls || 0;

  const score = liveState?.score || {
    runs: currentInning?.totalRuns || 0,
    wickets: currentInning?.totalWickets || 0,
    oversStr: `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`,
    crr: totalBalls > 0 ? ((currentInning.totalRuns / totalBalls) * 6).toFixed(2) : "0.00",
  };

  const batting = liveState?.batting || { striker: matchData.currentStriker, nonStriker: matchData.currentNonStriker };
  const bowling = liveState?.bowling || { bowler: matchData.currentBowler };
  const status = liveState?.status || matchData.status;
  const result = liveState?.result || matchData.result;
  const target = liveState?.target ?? null;
  const requiredRuns = liveState?.requiredRuns ?? null;
  const rrr = liveState?.rrr ?? null;
  const flags = liveState?.flags || {};

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 text-white min-h-screen">

      {/* Connection */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === "live" && (
            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE
            </span>
          )}
          {status === "innings_break" && (
            <span className="text-xs font-black uppercase text-yellow-400">INNINGS BREAK</span>
          )}
          {status === "completed" && (
            <span className="text-xs font-black uppercase text-emerald-400">COMPLETED</span>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs font-bold ${connected ? "text-emerald-400" : reconnecting ? "text-yellow-400" : "text-red-400"}`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? "Live" : reconnecting ? "Reconnecting..." : "Offline"}
        </span>
      </div>

      {/* Scoreboard */}
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
              <span className="text-xl font-bold text-slate-500">v</span>
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

        {/* Target bar */}
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

      {/* Batting & Bowling */}
      {status === "live" && (batting.striker || bowling.bowler) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {batting.striker && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Batting</p>
              <p className="font-black text-sm">
                {batting.striker} <span className="text-yellow-400">*</span>
                {batting.strikerStats && (
                  <span className="text-xs text-slate-400 ml-2">
                    {batting.strikerStats.runs}({batting.strikerStats.balls}b)
                  </span>
                )}
              </p>
              {batting.nonStriker && (
                <p className="text-sm text-slate-400 font-bold mt-1">
                  {batting.nonStriker}
                  {batting.nonStrikerStats && (
                    <span className="text-xs ml-2">
                      {batting.nonStrikerStats.runs}({batting.nonStrikerStats.balls}b)
                    </span>
                  )}
                </p>
              )}
              {flags.awaitingBatsman && (
                <p className="text-xs text-red-400 font-bold mt-2">⚠ Awaiting next batsman</p>
              )}
            </div>
          )}
          {bowling.bowler && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bowling</p>
              <p className="font-black text-sm">{bowling.bowler}</p>
              {bowling.bowlerStats && (
                <p className="text-xs text-slate-400 mt-1">
                  {bowling.bowlerStats.overs}ov · {bowling.bowlerStats.runs}R/{bowling.bowlerStats.wickets}W · Eco {bowling.bowlerStats.economy}
                </p>
              )}
              {flags.awaitingBowler && (
                <p className="text-xs text-orange-400 font-bold mt-2">⚠ Awaiting new bowler</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Balls */}
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
