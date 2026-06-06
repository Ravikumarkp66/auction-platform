"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Activity, BarChart2, Wifi,
  Shield, Hash, User,
} from "lucide-react";
import { usePlayers, getRole, getBattingStyle, getBowlingStyle } from "@/hooks/usePlayers";
import { useTeams } from "@/hooks/useTeams";
import { useTournaments } from "@/hooks/useTournaments";

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: "profile",  label: "Profile",       icon: User     },
  { id: "batting",  label: "Batting Stats", icon: Activity },
  { id: "bowling",  label: "Bowling Stats", icon: BarChart2},
  { id: "matches",  label: "Matches",       icon: Wifi     },
];

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

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-bold text-white">{value || "—"}</span>
    </div>
  );
}

function StatBox({ label, value, color = "#a78bfa" }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <span className="text-2xl font-black leading-none" style={{ color }}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">{label}</span>
    </div>
  );
}

function PlaceholderTable({ cols, rows = 5, label }) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      <div className="grid px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]"
        style={{ gridTemplateColumns: cols.map(c => c.w).join(" ") }}>
        {cols.map(c => <span key={c.k} className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.l}</span>)}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid px-4 py-3 border-b border-white/[0.03]"
          style={{ gridTemplateColumns: cols.map(c => c.w).join(" ") }}>
          {cols.map((c, j) => (
            <div key={c.k} className="h-3 rounded-full animate-pulse bg-slate-800/50"
              style={{ width: j === 0 ? "20px" : j === 1 ? "65%" : "45%", animationDelay: `${i * 70 + j * 25}ms` }} />
          ))}
        </div>
      ))}
      <div className="py-3 text-center text-[10px] text-slate-600 italic">{label}</div>
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────
function RoleBadge({ roleId }) {
  const role = getRole(roleId);
  if (!role) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border"
      style={{ color: role.color, borderColor: `${role.color}40`, background: `${role.color}15` }}>
      {role.icon} {role.label}
    </span>
  );
}

// ─── Player avatar ────────────────────────────────────────────
function PlayerAvatar({ player, size = "xl" }) {
  const sz = { xl: "w-24 h-24 text-3xl rounded-2xl", lg: "w-14 h-14 text-lg rounded-xl", md: "w-10 h-10 text-sm rounded-xl", sm: "w-8 h-8 text-xs rounded-lg" }[size] || "w-10 h-10 text-sm rounded-xl";
  const role = getRole(player?.role);
  if (player?.photo) {
    return <img src={player.photo} alt={player.name} className={`${sz} object-cover border border-white/[0.12] shrink-0`} />;
  }
  return (
    <div className={`${sz} flex items-center justify-center font-black shrink-0 border border-white/[0.08] select-none`}
      style={{ background: role ? `${role.color}18` : "rgba(124,58,237,0.12)", color: role?.color || "#a78bfa" }}>
      {player?.name?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────
function ProfileTab({ player, team, tournament }) {
  const role   = getRole(player.role);
  const batSt  = getBattingStyle(player.battingStyle);
  const bowSt  = getBowlingStyle(player.bowlingStyle);

  return (
    <div className="space-y-6">
      {/* Quick info grid */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <SectionHeader title="Player Info" sub="Registration details" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Full Name"     value={player.name} />
          <InfoRow label="Jersey No."   value={player.jerseyNumber ? `#${player.jerseyNumber}` : "—"} />
          <InfoRow label="Age"          value={player.age ? `${player.age} yrs` : "—"} />
          <InfoRow label="Role"         value={role ? `${role.icon} ${role.label}` : "—"} />
          <InfoRow label="Batting"      value={batSt?.label || "—"} />
          <InfoRow label="Bowling"      value={bowSt?.label || "—"} />
          {team && <InfoRow label="Team"       value={team.name} />}
          {tournament && <InfoRow label="Tournament" value={`${tournament.name} · ${tournament.season}`} />}
        </div>
      </div>

      {/* Style pills */}
      <div className="flex flex-wrap gap-2">
        {role && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border"
            style={{ color: role.color, borderColor: `${role.color}35`, background: `${role.color}12` }}>
            {role.icon} {role.label}
          </span>
        )}
        {batSt && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/20 bg-amber-500/8 text-amber-400">
            🏏 {batSt.label}
          </span>
        )}
        {bowSt && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/20 bg-blue-500/8 text-blue-400">
            ⚡ {bowSt.label}
          </span>
        )}
        {team && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/[0.08] bg-white/[0.04] text-slate-300">
            🛡️ {team.name}
            {team.shortName && <span className="text-[9px] text-slate-500">({team.shortName})</span>}
          </span>
        )}
      </div>

      {/* Career summary placeholder */}
      <div>
        <SectionHeader title="Career Summary" sub="Totals across all tournaments" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Matches",   value: "0",     color: "#a78bfa" },
            { label: "Runs",      value: "0",     color: "#f59e0b" },
            { label: "Wickets",   value: "0",     color: "#3b82f6" },
            { label: "Avg",       value: "—",     color: "#10b981" },
            { label: "SR",        value: "—",     color: "#f59e0b" },
            { label: "Eco",       value: "—",     color: "#3b82f6" },
          ].map(s => <StatBox key={s.label} {...s} />)}
        </div>
      </div>
    </div>
  );
}

function BattingTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Batting Statistics" sub="Cumulative batting performance" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "Innings",   value: "0", color: "#a78bfa" },
          { label: "Runs",      value: "0", color: "#f59e0b" },
          { label: "Average",   value: "—", color: "#10b981" },
          { label: "Strike Rate",value: "—", color: "#60a5fa" },
        ].map(s => <StatBox key={s.label} {...s} />)}
      </div>
      <PlaceholderTable
        cols={[
          { k: "tournament", l: "Tournament", w: "2fr"  },
          { k: "mat",        l: "Mat",        w: "44px" },
          { k: "runs",       l: "Runs",       w: "56px" },
          { k: "avg",        l: "Avg",        w: "50px" },
          { k: "sr",         l: "SR",         w: "50px" },
          { k: "hs",         l: "HS",         w: "44px" },
          { k: "50s",        l: "50s",        w: "44px" },
          { k: "100s",       l: "100s",       w: "44px" },
        ]}
        rows={4}
        label="Play matches to generate batting statistics"
      />
    </div>
  );
}

function BowlingTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Bowling Statistics" sub="Cumulative bowling performance" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "Wickets", value: "0", color: "#3b82f6" },
          { label: "Average", value: "—", color: "#f59e0b" },
          { label: "Economy", value: "—", color: "#10b981" },
          { label: "Best",    value: "—", color: "#a78bfa" },
        ].map(s => <StatBox key={s.label} {...s} />)}
      </div>
      <PlaceholderTable
        cols={[
          { k: "tournament", l: "Tournament", w: "2fr"  },
          { k: "mat",        l: "Mat",        w: "44px" },
          { k: "wkts",       l: "Wkts",       w: "52px" },
          { k: "avg",        l: "Avg",        w: "50px" },
          { k: "eco",        l: "Eco",        w: "50px" },
          { k: "best",       l: "Best",       w: "50px" },
          { k: "5w",         l: "5W",         w: "44px" },
        ]}
        rows={4}
        label="Play matches to generate bowling statistics"
      />
    </div>
  );
}

function MatchesTab({ player }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Recent Matches" sub="Match-by-match performance history" />
      <div className="flex flex-col items-center justify-center py-14 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
        <span className="text-3xl mb-1">📋</span>
        <p className="text-sm font-bold text-slate-400">No matches played yet</p>
        <p className="text-xs text-slate-600 text-center max-w-xs">Match history will appear here once matches are scored.</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function CricketPlayerProfilePage() {
  const { playerId }              = useParams();
  const { allPlayers, getPlayer } = usePlayers();
  const { allTeams }              = useTeams();
  const { tournaments }           = useTournaments();

  const [activeTab,   setActiveTab]   = useState("profile");
  const [player,      setPlayer]      = useState(null);
  const [team,        setTeam]        = useState(null);
  const [tournament,  setTournament]  = useState(null);
  const [ready,       setReady]       = useState(false);

  useEffect(() => {
    setReady(true);
    const p = allPlayers.find(x => x.id === playerId);
    setPlayer(p || null);
    if (p?.teamId)        setTeam(allTeams.find(t => t.id === p.teamId) || null);
    if (p?.tournamentId)  setTournament(tournaments.find(t => t.id === p.tournamentId) || null);
  }, [allPlayers, allTeams, tournaments, playerId]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!player) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">🏏</div>
      <h2 className="text-xl font-black text-white">Player not found</h2>
      <p className="text-sm text-slate-500">This player may have been deleted.</p>
      <Link href="/matches?tab=players"
        className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-all">
        <ChevronLeft size={14} /> Back to Players
      </Link>
    </div>
  );

  const role = getRole(player.role);

  return (
    <div className="min-h-screen text-white pb-24">

      {/* Hero */}
      <div className="border-b border-white/[0.06]"
        style={{ background: role ? `linear-gradient(180deg,${role.color}10 0%,transparent 100%)` : "linear-gradient(180deg,rgba(124,58,237,0.07) 0%,transparent 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-5 flex-wrap">
            <Link href="/matches?tab=players" className="hover:text-slate-300 transition-colors">Players</Link>
            {team && (
              <>
                <ChevronLeft size={10} className="rotate-180" />
                <Link href={`/cricket/teams/${team.id}`} className="hover:text-slate-300 transition-colors">{team.name}</Link>
              </>
            )}
            <ChevronLeft size={10} className="rotate-180" />
            <span className="text-slate-400">{player.name}</span>
          </div>

          {/* Player header */}
          <div className="flex items-center gap-5 mb-6">
            {/* Avatar with glow */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                style={{ background: role?.color || "#7c3aed" }} />
              <PlayerAvatar player={player} size="xl" />
              {player.jerseyNumber && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black bg-slate-900 border border-white/[0.12]"
                  style={{ color: role?.color || "#a78bfa" }}>
                  #{player.jerseyNumber}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {role && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border"
                    style={{ color: role.color, borderColor: `${role.color}40`, background: `${role.color}15` }}>
                    {role.icon} {role.label}
                  </span>
                )}
                {team && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    🛡️ {team.name}
                    {team.shortName && ` (${team.shortName})`}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{player.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-[10px] text-slate-500 font-medium">
                {player.jerseyNumber && <span className="flex items-center gap-1"><Hash size={9} /> #{player.jerseyNumber}</span>}
                {player.age         && <span>{player.age} yrs</span>}
                {getBattingStyle(player.battingStyle) && <span>🏏 {getBattingStyle(player.battingStyle)?.short}</span>}
                {getBowlingStyle(player.bowlingStyle) && <span>⚡ {getBowlingStyle(player.bowlingStyle)?.short}</span>}
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
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-all ${isActive ? "text-white border-violet-500" : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700"}`}>
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
        {activeTab === "profile" && <ProfileTab player={player} team={team} tournament={tournament} />}
        {activeTab === "batting" && <BattingTab />}
        {activeTab === "bowling" && <BowlingTab />}
        {activeTab === "matches" && <MatchesTab player={player} />}
      </div>
    </div>
  );
}
