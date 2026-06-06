"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import CricketMatchCard from "@/components/cricket/CricketMatchCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ScorerMatchesList() {
  const router = useRouter();
  const [matches,    setMatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("all");

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

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(() => fetchMatches(true), 25_000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

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
    { key: "all",       label: "All",       count: matches.length   },
    { key: "live",      label: "Live",      count: live.length       },
    { key: "upcoming",  label: "Upcoming",  count: scheduled.length  },
    { key: "completed", label: "Completed", count: completed.length  },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans pb-24">

      {/* ── Sticky header ── */}
      <div className="bg-[#1a1d27] border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl hover:bg-white/5 transition-colors text-slate-400"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-sm">Matches</h1>
            {live.length > 0 && (
              <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                {live.length} live match{live.length > 1 ? "es" : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => fetchMatches(true)}
            disabled={refreshing}
            className="p-1.5 rounded-xl hover:bg-white/5 text-slate-400 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link
            href="/admin/cricket/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all"
          >
            <Plus size={13} /> New
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-bold whitespace-nowrap shrink-0 transition-all
                ${filter === f.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
                }
              `}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[9px] font-black px-1 rounded ${filter === f.key ? "text-indigo-200" : "text-slate-600"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Match list ── */}
      <div className="p-4 space-y-3 max-w-lg mx-auto w-full">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl h-44 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <div className="text-3xl mb-3">🏏</div>
            <p className="font-semibold text-sm text-slate-500">No matches found</p>
          </div>
        ) : (
          filtered.map(match => (
            <CricketMatchCard
              key={match._id}
              match={match}
              isAdmin={true}
              showLiveLink={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
