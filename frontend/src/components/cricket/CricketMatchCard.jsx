"use client";

/**
 * CricketMatchCard — Shared match card used across public listing,
 * scorer listing, and admin listing pages.
 *
 * Props:
 *   match        — CricketMatch document (from /api/cricket)
 *   isAdmin      — boolean — show Score Match button
 *   showLiveLink — boolean — show Watch Live button (default: true)
 */
import Link from "next/link";
import { Eye, Crosshair, Trophy, Calendar, MapPin, Clock } from "lucide-react";

// ── Overs display helper ──────────────────────────────────────
function oversStr(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

// ── Score for a specific team name from innings array ─────────
function teamScore(innings = [], teamName) {
  const inn = innings.find(i => i.battingTeam === teamName);
  if (!inn) return null;
  const balls = inn.totalBalls || 0;
  return {
    runs:    inn.totalRuns    || 0,
    wickets: inn.totalWickets || 0,
    overs:   oversStr(balls),
    balls,
  };
}

// ── Status badge config ───────────────────────────────────────
const STATUS_CONFIG = {
  live: {
    label: "🔴 LIVE CRICKET MATCH",
    dot:   true,
    classes: "bg-red-500/12 text-red-400 border-red-500/25",
    cardGlow: "shadow-red-900/20 shadow-lg",
    borderAccent: "border-l-red-500",
  },
  scheduled: {
    label: "UPCOMING MATCH",
    dot:   false,
    classes: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    cardGlow: "",
    borderAccent: "border-l-slate-700",
  },
  completed: {
    label: "COMPLETED MATCH",
    dot:   false,
    classes: "bg-slate-700/50 text-slate-400 border-slate-600/30",
    cardGlow: "",
    borderAccent: "border-l-emerald-700",
  },
  innings_break: {
    label: "INNINGS BREAK",
    dot:   true,
    classes: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    cardGlow: "",
    borderAccent: "border-l-amber-500",
  },
};

export default function CricketMatchCard({ match, isAdmin = false, showLiveLink = true }) {
  const status = match.status || "scheduled";
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  const scoreA = teamScore(match.innings || [], match.teamA?.name);
  const scoreB = teamScore(match.innings || [], match.teamB?.name);

  // Current innings context (for live matches)
  const currentInn = (match.innings || [])[match.currentInnings - 1];
  const battingNow  = currentInn?.battingTeam;

  // Result text
  const resultText = match.result?.description || "";

  // Format / overs / venue / date
  const meta = [
    match.matchFormat && `${match.matchFormat}`,
    match.oversLimit  && `${match.oversLimit} ov`,
    match.venue       && match.venue,
  ].filter(Boolean).join(" · ");

  const dateStr = match.matchDate || "";

  return (
    <div
      className={`
        group relative bg-slate-900/70 border border-slate-800
        border-l-4 ${cfg.borderAccent}
        rounded-2xl overflow-hidden
        transition-all duration-300
        hover:bg-slate-900/90 hover:border-slate-700
        hover:shadow-xl hover:shadow-slate-950/50 hover:-translate-y-0.5
        ${cfg.cardGlow}
      `}
    >
      {/* ── Live glow ring (live only) ── */}
      {status === "live" && (
        <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/20 group-hover:ring-red-500/35 transition-all pointer-events-none" />
      )}

      <div className="p-4">
        {/* ── Header row: status badge + meta ── */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-0.5
            text-[10px] font-black tracking-widest uppercase
            border rounded-full
            ${cfg.classes}
          `}>
            {cfg.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
            )}
            {cfg.label}
          </span>
          {meta && (
            <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap shrink-0">
              {meta}
            </span>
          )}
        </div>

        {/* ── Team scores ── */}
        <div className="space-y-2 mb-3">
          {/* Team A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Team logo / initials */}
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {match.teamA?.logo ? (
                  <img src={match.teamA.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-400">
                    {match.teamA?.name?.slice(0, 2)?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className={`
                font-bold text-sm truncate
                ${battingNow === match.teamA?.name ? "text-white" : "text-slate-400"}
              `}>
                {match.teamA?.name}
              </span>
              {battingNow === match.teamA?.name && status === "live" && (
                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">
                  BAT
                </span>
              )}
            </div>
            {scoreA ? (
              <div className="text-right shrink-0">
                <span className="font-black text-base text-white">
                  {scoreA.runs}/{scoreA.wickets}
                </span>
                <span className="text-[11px] text-slate-500 ml-1.5">
                  ({scoreA.overs})
                </span>
              </div>
            ) : (
              status !== "scheduled" && (
                <span className="text-xs text-slate-600 font-medium">Yet to bat</span>
              )
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {match.teamB?.logo ? (
                  <img src={match.teamB.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-400">
                    {match.teamB?.name?.slice(0, 2)?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className={`
                font-bold text-sm truncate
                ${battingNow === match.teamB?.name ? "text-white" : "text-slate-400"}
              `}>
                {match.teamB?.name}
              </span>
              {battingNow === match.teamB?.name && status === "live" && (
                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">
                  BAT
                </span>
              )}
            </div>
            {scoreB ? (
              <div className="text-right shrink-0">
                <span className="font-black text-base text-white">
                  {scoreB.runs}/{scoreB.wickets}
                </span>
                <span className="text-[11px] text-slate-500 ml-1.5">
                  ({scoreB.overs})
                </span>
              </div>
            ) : (
              status !== "scheduled" && (
                <span className="text-xs text-slate-600 font-medium">Yet to bat</span>
              )
            )}
          </div>
        </div>

        {/* ── Live target bar ── */}
        {status === "live" && match.innings?.length === 2 && (() => {
          const target = (match.innings[0]?.totalRuns || 0) + 1;
          const curr   = match.innings[1]?.totalRuns || 0;
          const need   = target - curr;
          const balls  = (match.oversLimit || 20) * 6 - (match.innings[1]?.totalBalls || 0);
          const rrr    = balls > 0 ? ((need / balls) * 6).toFixed(1) : "0.0";
          return (
            <div className="mb-3 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs font-bold text-slate-300">
              Target <span className="text-amber-400">{target}</span>
              <span className="text-slate-500 mx-1.5">·</span>
              Need <span className="text-white">{need}</span> off {balls} balls
              <span className="text-slate-500 mx-1.5">·</span>
              RRR <span className="text-orange-400">{rrr}</span>
            </div>
          );
        })()}

        {/* ── Result ── */}
        {status === "completed" && resultText && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Trophy size={11} />
            {resultText}
          </div>
        )}

        {/* ── Date / venue meta ── */}
        {(dateStr || match.venue) && (
          <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-600 font-medium">
            {dateStr && (
              <span className="flex items-center gap-1">
                <Calendar size={9} /> {dateStr}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={9} /> {match.venue}
              </span>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2 flex-wrap">

          {/* Watch Live — public, visible for live/innings_break matches */}
          {showLiveLink && (status === "live" || status === "innings_break") && (
            <Link
              href={`/live/${match._id}`}
              target="_blank"
              className="
                flex-1 min-w-0 flex items-center justify-center gap-1.5
                px-3 py-2.5 rounded-xl
                bg-red-500/10 hover:bg-red-500/20
                text-red-400 hover:text-red-300
                border border-red-500/20 hover:border-red-500/35
                text-xs font-bold uppercase tracking-wide
                transition-all duration-200
                hover:shadow-md hover:shadow-red-900/20
              "
            >
              <Eye size={13} />
              Watch Live
            </Link>
          )}

          {/* Match Centre — scorecard / public view */}
          <Link
            href={`/matches/${match._id}`}
            className="
              flex-1 min-w-0 flex items-center justify-center gap-1.5
              px-3 py-2.5 rounded-xl
              bg-slate-800 hover:bg-slate-700
              text-slate-300 hover:text-white
              border border-slate-700 hover:border-slate-600
              text-xs font-bold uppercase tracking-wide
              transition-all duration-200
            "
          >
            Match Centre
          </Link>

          {/* Scorecard link for completed */}
          {status === "completed" && (
            <Link
              href={`/cricket/scorecard/${match._id}`}
              className="
                flex items-center justify-center gap-1.5
                px-3 py-2.5 rounded-xl
                bg-emerald-500/10 hover:bg-emerald-500/20
                text-emerald-400 hover:text-emerald-300
                border border-emerald-500/20 hover:border-emerald-500/35
                text-xs font-bold uppercase tracking-wide
                transition-all duration-200
              "
            >
              Scorecard
            </Link>
          )}

          {/* Admin Score Match — only shown if isAdmin prop */}
          {isAdmin && (
            <Link
              href={`/match/score/${match._id}`}
              className="
                flex items-center justify-center gap-1.5
                px-3 py-2.5 rounded-xl
                bg-violet-600/15 hover:bg-violet-600/30
                text-violet-400 hover:text-violet-300
                border border-violet-500/25 hover:border-violet-500/50
                text-xs font-black uppercase tracking-wide
                transition-all duration-200
                hover:shadow-md hover:shadow-violet-900/25
              "
              title="Admin: Open Scoring Panel"
            >
              <Crosshair size={13} />
              Score
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
