"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Crosshair, Trophy, ChevronRight } from "lucide-react";
import CricketMatchCard from "@/components/cricket/CricketMatchCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminMatchesDashboard() {
  const [matches,    setMatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupData,  setSetupData]  = useState(null);
  const [filter,     setFilter]     = useState("all");

  // ── Fetch cricket matches from new cricket API ──────────────
  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await fetch(`${API}/api/cricket`);
      const data = res.ok ? await res.json() : {};
      const list = Array.isArray(data) ? data : (data.matches || []);
      setMatches(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSetupData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/tournaments/status/active`);
      if (res.ok) setSetupData(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    fetchSetupData();
    const interval = setInterval(() => fetchMatches(true), 20_000);
    return () => clearInterval(interval);
  }, [fetchMatches, fetchSetupData]);

  // ── Filter ────────────────────────────────────────────────
  const live      = matches.filter(m => m.status === "live" || m.status === "innings_break");
  const scheduled = matches.filter(m => m.status === "scheduled");
  const completed = matches.filter(m => m.status === "completed");

  const filtered = matches.filter(m => {
    if (filter === "live")      return m.status === "live" || m.status === "innings_break";
    if (filter === "upcoming")  return m.status === "scheduled";
    if (filter === "completed") return m.status === "completed";
    return true;
  });

  const FILTERS = [
    { key: "all",       label: "All",       count: matches.length  },
    { key: "live",      label: "Live",      count: live.length      },
    { key: "upcoming",  label: "Upcoming",  count: scheduled.length },
    { key: "completed", label: "Completed", count: completed.length },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans">
      <div className="max-w-5xl mx-auto p-4 lg:p-6 pb-20">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Match Control Centre
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Score live matches · Manage all cricket games
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchMatches(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <Link
              href="/admin/cricket/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/30"
            >
              <Plus size={15} /> New Match
            </Link>
          </div>
        </div>

        {/* ── Live summary strip ── */}
        {live.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-red-500/8 border border-red-500/20 rounded-xl mb-6 overflow-x-auto">
            <span className="flex items-center gap-1.5 text-xs font-black text-red-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {live.length} LIVE
            </span>
            {live.map(m => (
              <Link
                key={m._id}
                href={`/match/score/${m._id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-all shrink-0"
              >
                <Crosshair size={11} className="text-violet-400" />
                <span className="text-slate-300">{m.teamA?.name} vs {m.teamB?.name}</span>
                {(() => {
                  const inn = m.innings?.[m.currentInnings - 1];
                  if (!inn) return null;
                  return (
                    <span className="text-white font-black">
                      {inn.totalRuns}/{inn.totalWickets}
                      <span className="text-slate-500 font-normal ml-1">
                        ({Math.floor(inn.totalBalls / 6)}.{inn.totalBalls % 6})
                      </span>
                    </span>
                  );
                })()}
                <ChevronRight size={11} className="text-slate-600" />
              </Link>
            ))}
          </div>
        )}

        {/* ── Filter pills ── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                text-xs font-bold whitespace-nowrap transition-all
                ${filter === f.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                }
              `}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-indigo-500" : "bg-slate-700 text-slate-400"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Match grid — isAdmin=true shows Score button ── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => {}} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(match => (
              <CricketMatchCard
                key={match._id}
                match={match}
                isAdmin={true}
                showLiveLink={true}
              />
            ))}
          </div>
        )}

        {/* ── Quick Setup Panel ── */}
        {setupData?.tournament && (
          <div className="mt-8 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Active Tournament
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-white">{setupData.tournament.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {setupData.teams?.length || 0} teams · {setupData.players?.length || 0} players
                </p>
              </div>
              <Link
                href="/admin/cricket/new"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Create Match <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
      <div className="text-5xl mb-4">🏏</div>
      <p className="font-bold text-sm text-slate-400 mb-1">No matches yet</p>
      <p className="text-xs mb-5">Create your first cricket match to get started.</p>
      <Link
        href="/admin/cricket/new"
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
      >
        <Plus size={15} /> New Match
      </Link>
    </div>
  );
}
