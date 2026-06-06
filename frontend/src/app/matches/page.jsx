"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw, Plus, Trophy, Wifi,
  ChevronRight, Clock, MapPin, Users, Star,
  Activity, Target, Search, Filter,
  Pencil, Trash2, Eye, Calendar,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTournaments, FORMATS, BALL_TYPES, getTournamentStatus } from "@/hooks/useTournaments";
import { usePlayers, ROLES, BATTING_STYLES, BOWLING_STYLES, getRole, getBattingStyle, getBowlingStyle } from "@/hooks/usePlayers";
import { useTeams } from "@/hooks/useTeams";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── helpers ───────────────────────────────────────────────────
function oversDisplay(balls = 0) { return `${Math.floor(balls / 6)}.${balls % 6}`; }

// ─── TABS ────────────────────────────────────────────────────
const TABS = [
  { id: "matches",     label: "Matches",     icon: Activity },
  { id: "live",        label: "Live",        icon: Wifi,   live: true },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "teams",       label: "Teams",       icon: Users },
  { id: "players",     label: "Players",     icon: Star },
];

// ─── STATUS BADGE ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    live:      { label: "LIVE",      cls: "text-red-400   bg-red-500/10   border-red-500/25"   },
    innings_break: { label: "BREAK", cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
    scheduled: { label: "UPCOMING",  cls: "text-sky-400   bg-sky-500/10   border-sky-500/25"   },
    completed: { label: "COMPLETED", cls: "text-slate-400 bg-slate-700/30 border-slate-600/25" },
    ongoing:   { label: "ONGOING",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    upcoming:  { label: "UPCOMING",  cls: "text-sky-400   bg-sky-500/10   border-sky-500/25"   },
  };
  const { label, cls } = map[status] || map.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${cls}`}>
      {(status === "live" || status === "ongoing") && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}

// ─── MATCH ROW ────────────────────────────────────────────────
function MatchRow({ match, isAdmin }) {
  const currentInn = match.innings?.[match.currentInnings - 1];
  const battingNow = currentInn?.battingTeam;
  const isLive     = match.status === "live" || match.status === "innings_break";

  const scoreFor = (teamName) => {
    const i = match.innings?.find(x => x.battingTeam === teamName);
    return i ? `${i.totalRuns}/${i.totalWickets} (${oversDisplay(i.totalBalls)})` : null;
  };
  const scoreA = scoreFor(match.teamA?.name);
  const scoreB = scoreFor(match.teamB?.name);

  return (
    <div className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 hover:bg-white/[0.03] hover:border-slate-700 ${isLive ? "bg-red-500/[0.04] border-red-500/15" : "bg-white/[0.02] border-white/[0.05]"}`}>
      <div className="shrink-0 w-[80px]"><StatusBadge status={match.status} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-sm font-bold truncate ${battingNow === match.teamA?.name ? "text-white" : "text-slate-300"}`}>{match.teamA?.name || "TBA"}</span>
          {scoreA && <span className={`text-xs font-black shrink-0 ${battingNow === match.teamA?.name && isLive ? "text-amber-400" : "text-slate-300"}`}>{scoreA}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold truncate ${battingNow === match.teamB?.name ? "text-white" : "text-slate-400"}`}>{match.teamB?.name || "TBA"}</span>
          {scoreB && <span className={`text-xs font-black shrink-0 ${battingNow === match.teamB?.name && isLive ? "text-amber-400" : "text-slate-300"}`}>{scoreB}</span>}
        </div>
        {match.result?.description && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 truncate">{match.result.description}</p>}
      </div>
      <div className="hidden md:flex flex-col items-end gap-0.5 text-[10px] text-slate-500 shrink-0">
        {match.matchFormat && <span>{match.matchFormat}{match.oversLimit && ` · ${match.oversLimit} ov`}</span>}
        {match.venue && <span className="flex items-center gap-0.5"><MapPin size={8} />{match.venue}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isLive && (
          <Link href={`/live/${match._id}`} target="_blank"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/20 transition-all">
            <Wifi size={9} /> Watch
          </Link>
        )}
        <Link href={`/matches/${match._id}`}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-all">
          <ChevronRight size={12} />
        </Link>
        {isAdmin && (
          <Link href={`/match/score/${match._id}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-[10px] font-black border border-violet-500/20 transition-all">
            <Target size={9} /> Score
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon: Icon }) {
  const a = {
    red:    { ring: "border-red-500/20",    text: "text-red-400",    bg: "bg-red-500/8"    },
    amber:  { ring: "border-amber-500/20",  text: "text-amber-400",  bg: "bg-amber-500/8"  },
    violet: { ring: "border-violet-500/20", text: "text-violet-400", bg: "bg-violet-500/8" },
    slate:  { ring: "border-slate-700/50",  text: "text-slate-400",  bg: "bg-slate-800/40" },
  }[accent] || { ring: "border-slate-700/50", text: "text-slate-400", bg: "bg-slate-800/40" };
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${a.ring} ${a.bg}`}>
      <div className={`p-2 rounded-lg bg-white/[0.05] ${a.text}`}><Icon size={14} /></div>
      <div className="min-w-0">
        <div className={`text-lg font-black leading-none ${a.text}`}>{value}</div>
        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{label}</div>
        {sub && <div className="text-[9px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────
function SectionHeader({ title, sub, accent, action }) {
  const line = { red: "bg-red-500", amber: "bg-amber-500", violet: "bg-violet-500" }[accent] || "bg-slate-600";
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-0.5 h-4 rounded-full ${line}`} />
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
          {sub && <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────
function EmptyState({ icon, msg, sub, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <span className="text-4xl mb-1">{icon}</span>
      <p className="text-sm font-bold text-slate-400">{msg}</p>
      {sub  && <p className="text-xs text-slate-600">{sub}</p>}
      {cta}
    </div>
  );
}

// ─── PLACEHOLDER TABLE ────────────────────────────────────────
function PlaceholderTable({ columns, rows = 5, label }) {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="grid px-3 py-2 bg-white/[0.03] border-b border-white/[0.05]"
        style={{ gridTemplateColumns: columns.map(c => c.width || "1fr").join(" ") }}>
        {columns.map(c => (
          <span key={c.key} className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.label}</span>
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid px-3 py-2.5 border-b border-white/[0.03]"
          style={{ gridTemplateColumns: columns.map(c => c.width || "1fr").join(" ") }}>
          {columns.map((c, j) => (
            <div key={c.key} className={`h-3 rounded-full animate-pulse ${j === 0 ? "bg-slate-700/60 w-3/4" : j === 1 ? "bg-slate-800/60 w-1/2" : "bg-slate-800/40 w-1/3"}`}
              style={{ animationDelay: `${i * 80 + j * 30}ms` }} />
          ))}
        </div>
      ))}
      <div className="px-3 py-3 text-center">
        <span className="text-[10px] text-slate-600 font-medium italic">{label}</span>
      </div>
    </div>
  );
}

// ─── TOURNAMENT STATUS BADGE ──────────────────────────────────
function TStatusBadge({ status }) {
  const map = {
    ongoing:   { label: "Ongoing",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: true  },
    upcoming:  { label: "Upcoming",  cls: "text-sky-400 bg-sky-500/10 border-sky-500/25",             dot: false },
    completed: { label: "Completed", cls: "text-slate-400 bg-slate-700/30 border-slate-600/25",       dot: false },
  };
  const { label, cls, dot } = map[status] || map.upcoming;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}

// ─── TOURNAMENT ROW ───────────────────────────────────────────
function TournamentRow({ tournament, onDelete, isAdmin }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getTournamentStatus(tournament.startDate, tournament.endDate);
  const fmt    = FORMATS.find(f => f.id === tournament.format);
  const ball   = BALL_TYPES.find(b => b.id === tournament.ballType);

  const handleDelete = () => {
    if (confirmDelete) { onDelete(tournament.id); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  };

  return (
    <div className={`
      group flex flex-col sm:flex-row sm:items-center gap-3
      px-3 py-3 rounded-xl border transition-all duration-150
      hover:bg-white/[0.03] hover:border-slate-700
      ${status === "ongoing"
        ? "bg-emerald-500/[0.03] border-emerald-500/15"
        : "bg-white/[0.02] border-white/[0.05]"
      }
    `}>

      {/* Status */}
      <div className="shrink-0"><TStatusBadge status={status} /></div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-white truncate">{tournament.name}</span>
          <span className="text-[10px] text-slate-500 font-semibold shrink-0">Season {tournament.season}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {fmt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
              <span>{fmt.icon}</span> {fmt.label}
            </span>
          )}
          {ball && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span>{ball.icon}</span> {ball.label}
            </span>
          )}
        </div>
      </div>

      {/* Date range */}
      <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 font-medium shrink-0">
        <Calendar size={9} />
        {tournament.startDate
          ? `${tournament.startDate} → ${tournament.endDate}`
          : "Dates TBD"
        }
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/cricket/tournaments/${tournament.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[10px] font-bold border border-white/[0.06] transition-all"
        >
          <Eye size={10} /> View
        </Link>
        {isAdmin && (
          <>
            <Link
              href={`/cricket/tournaments/${tournament.id}/edit`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/8 hover:bg-violet-500/18 text-violet-400 text-[10px] font-bold border border-violet-500/15 transition-all"
            >
              <Pencil size={10} /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                confirmDelete
                  ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
                  : "bg-red-500/8 hover:bg-red-500/18 text-red-400 border-red-500/15"
              }`}
            >
              {confirmDelete ? <><XCircle size={10} /> Confirm</> : <><Trash2 size={10} /> Delete</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TOURNAMENTS TAB ──────────────────────────────────────────
function TournamentsTab({ isAdmin }) {
  const { tournaments, deleteTournament } = useTournaments();
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all"); // all | ongoing | upcoming | completed

  const STATUS_FILTERS = [
    { key: "all",       label: "All"       },
    { key: "ongoing",   label: "Ongoing"   },
    { key: "upcoming",  label: "Upcoming"  },
    { key: "completed", label: "Completed" },
  ];

  // Attach computed status to each tournament
  const enriched = tournaments.map(t => ({
    ...t,
    _status: getTournamentStatus(t.startDate, t.endDate),
  }));

  const filtered = enriched
    .filter(t => filter === "all" || t._status === filter)
    .filter(t => !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:       enriched.length,
    ongoing:   enriched.filter(t => t._status === "ongoing").length,
    upcoming:  enriched.filter(t => t._status === "upcoming").length,
    completed: enriched.filter(t => t._status === "completed").length,
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-black text-white">Tournaments</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            {enriched.length} tournament{enriched.length !== 1 ? "s" : ""} · managed locally
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/cricket/tournaments/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.85), rgba(99,102,241,0.85))",
              border: "1px solid rgba(124,58,237,0.4)",
              color: "#e9d5ff",
              boxShadow: "0 0 12px rgba(124,58,237,0.2)",
            }}
          >
            <Plus size={12} /> New Tournament
          </Link>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tournaments…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.07] transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
              <XCircle size={12} />
            </button>
          )}
        </div>
        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black
                whitespace-nowrap shrink-0 border transition-all
                ${filter === f.key
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-slate-600"
                }
              `}
            >
              {f.label}
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${filter === f.key ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tournament list */}
      {enriched.length === 0 ? (
        <EmptyState
          icon="🏆"
          msg="No tournaments created yet"
          sub="Create your first cricket tournament to get started"
          cta={
            isAdmin && (
              <Link
                href="/cricket/tournaments/new"
                className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
              >
                <Trophy size={14} /> Create Tournament
              </Link>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          msg="No matching tournaments"
          sub={`No results for "${search}" in "${filter}"`}
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map(t => (
            <TournamentRow
              key={t.id}
              tournament={t}
              onDelete={deleteTournament}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MATCHES TAB ─────────────────────────────────────────────
function MatchesTab({ matches, loading, isAdmin }) {
  const live     = matches.filter(m => m.status === "live" || m.status === "innings_break");
  const upcoming = matches.filter(m => m.status === "scheduled");
  const completed= matches.filter(m => m.status === "completed");

  if (loading) return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
  if (matches.length === 0) return <EmptyState icon="🏏" msg="No matches found" sub="Create your first match to get started" />;
  return (
    <div className="space-y-6">
      {live.length > 0 && (
        <div>
          <SectionHeader title="Live Now" sub={`${live.length} match${live.length > 1 ? "es" : ""} in progress`} accent="red"
            action={<span className="flex items-center gap-1 text-[10px] text-red-400 font-black"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{live.length} LIVE</span>} />
          <div className="space-y-1.5">{live.map(m => <MatchRow key={m._id} match={m} isAdmin={isAdmin} />)}</div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <SectionHeader title="Upcoming" sub={`${upcoming.length} scheduled`} accent="amber" />
          <div className="space-y-1.5">{upcoming.map(m => <MatchRow key={m._id} match={m} isAdmin={isAdmin} />)}</div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <SectionHeader title="Completed" sub={`${completed.length} finished`} />
          <div className="space-y-1.5">{completed.map(m => <MatchRow key={m._id} match={m} isAdmin={isAdmin} />)}</div>
        </div>
      )}
    </div>
  );
}

// ─── LIVE TAB ────────────────────────────────────────────────
function LiveTab({ matches, loading, isAdmin }) {
  const live = matches.filter(m => m.status === "live" || m.status === "innings_break");
  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-red-500/[0.04] border border-red-500/10 animate-pulse" />)}</div>;
  if (live.length === 0) return <EmptyState icon="📡" msg="No live matches right now" sub="Check back soon — matches update in real time" />;
  return (
    <div className="space-y-3">
      <SectionHeader title="Live Matches" sub="Real-time scores" accent="red"
        action={<span className="text-[10px] text-slate-500 font-medium">Auto-refresh 30s</span>} />
      <div className="space-y-2">
        {live.map(m => {
          const currentInn = m.innings?.[m.currentInnings - 1];
          const inn1 = m.innings?.[0];
          const inn2 = m.innings?.[1];
          const balls = currentInn?.totalBalls || 0;
          const crr   = balls > 0 ? ((currentInn.totalRuns / balls) * 6).toFixed(1) : "0.0";
          return (
            <div key={m._id} className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 hover:bg-red-500/[0.07] transition-all">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-black text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                  <span className="text-[10px] text-slate-500">{m.matchFormat} · {m.oversLimit} ov</span>
                </div>
                <div className="flex gap-1.5">
                  <Link href={`/live/${m._id}`} target="_blank"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-black border border-red-500/20 transition-all">
                    <Wifi size={9} /> Watch Live
                  </Link>
                  {isAdmin && (
                    <Link href={`/match/score/${m._id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-black border border-violet-500/20 transition-all">
                      <Target size={9} /> Score
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  {[m.teamA, m.teamB].map(team => {
                    const inn = m.innings?.find(x => x.battingTeam === team?.name);
                    const bat = currentInn?.battingTeam === team?.name;
                    return (
                      <div key={team?.name} className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${bat ? "text-white" : "text-slate-400"}`}>
                          {team?.name}{bat && <span className="ml-1 text-[9px] text-amber-400 font-black">BAT</span>}
                        </span>
                        {inn
                          ? <span className={`text-sm font-black ${bat ? "text-white" : "text-slate-400"}`}>{inn.totalRuns}/{inn.totalWickets} <span className="text-[11px] text-slate-500">({oversDisplay(inn.totalBalls)})</span></span>
                          : <span className="text-xs text-slate-600">Yet to bat</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="text-right shrink-0 pl-3 border-l border-white/[0.06]">
                  <div className="text-[10px] text-slate-500 font-semibold">CRR</div>
                  <div className="text-sm font-black text-emerald-400">{crr}</div>
                </div>
              </div>
              {inn1 && inn2 && (
                <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-slate-500">
                  Target <span className="text-amber-400 font-black">{inn1.totalRuns + 1}</span>
                  {" · "}Need <span className="text-white font-black">{Math.max(0, (inn1.totalRuns + 1) - inn2.totalRuns)}</span>
                  {" · "}RRR <span className="text-orange-400 font-black">{(() => { const need = Math.max(0, (inn1.totalRuns + 1) - inn2.totalRuns); const b = (m.oversLimit || 20) * 6 - (inn2.totalBalls || 0); return b > 0 ? ((need / b) * 6).toFixed(1) : "0.0"; })()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamsTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Cricket Teams" sub="All registered teams and squad information" />
      <PlaceholderTable columns={[{ key: "team", label: "Team", width: "2fr" }, { key: "captain", label: "Captain", width: "1fr" }, { key: "players", label: "Players", width: "60px" }, { key: "matches", label: "Matches", width: "60px" }, { key: "action", label: "", width: "40px" }]} rows={8} label="Team profiles coming soon" />
    </div>
  );
}

// ─── PLAYER AVATAR (inline) ───────────────────────────────────
function PlayerAvatar({ player }) {
  const role = getRole(player?.role);
  if (player?.photo) return <img src={player.photo} alt={player.name} className="w-9 h-9 rounded-xl object-cover border border-white/[0.10] shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border border-white/[0.08] select-none"
      style={{ background: role ? `${role.color}18` : "rgba(124,58,237,0.12)", color: role?.color || "#a78bfa" }}>
      {player?.name?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}

// ─── ADD PLAYER MODAL ─────────────────────────────────────────
const inputClsP = "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all duration-200 appearance-none";
const labelClsP = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5";

function AddPlayerModal({ onAdd, onClose, isAdmin }) {
  const { allTeams } = useTeams();
  const emptyForm = { name: "", photo: "", jerseyNumber: "", role: "", battingStyle: "", bowlingStyle: "", age: "", teamId: "" };
  const [form,    setForm]    = useState(emptyForm);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const fileRef = useState(null);
  const imgRef  = { current: null };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setErrors(er => ({ ...er, photo: "Max 3 MB" })); return; }
    const reader = new FileReader();
    reader.onload = ev => { const b64 = ev.target.result; setPreview(b64); set("photo", b64); };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Player name is required";
    if (!form.role)        e.role = "Select a role";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const team = allTeams.find(t => t.id === form.teamId);
    onAdd({ ...form, tournamentId: team?.tournamentId || "" });
    setLoading(false);
    onClose();
  };

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.10] overflow-hidden shadow-2xl"
        style={{ background: "rgba(11,16,40,0.98)", backdropFilter: "blur(24px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25"><Star size={14} className="text-violet-400" /></div>
            <div>
              <h2 className="text-sm font-black text-white">Add Player</h2>
              <p className="text-[10px] text-slate-500 font-medium">Register a new player</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"><XCircle size={14} /></button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">

          {/* Photo + name + jersey row */}
          <div className="flex items-start gap-3">
            <label className="relative w-16 h-16 rounded-xl border-2 border-dashed border-white/[0.15] hover:border-violet-500/40 bg-white/[0.03] flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden shrink-0 group transition-all">
              {preview
                ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                : <><Pencil size={13} className="text-slate-500 group-hover:text-violet-400 transition-colors" /><span className="text-[9px] text-slate-600 font-bold">Photo</span></> }
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
            </label>
            <div className="flex-1 space-y-3">
              <div>
                <label className={labelClsP} htmlFor="pl-name">Player Name *</label>
                <input id="pl-name" type="text" placeholder="e.g. Virat Kohli" value={form.name}
                  onChange={e => set("name", e.target.value)} maxLength={60}
                  className={`${inputClsP} ${errors.name ? "border-red-500/50" : ""}`} />
                {errors.name && <p className="mt-1 text-[11px] text-red-400 font-semibold flex items-center gap-1"><AlertCircle size={10}/>{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClsP} htmlFor="pl-jersey">Jersey #</label>
                  <input id="pl-jersey" type="number" placeholder="10" min={1} max={999} value={form.jerseyNumber}
                    onChange={e => set("jerseyNumber", e.target.value)}
                    className={`${inputClsP} text-center font-black`} />
                </div>
                <div>
                  <label className={labelClsP} htmlFor="pl-age">Age</label>
                  <input id="pl-age" type="number" placeholder="22" min={10} max={60} value={form.age}
                    onChange={e => set("age", e.target.value)}
                    className={inputClsP} />
                </div>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className={labelClsP}>Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => set("role", r.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs font-bold ${
                    form.role === r.id ? "" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20"
                  }`}
                  style={form.role === r.id ? { borderColor: `${r.color}50`, background: `${r.color}15`, color: r.color } : {}}>
                  <span className="text-base">{r.icon}</span> {r.label}
                  {form.role === r.id && <CheckCircle2 size={11} className="ml-auto" />}
                </button>
              ))}
            </div>
            {errors.role && <p className="mt-1.5 text-[11px] text-red-400 font-semibold flex items-center gap-1"><AlertCircle size={10}/>{errors.role}</p>}
          </div>

          {/* Batting style */}
          <div>
            <label className={labelClsP}>Batting Style</label>
            <div className="flex gap-2">
              {BATTING_STYLES.map(b => (
                <button key={b.id} type="button" onClick={() => set("battingStyle", b.id)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                    form.battingStyle === b.id ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20"
                  }`}>
                  🏏 {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bowling style */}
          <div>
            <label className={labelClsP} htmlFor="pl-bowl">Bowling Style</label>
            <div className="relative">
              <select id="pl-bowl" value={form.bowlingStyle} onChange={e => set("bowlingStyle", e.target.value)}
                className={`${inputClsP} pr-8 cursor-pointer`}>
                <option value="" className="bg-[#0f172a]">Select bowling style…</option>
                {BOWLING_STYLES.map(b => <option key={b.id} value={b.id} className="bg-[#0f172a]">{b.label}</option>)}
              </select>
              <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Team assignment */}
          {allTeams.length > 0 && (
            <div>
              <label className={labelClsP} htmlFor="pl-team">Assign to Team</label>
              <div className="relative">
                <select id="pl-team" value={form.teamId} onChange={e => set("teamId", e.target.value)}
                  className={`${inputClsP} pr-8 cursor-pointer`}>
                  <option value="" className="bg-[#0f172a]">No team — Free agent</option>
                  {allTeams.map(t => <option key={t.id} value={t.id} className="bg-[#0f172a]">{t.name} ({t.shortName})</option>)}
                </select>
                <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2.5 pt-1 sticky bottom-0 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs font-bold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.01]"}`}
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: loading ? "none" : "0 0 16px rgba(124,58,237,0.3)", color: "#ede9fe" }}>
              {loading ? <>Loading…</> : <><CheckCircle2 size={13} /> Add Player</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PLAYER ROW ───────────────────────────────────────────────
function PlayerRow({ player, onDelete, isAdmin }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const { allTeams } = useTeams();
  const role   = getRole(player.role);
  const batSt  = getBattingStyle(player.battingStyle);
  const bowSt  = getBowlingStyle(player.bowlingStyle);
  const team   = allTeams.find(t => t.id === player.teamId);

  const handleDelete = () => {
    if (confirmDel) { onDelete(player.id); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }
  };

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all duration-150">

      {/* Avatar + info */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <PlayerAvatar player={player} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white truncate">{player.name}</span>
            {player.jerseyNumber && <span className="text-[9px] font-black text-slate-500">#{player.jerseyNumber}</span>}
            {role && (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black border"
                style={{ color: role.color, borderColor: `${role.color}35`, background: `${role.color}12` }}>
                {role.icon} {role.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            {team && <span className="text-[10px] text-slate-500 font-medium">🛡️ {team.name}</span>}
            {batSt && <span className="text-[10px] text-slate-600">🏏 {batSt.short}</span>}
            {bowSt && <span className="text-[10px] text-slate-600">⚡ {bowSt.short}</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href={`/cricket/players/${player.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[10px] font-bold border border-white/[0.06] transition-all">
          <Eye size={10} /> View
        </Link>
        {isAdmin && (
          <>
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/[0.08] hover:bg-violet-500/[0.18] text-violet-400 text-[10px] font-bold border border-violet-500/15 transition-all">
              <Pencil size={10} /> Edit
            </button>
            <button onClick={handleDelete}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                confirmDel ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse" : "bg-red-500/[0.08] hover:bg-red-500/[0.18] text-red-400 border-red-500/15"
              }`}>
              {confirmDel ? <><XCircle size={10} /> Confirm</> : <><Trash2 size={10} /> Del</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PLAYERS TAB ──────────────────────────────────────────────
function PlayersTab({ isAdmin }) {
  const { players, addPlayer, deletePlayer } = usePlayers();
  const [showModal,   setShowModal]   = useState(false);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("all");

  const filtered = players
    .filter(p => roleFilter === "all" || p.role === roleFilter)
    .filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()));

  const roleCounts = {
    all:          players.length,
    batsman:      players.filter(p => p.role === "batsman").length,
    bowler:       players.filter(p => p.role === "bowler").length,
    allrounder:   players.filter(p => p.role === "allrounder").length,
    wicketkeeper: players.filter(p => p.role === "wicketkeeper").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-black text-white">Players</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{players.length} player{players.length !== 1 ? "s" : ""} registered</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,.85),rgba(99,102,241,.85))", border: "1px solid rgba(124,58,237,.4)", color: "#e9d5ff", boxShadow: "0 0 12px rgba(124,58,237,.2)" }}>
            <Plus size={12} /> Add Player
          </button>
        )}
      </div>

      {/* Search + Role filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search players…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-all" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
              <XCircle size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {[{ key: "all", label: "All" }, ...ROLES.map(r => ({ key: r.id, label: r.label, icon: r.icon }))].map(f => (
            <button key={f.key} onClick={() => setRoleFilter(f.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap shrink-0 border transition-all ${
                roleFilter === f.key ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-slate-600"
              }`}>
              {f.icon && <span>{f.icon}</span>} {f.label}
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                roleFilter === f.key ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-500"
              }`}>{roleCounts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
          <span className="text-4xl mb-1">🏏</span>
          <p className="text-sm font-bold text-slate-400">No players added yet</p>
          <p className="text-xs text-slate-600 text-center max-w-xs">Register players to build your cricket platform roster.</p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: "0 0 18px rgba(124,58,237,.3)" }}>
              <Plus size={14} /> Add First Player
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-xl border border-dashed border-white/[0.07]">
          <span className="text-3xl">🔍</span>
          <p className="text-sm font-bold text-slate-400">No matching players</p>
          <p className="text-xs text-slate-600">Try adjusting your search or role filter</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(p => <PlayerRow key={p.id} player={p} onDelete={deletePlayer} isAdmin={isAdmin} />)}
        </div>
      )}

      {showModal && <AddPlayerModal onAdd={addPlayer} onClose={() => setShowModal(false)} isAdmin={isAdmin} />}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
function ScorePageInner() {
  const { data: session } = useSession();
  const isAdmin      = session?.user?.role === "admin";
  const searchParams = useSearchParams();

  const [activeTab,  setActiveTab]  = useState("matches");
  const [matches,    setMatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Handle ?tab= URL param (e.g. from create tournament success screen)
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && TABS.some(t => t.id === tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await fetch(`${API}/api/cricket`);
      const data = res.ok ? await res.json() : {};
      const list = Array.isArray(data) ? data : (data.matches || []);
      setMatches(list);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchMatches();
    const t = setInterval(() => fetchMatches(true), 30_000);
    return () => clearInterval(t);
  }, [fetchMatches]);

  const live      = matches.filter(m => m.status === "live" || m.status === "innings_break");
  const upcoming  = matches.filter(m => m.status === "scheduled");
  const completed = matches.filter(m => m.status === "completed");

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>

      {/* ── Sticky control bar ── */}
      <div className="sticky top-[60px] sm:top-[64px] z-30 border-b border-white/[0.06]"
        style={{ background: "rgba(7,11,26,0.92)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-4">

          {/* Top row */}
          <div className="flex items-center justify-between gap-3 pt-3 pb-2">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-black tracking-tight text-white leading-none">Cricket Hub</h1>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Scores · Fixtures · Rankings</p>
              </div>
              {live.length > 0 && (
                <button onClick={() => setActiveTab("live")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black hover:bg-red-500/15 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {live.length} LIVE
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchMatches(true)} disabled={refreshing}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-all">
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              </button>
              {isAdmin && (
                <>
                  <Link href="/admin/cricket/new"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-slate-300 text-xs font-bold transition-all">
                    <Plus size={12} /> Match
                  </Link>
                  <Link href="/cricket/tournaments/new"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.85), rgba(99,102,241,0.85))", border: "1px solid rgba(124,58,237,0.4)", color: "#e9d5ff", boxShadow: "0 0 16px rgba(124,58,237,0.25)" }}>
                    <Trophy size={12} /> Tournament
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Sub-nav tabs */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(tab => {
              const Icon      = tab.icon;
              const isActive  = activeTab === tab.id;
              const liveCount = tab.live ? live.length : 0;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-all duration-150 ${isActive ? "text-white border-violet-500" : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700"}`}>
                  <Icon size={11} className={isActive ? "text-violet-400" : ""} />
                  {tab.label}
                  {liveCount > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[8px] font-black border border-red-500/25">{liveCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 py-5 pb-24">

        {/* Stat row — Matches tab only */}
        {activeTab === "matches" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <StatCard label="Live Matches"  value={loading ? "–" : live.length}      accent="red"    icon={Wifi}     sub={live.length > 0 ? "Scoring now" : "None active"} />
            <StatCard label="Upcoming"      value={loading ? "–" : upcoming.length}  accent="amber"  icon={Clock}    sub="Scheduled" />
            <StatCard label="Completed"     value={loading ? "–" : completed.length} accent="slate"  icon={Trophy}   sub="Finished" />
            <StatCard label="Total Matches" value={loading ? "–" : matches.length}   accent="violet" icon={Activity} sub="All time" />
          </div>
        )}

        {/* Tab panels */}
        {activeTab === "matches"     && <MatchesTab matches={matches} loading={loading} isAdmin={isAdmin} />}
        {activeTab === "live"        && <LiveTab    matches={matches} loading={loading} isAdmin={isAdmin} />}
        {activeTab === "tournaments" && <TournamentsTab isAdmin={isAdmin} />}
        {activeTab === "teams"       && <TeamsTab />}
        {activeTab === "players"     && <PlayersTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

export default function ScorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ScorePageInner />
    </Suspense>
  );
}
