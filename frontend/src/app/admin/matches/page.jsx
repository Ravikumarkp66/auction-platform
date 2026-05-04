"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Play, ExternalLink } from "lucide-react";

export default function MatchesDashboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // For testing, we'll just fetch active tournament and two teams to auto-create a match
  const [setupData, setSetupData] = useState(null);

  useEffect(() => {
    fetchMatches();
    fetchSetupData();
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

  const fetchSetupData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/tournaments/status/active`);
      if (res.ok) {
        setSetupData(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createTestMatch = async () => {
    if (!setupData || !setupData.tournament || setupData.teams.length < 2) {
      alert("Need an active tournament and at least 2 teams to create a match.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: setupData.tournament._id,
          teamA: setupData.teams[0]._id,
          teamB: setupData.teams[1]._id,
          totalOvers: 10
        })
      });

      if (res.ok) {
        fetchMatches(); // Refresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startMatch = async (matchId, teamAId, teamBId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match/${matchId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battingTeam: teamAId,
          bowlingTeam: teamBId
        })
      });
      fetchMatches();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading matches...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Match Control Center</h1>
          <p className="text-slate-500">Manage live matches and open the scoring UI</p>
        </div>
        <button 
          onClick={createTestMatch}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-md"
        >
          <Plus size={18} /> Create Test Match
        </button>
      </div>

      <div className="grid gap-4">
        {matches.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 mb-4">No matches found.</p>
            <button onClick={createTestMatch} className="text-blue-600 font-medium hover:underline">Create your first match</button>
          </div>
        ) : (
          matches.map(match => (
            <div key={match._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${match.status === 'live' ? 'bg-red-100 text-red-600' : match.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {match.status}
                  </span>
                  <span className="text-xs text-slate-500">{match.totalOvers} Overs</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  {match.teamA?.name || 'Team A'} vs {match.teamB?.name || 'Team B'}
                </h3>
                {match.result && <p className="text-sm font-medium text-emerald-600 mt-1">{match.result}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {match.status === "scheduled" && (
                  <button 
                    onClick={() => startMatch(match._id, match.teamA._id, match.teamB._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition"
                  >
                    <Play size={16} /> Start Match
                  </button>
                )}
                
                {(match.status === "live" || match.status === "completed") && (
                  <>
                    <Link 
                      href={`/match/score/${match._id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700 transition"
                    >
                      <Plus size={16} /> Scorer Panel
                    </Link>
                    <Link 
                      href={`/match/live/${match._id}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 transition"
                    >
                      <ExternalLink size={16} /> Viewer Overlay
                    </Link>
                  </>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
