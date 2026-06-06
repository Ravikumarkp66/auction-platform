"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Activity, BarChart2, MessageSquare,
  Users, Shield, Wifi, Info, Trophy,
  Clock, MapPin, Calendar, Hash,
} from "lucide-react";
import { useMatches, getMatchType } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { useTournaments, BALL_TYPES } from "@/hooks/useTournaments";
import { usePlayers } from "@/hooks/usePlayers";

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: "info",       label: "Match Info",  icon: Info        },
  { id: "toss",       label: "Toss",        icon: Activity    },
  { id: "xi",         label: "Playing XI",  icon: Users       },
  { id: "scorecard",  label: "Scorecard",   icon: BarChart2   },
  { id: "commentary", label: "Commentary",  icon: MessageSquare },
];

// ─── Status helpers ───────────────────────────────────────────
function statusMeta(s) {
  return ({
    live:      { label: "Live",      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: true  },
    upcoming:  { label: "Upcoming",  cls: "text-sky-400     bg-sky-500/10     border-sky-500/25",     dot: false },
    completed: { label: "Completed", cls: "text-slate-400   bg-slate-700/30   border-slate-600/25",   dot: false },
  }[s] || { label: "Upcoming", cls: "text-sky-400 bg-sky-500/10 border-sky-500/25", dot: false });
}

// ─── Helpers ──────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-0.5 h-4 rounded-full bg-violet-500" />
      <div>
        <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
        {sub && <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            {Icon && <Icon size={9} />} {label}
          </span>
          <span className="text-sm font-bold text-white">{value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini team card ───────────────────────────────────────────
function TeamCard({ teamData, label, align = "left" }) {
  if (!teamData) return null;
  const isRight = align === "right";
  return (
    <div className={`flex flex-col items-${isRight ? "end" : "start"} gap-2 flex-1`}>
      <span className={`text-[9px] font-black uppercase tracking-widest text-slate-600`}>{label}</span>
      <div className={`flex items-center gap-2.5 ${isRight ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 border border-white/[0.08]"
          style={{ background: teamData.color ? `${teamData.color}20` : "rgba(124,58,237,0.15)", color: teamData.color || "#a78bfa" }}>
          {teamData.logo
            ? <img src={teamData.logo} alt={teamData.name} className="w-full h-full object-cover rounded-xl" />
            : teamData.shortName?.slice(0, 3)}
        </div>
        <div className={isRight ? "text-right" : ""}>
          <p className="text-sm font-black text-white">{teamData.name}</p>
          <p className="text-[10px] text-slate-500 font-semibold">{teamData.shortName}</p>
        </div>
      </div>
    </div>
  );
}

// ─── MATCH INFO TAB ───────────────────────────────────────────
function MatchInfoTab({ match, tournament }) {
  const mt     = getMatchType(match.matchType);
  const ball   = BALL_TYPES?.find?.(b => b.id === match.ballType);
  const sm     = statusMeta(match.status || "upcoming");

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const formatTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const ampm = +h >= 12 ? "PM" : "AM";
    return `${+h % 12 || 12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* VS card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-4">
          <TeamCard teamData={match.teamA} label="Team A" align="left" />
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">VS</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${sm.cls}`}>
              {sm.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {sm.label}
            </span>
            {match.overs && <span className="text-[10px] font-bold text-slate-400">{match.overs} Overs</span>}
          </div>
          <TeamCard teamData={match.teamB} label="Team B" align="right" />
        </div>
      </div>

      {/* Match details card */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <SectionHeader title="Match Details" />
        <InfoGrid items={[
          { label: "Match Type",  value: mt ? `${mt.icon} ${mt.label}` : "—"    },
          { label: "Overs",       value: match.overs ? `${match.overs} overs` : "—" },
          { label: "Ball Type",   value: ball ? `${ball.icon} ${ball.label}` : match.ballType || "—" },
          { label: "Date",        value: formatDate(match.date),   icon: Calendar },
          { label: "Time",        value: formatTime(match.time),   icon: Clock    },
          { label: "Venue",       value: match.venue || "TBD",     icon: MapPin   },
          { label: "Tournament",  value: tournament?.name || "—"                  },
          { label: "Season",      value: tournament?.season || "—"                },
          { label: "Status",      value: sm.label                                 },
        ]} />
      </div>
    </div>
  );
}

// ─── TOSS TAB ────────────────────────────────────────────────
function TossTab({ match }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Toss" sub="Toss result and batting/fielding decision" />
      <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
        <span className="text-4xl">🪙</span>
        <p className="text-sm font-bold text-slate-400">Toss not done yet</p>
        <p className="text-xs text-slate-600 text-center max-w-xs">Toss result will be recorded here when the match starts.</p>
        {match.status === "upcoming" && (
          <button className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#ede9fe", boxShadow: "0 0 16px rgba(124,58,237,.25)" }}>
            🪙 Record Toss
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PLAYING XI TAB ──────────────────────────────────────────
function PlayingXITab({ match }) {
  const { allTeams }   = useTeams();
  const { allPlayers } = usePlayers();

  const teamA  = allTeams.find(t => t.id === match.teamA?.id);
  const teamB  = allTeams.find(t => t.id === match.teamB?.id);
  const xiA    = teamA?.playingXI?.players || [];
  const xiB    = teamB?.playingXI?.players || [];

  const getXIPlayers = (ids) => ids.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);

  function XIColumn({ team, players, label }) {
    return (
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg text-[10px] flex items-center justify-center font-black border border-white/[0.08]"
            style={{ background: team?.color ? `${team.color}20` : "rgba(124,58,237,0.15)", color: team?.color || "#a78bfa" }}>
            {team?.shortName?.slice(0,2) || "??"}
          </div>
          <span className="text-xs font-black text-white">{team?.name || label}</span>
          <span className="ml-auto text-[10px] text-slate-500">{players.length}/11</span>
        </div>
        {players.length === 0 ? (
          <p className="text-[11px] text-slate-600 italic text-center py-6">Playing XI not selected</p>
        ) : (
          <div className="space-y-1">
            {players.map((p, i) => {
              const isCap = teamA?.playingXI?.captain === p.id || teamB?.playingXI?.captain === p.id;
              const isWK  = teamA?.playingXI?.keeper  === p.id || teamB?.playingXI?.keeper  === p.id;
              return (
                <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <span className="text-[10px] text-slate-600 w-4 shrink-0">{i + 1}</span>
                  <span className="text-xs font-bold text-white flex-1 truncate">{p.name}</span>
                  {p.jerseyNumber && <span className="text-[9px] text-slate-600">#{p.jerseyNumber}</span>}
                  {isCap && <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1 rounded">C</span>}
                  {isWK  && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1 rounded">WK</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Playing XI" sub="Both teams' confirmed lineups" />
      <div className="flex flex-col sm:flex-row gap-4">
        <XIColumn team={teamA} players={getXIPlayers(xiA)} label="Team A" />
        <div className="hidden sm:block w-px bg-white/[0.06]" />
        <XIColumn team={teamB} players={getXIPlayers(xiB)} label="Team B" />
      </div>
    </div>
  );
}

// ─── SCORECARD TAB ───────────────────────────────────────────
function ScorecardTab({ match }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Scorecard" sub="Ball-by-ball match scorecard" />
      {["Team A Innings", "Team B Innings"].map(label => (
        <div key={label}>
          <p className="text-xs font-black text-slate-400 mb-2">{label}</p>
          <div className="rounded-xl border border-white/[0.07] overflow-hidden">
            <div className="grid px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06] text-[10px] font-black uppercase tracking-wider text-slate-500"
              style={{ gridTemplateColumns: "2fr 44px 44px 50px 50px 44px" }}>
              <span>Batter</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid px-4 py-3 border-b border-white/[0.03]"
                style={{ gridTemplateColumns: "2fr 44px 44px 50px 50px 44px" }}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-3 rounded-full animate-pulse bg-slate-800/50"
                    style={{ width: j === 0 ? "70%" : "60%", animationDelay: `${i * 80 + j * 30}ms` }} />
                ))}
              </div>
            ))}
            <div className="px-4 py-2.5 text-[10px] text-slate-600 italic text-center border-t border-white/[0.04]">
              Score this match to populate scorecard
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── COMMENTARY TAB ──────────────────────────────────────────
function CommentaryTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Commentary" sub="Live ball-by-ball commentary" />
      <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
        <span className="text-3xl mb-1">📝</span>
        <p className="text-sm font-bold text-slate-400">No commentary yet</p>
        <p className="text-xs text-slate-600 text-center max-w-xs">Commentary will appear live as the match is being scored.</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function CricketMatchDetailPage() {
  const { matchId }              = useParams();
  const { allMatches }           = useMatches();
  const { allTeams }             = useTeams();
  const { tournaments }          = useTournaments();
  const [activeTab, setActiveTab] = useState("info");
  const [match,     setMatch]     = useState(null);
  const [tournament, setTournament] = useState(null);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    setReady(true);
    const m = allMatches.find(x => x.id === matchId);
    setMatch(m || null);
    if (m?.tournamentId) setTournament(tournaments.find(t => t.id === m.tournamentId) || null);
  }, [allMatches, matchId, tournaments]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

  if (!match) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">🏏</div>
      <h2 className="text-xl font-black text-white">Match not found</h2>
      <p className="text-sm text-slate-500">This match may have been deleted.</p>
      <Link href="/matches" className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-all">
        <ChevronLeft size={14} /> Back to Cricket Hub
      </Link>
    </div>
  );

  const mt  = getMatchType(match.matchType);
  const sm  = statusMeta(match.status || "upcoming");
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    return `${+h % 12 || 12}:${m} ${+h >= 12 ? "PM" : "AM"}`;
  };

  return (
    <div className="min-h-screen text-white pb-24">

      {/* Hero */}
      <div className="border-b border-white/[0.06]"
        style={{ background: "linear-gradient(180deg,rgba(124,58,237,0.07) 0%,transparent 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-5 flex-wrap">
            {tournament && (
              <>
                <Link href="/matches?tab=tournaments" className="hover:text-slate-300 transition-colors">Tournaments</Link>
                <ChevronLeft size={10} className="rotate-180" />
                <Link href={`/cricket/tournaments/${tournament.id}?tab=matches`} className="hover:text-slate-300 transition-colors">{tournament.name}</Link>
                <ChevronLeft size={10} className="rotate-180" />
              </>
            )}
            <span className="text-slate-400">Match</span>
          </div>

          {/* Match header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${sm.cls}`}>
                {sm.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                {sm.label}
              </span>
              {mt && <span className="text-[10px] font-semibold text-slate-500">{mt.icon} {mt.label}</span>}
              {match.overs && <span className="text-[10px] text-slate-600">{match.overs} Overs</span>}
              {match.date && <span className="flex items-center gap-1 text-[10px] text-slate-600"><Calendar size={9} />{formatDate(match.date)}{match.time && ` · ${formatTime(match.time)}`}</span>}
              {match.venue && <span className="flex items-center gap-1 text-[10px] text-slate-600"><MapPin size={9} />{match.venue}</span>}
            </div>

            {/* VS */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xl font-black text-white truncate">{match.teamA?.name}</p>
                <p className="text-xs text-slate-500">{match.teamA?.shortName}</p>
              </div>
              <span className="text-slate-600 font-black text-lg shrink-0">VS</span>
              <div className="flex-1 text-right">
                <p className="text-xl font-black text-white truncate">{match.teamB?.name}</p>
                <p className="text-xs text-slate-500">{match.teamB?.shortName}</p>
              </div>
            </div>
          </div>

          {/* Sub-nav */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-all duration-150 ${isActive ? "text-white border-violet-500" : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700"}`}>
                  <Icon size={11} className={isActive ? "text-violet-400" : ""} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "info"       && <MatchInfoTab   match={match} tournament={tournament} />}
        {activeTab === "toss"       && <TossTab        match={match} />}
        {activeTab === "xi"         && <PlayingXITab   match={match} />}
        {activeTab === "scorecard"  && <ScorecardTab   match={match} />}
        {activeTab === "commentary" && <CommentaryTab />}
      </div>
    </div>
  );
}
