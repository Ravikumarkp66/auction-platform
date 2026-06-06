"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Users, Activity, BarChart2, Wifi,
  Shield, Plus, Search, X, CheckCircle2,
  Star, Crown, AlertCircle, XCircle, Trash2,
  Eye, Pencil, Hash, ChevronRight,
} from "lucide-react";
import { useTeams } from "@/hooks/useTeams";
import { usePlayers, ROLES, getRole, getBattingStyle, getBowlingStyle } from "@/hooks/usePlayers";
import { useTournaments } from "@/hooks/useTournaments";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const MAX_XI = 11;

const TABS = [
  { id: "overview", label: "Overview",    icon: Activity  },
  { id: "squad",    label: "Squad",       icon: Users     },
  { id: "matches",  label: "Matches",     icon: Wifi      },
  { id: "stats",    label: "Statistics",  icon: BarChart2 },
];

// ─────────────────────────────────────────────────────────────
// SHARED ATOMS
// ─────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-4 rounded-full bg-violet-500" />
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
          {sub && <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-xl font-black leading-none" style={{ color }}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">{label}</span>
    </div>
  );
}

function VioletBtn({ onClick, icon: Icon, label, size = "sm" }) {
  const sz = size === "lg" ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-xs";
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 ${sz} rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98]`}
      style={{ background: "linear-gradient(135deg,rgba(124,58,237,.85),rgba(99,102,241,.85))", border: "1px solid rgba(124,58,237,.40)", color: "#e9d5ff", boxShadow: "0 0 12px rgba(124,58,237,.2)" }}>
      {Icon && <Icon size={size === "lg" ? 14 : 12} />} {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────────────────────
function TeamAvatar({ team, size = "xl" }) {
  const sz = { xl: "w-20 h-20 text-2xl rounded-2xl", lg: "w-14 h-14 text-lg rounded-xl", md: "w-10 h-10 text-sm rounded-xl", sm: "w-8 h-8 text-xs rounded-lg" }[size] || "w-10 h-10";
  if (team?.logo) return <img src={team.logo} alt={team.name} className={`${sz} object-cover border border-white/[0.12] shrink-0`} />;
  return (
    <div className={`${sz} flex items-center justify-center font-black shrink-0 border border-white/[0.08]`}
      style={{ background: team?.color ? `${team.color}22` : "rgba(124,58,237,0.15)", color: team?.color || "#a78bfa" }}>
      {team?.shortName?.slice(0, 3) || team?.name?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}

function PlayerAvatar({ player, size = "md" }) {
  const role = getRole(player?.role);
  const sz   = { lg: "w-12 h-12 text-base rounded-xl", md: "w-9 h-9 text-xs rounded-xl", sm: "w-7 h-7 text-[9px] rounded-lg" }[size] || "w-9 h-9 text-xs rounded-xl";
  if (player?.photo) return <img src={player.photo} alt={player.name} className={`${sz} object-cover border border-white/[0.10] shrink-0`} />;
  return (
    <div className={`${sz} flex items-center justify-center font-black shrink-0 border border-white/[0.08] select-none`}
      style={{ background: role ? `${role.color}18` : "rgba(124,58,237,0.12)", color: role?.color || "#a78bfa" }}>
      {player?.name?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}

// Role badge
function RoleBadge({ roleId, size = "sm" }) {
  const role = getRole(roleId);
  if (!role) return null;
  const sz = size === "xs" ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]";
  return (
    <span className={`inline-flex items-center gap-0.5 ${sz} rounded font-black border`}
      style={{ color: role.color, borderColor: `${role.color}35`, background: `${role.color}12` }}>
      {role.icon} {role.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD TO SQUAD MODAL
// ─────────────────────────────────────────────────────────────
function AddToSquadModal({ team, squadIds, onConfirm, onClose }) {
  const { allPlayers, updatePlayer } = usePlayers();
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState(new Set());

  // Players not already in this team
  const available = allPlayers.filter(p =>
    p.teamId !== team.id &&
    (!search.trim() || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    selected.forEach(id => {
      updatePlayer(id, {
        teamId:       team.id,
        tournamentId: team.tournamentId || "",
      });
    });
    onConfirm();
    onClose();
  };

  useEffect(() => {
    const esc = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.10] overflow-hidden shadow-2xl"
        style={{ background: "rgba(11,16,40,0.98)", backdropFilter: "blur(24px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div>
            <h2 className="text-sm font-black text-white">Add Players to Squad</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {selected.size} selected · {available.length} available
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search players…"
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"><X size={12} /></button>}
          </div>
        </div>

        {/* Player list */}
        <div className="max-h-72 overflow-y-auto px-4 py-2 space-y-1">
          {available.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              {search ? "No players match your search" : "All registered players are already in a team. Add more players from the Players tab."}
            </div>
          ) : (
            available.map(p => {
              const role    = getRole(p.role);
              const checked = selected.has(p.id);
              return (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${checked ? "border-violet-500/40 bg-violet-500/10" : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "border-violet-500 bg-violet-500" : "border-slate-600"}`}>
                    {checked && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <PlayerAvatar player={p} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      {p.jerseyNumber && <span className="text-[9px] text-slate-500">#{p.jerseyNumber}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {role && <span className="text-[9px] font-bold" style={{ color: role.color }}>{role.icon} {role.label}</span>}
                      {getBattingStyle(p.battingStyle) && <span className="text-[9px] text-slate-600">{getBattingStyle(p.battingStyle)?.short}</span>}
                    </div>
                  </div>
                  {checked && <CheckCircle2 size={14} className="text-violet-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.07] flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs font-bold transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={selected.size === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${selected.size === 0 ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01]"}`}
            style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#ede9fe", boxShadow: selected.size > 0 ? "0 0 14px rgba(124,58,237,.3)" : "none" }}>
            <Plus size={13} /> Add {selected.size > 0 ? `${selected.size} Player${selected.size > 1 ? "s" : ""}` : "Players"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PLAYING XI PANEL (inline below squad list)
// ─────────────────────────────────────────────────────────────
function PlayingXIPanel({ squad, xi, onSave, teamColor }) {
  const [selected,   setSelected]   = useState(new Set(xi.players || []));
  const [captain,    setCaptain]    = useState(xi.captain    || "");
  const [keeper,     setKeeper]     = useState(xi.keeper     || "");
  const [errors,     setErrors]     = useState([]);
  const [saved,      setSaved]      = useState(false);

  const togglePlayer = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (captain    === id) setCaptain("");
        if (keeper     === id) setKeeper("");
      } else {
        if (next.size >= MAX_XI) return prev; // block if already 11
        next.add(id);
      }
      return next;
    });
    setSaved(false);
    setErrors([]);
  };

  const handleSave = () => {
    const errs = [];
    if (selected.size < 1)       errs.push("Select at least 1 player");
    if (selected.size > MAX_XI)  errs.push("Maximum 11 players in Playing XI");
    if (!captain)                errs.push("Select a captain");
    if (captain && !selected.has(captain))  errs.push("Captain must be in Playing XI");
    if (keeper  && !selected.has(keeper))   errs.push("Wicket keeper must be in Playing XI");
    if (errs.length) { setErrors(errs); return; }
    onSave({ players: [...selected], captain, keeper });
    setSaved(true);
    setErrors([]);
    setTimeout(() => setSaved(false), 2000);
  };

  const count = selected.size;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/15">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <Star size={13} className="text-amber-400" /> Playing XI
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
            {count} / {MAX_XI} selected
            {captain && <> · Captain: <span className="text-amber-400 font-bold">{squad.find(p => p.id === captain)?.name}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
            style={{ background: count === MAX_XI ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.12)", color: count === MAX_XI ? "#34d399" : "#a78bfa", border: `1px solid ${count === MAX_XI ? "rgba(16,185,129,0.25)" : "rgba(124,58,237,0.25)"}` }}>
            {count}/{MAX_XI}
          </div>
          <button onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${saved ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "hover:scale-[1.02]"}`}
            style={!saved ? { background: "linear-gradient(135deg,#7c3aed,#6366f1)", border: "1px solid rgba(124,58,237,.4)", color: "#e9d5ff" } : { border: "1px solid" }}>
            {saved ? <><CheckCircle2 size={12} /> Saved!</> : "Save XI"}
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="px-4 py-2 bg-red-500/[0.07] border-b border-red-500/15">
          {errors.map((e, i) => (
            <p key={i} className="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold">
              <AlertCircle size={10} /> {e}
            </p>
          ))}
        </div>
      )}

      {/* Player grid */}
      {squad.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-600 italic">Add players to squad first</p>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {squad.map(p => {
            const role      = getRole(p.role);
            const isIn      = selected.has(p.id);
            const isCap     = captain === p.id;
            const isKeeper  = keeper  === p.id;
            const canAdd    = !isIn && count < MAX_XI;

            return (
              <div key={p.id}
                className={`flex items-center gap-2.5 px-4 py-2.5 transition-all ${isIn ? "bg-white/[0.03]" : "opacity-50 hover:opacity-70"}`}>

                {/* Select toggle */}
                <button onClick={() => togglePlayer(p.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isIn ? "border-violet-500 bg-violet-500" : canAdd ? "border-slate-600 hover:border-violet-400" : "border-slate-700 cursor-not-allowed"}`}
                  disabled={!isIn && !canAdd}>
                  {isIn && <CheckCircle2 size={10} className="text-white" />}
                </button>

                <PlayerAvatar player={p} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-white truncate">{p.name}</span>
                    {p.jerseyNumber && <span className="text-[9px] text-slate-500">#{p.jerseyNumber}</span>}
                    {isCap    && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-amber-500/15 border border-amber-500/25 text-amber-400"><Crown size={7} />C</span>}
                    {isKeeper && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">🧤 WK</span>}
                  </div>
                  {role && <span className="text-[9px] font-bold" style={{ color: role.color }}>{role.icon} {role.label}</span>}
                </div>

                {/* Captain / Keeper buttons (only if selected in XI) */}
                {isIn && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setCaptain(isCap ? "" : p.id); setSaved(false); }}
                      title={isCap ? "Remove captain" : "Set as captain"}
                      className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[9px] font-black border transition-all ${isCap ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "border-white/[0.06] text-slate-500 hover:text-amber-400 hover:border-amber-500/30"}`}>
                      <Crown size={9} /> C
                    </button>
                    <button
                      onClick={() => { setKeeper(isKeeper ? "" : p.id); setSaved(false); }}
                      title={isKeeper ? "Remove keeper" : "Set as keeper"}
                      className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[9px] font-black border transition-all ${isKeeper ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-white/[0.06] text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30"}`}>
                      🧤 WK
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* XI summary strip */}
      {selected.size > 0 && (
        <div className="px-4 py-3 border-t border-violet-500/15 bg-violet-500/[0.04]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Selected XI</p>
          <div className="flex flex-wrap gap-1.5">
            {[...selected].map(id => {
              const p      = squad.find(x => x.id === id);
              const isCap  = captain === id;
              const isWK   = keeper  === id;
              if (!p) return null;
              return (
                <span key={id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border"
                  style={{ background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.25)", color: "#c4b5fd" }}>
                  {isCap && <Crown size={8} className="text-amber-400" />}
                  {isWK  && <span className="text-[8px]">🧤</span>}
                  {p.name.split(" ")[0]}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SQUAD TAB
// ─────────────────────────────────────────────────────────────
function SquadTab({ team, updateTeam }) {
  const { players: squadPlayers, updatePlayer, deletePlayer } = usePlayers({ teamId: team.id });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showXI,       setShowXI]       = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const xi = team.playingXI || { players: [], captain: "", keeper: "" };

  const handleRemoveFromSquad = (playerId) => {
    if (confirmDel === playerId) {
      updatePlayer(playerId, { teamId: "", tournamentId: "" });
      setConfirmDel(null);
    } else {
      setConfirmDel(playerId);
      setTimeout(() => setConfirmDel(null), 3000);
    }
  };

  const handleSaveXI = (data) => {
    updateTeam(team.id, { playingXI: data });
  };

  return (
    <div className="space-y-5">
      {/* Squad header */}
      <SectionHeader
        title="Squad"
        sub={`${squadPlayers.length} player${squadPlayers.length !== 1 ? "s" : ""} registered`}
        action={
          <div className="flex items-center gap-2">
            {squadPlayers.length > 0 && (
              <button onClick={() => setShowXI(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${showXI ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white"}`}>
                <Star size={10} className={showXI ? "text-amber-400" : ""} />
                {showXI ? "Hide XI" : "Select Playing XI"}
              </button>
            )}
            <VioletBtn onClick={() => setShowAddModal(true)} icon={Plus} label="Add to Squad" />
          </div>
        }
      />

      {/* Squad counts */}
      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={10} />
          Squad: <span className="text-white font-black ml-0.5">{squadPlayers.length}</span>
        </span>
        <span className="text-slate-700">·</span>
        <span className="flex items-center gap-1">
          <Star size={10} className="text-amber-400" />
          Playing XI: <span className="text-white font-black ml-0.5">{xi.players?.length || 0}</span>
        </span>
        {xi.captain && (
          <>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Crown size={10} /> {squadPlayers.find(p => p.id === xi.captain)?.name || "—"}
            </span>
          </>
        )}
      </div>

      {/* Playing XI panel */}
      {showXI && squadPlayers.length > 0 && (
        <PlayingXIPanel squad={squadPlayers} xi={xi} onSave={handleSaveXI} teamColor={team.color} />
      )}

      {/* Squad list */}
      {squadPlayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
          <span className="text-3xl mb-1">🧑‍🤝‍🧑</span>
          <p className="text-sm font-bold text-slate-400">No players in squad yet</p>
          <p className="text-xs text-slate-600 text-center max-w-xs">Add players from your registered player pool to build this team's squad.</p>
          <VioletBtn onClick={() => setShowAddModal(true)} icon={Plus} label="Add First Player" size="lg" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          {/* Table header */}
          <div className="grid px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06] text-[10px] font-black uppercase tracking-wider text-slate-500"
            style={{ gridTemplateColumns: "36px 2fr 1fr 80px 80px 80px auto" }}>
            <span>#</span><span>Player</span><span>Role</span>
            <span className="hidden sm:block">Bat</span>
            <span className="hidden sm:block">Bowl</span>
            <span className="hidden md:block">XI</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {squadPlayers.map((p, i) => {
              const role   = getRole(p.role);
              const batSt  = getBattingStyle(p.battingStyle);
              const bowSt  = getBowlingStyle(p.bowlingStyle);
              const inXI   = xi.players?.includes(p.id);
              const isCap  = xi.captain  === p.id;
              const isWK   = xi.keeper   === p.id;
              const isDel  = confirmDel  === p.id;

              return (
                <div key={p.id}
                  className={`grid px-4 py-2.5 items-center hover:bg-white/[0.02] transition-colors ${inXI ? "bg-violet-500/[0.03]" : ""}`}
                  style={{ gridTemplateColumns: "36px 2fr 1fr 80px 80px 80px auto" }}>

                  {/* # */}
                  <span className="text-[10px] font-bold text-slate-600">{i + 1}</span>

                  {/* Player */}
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar player={p} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white truncate">{p.name}</span>
                        {p.jerseyNumber && <span className="text-[9px] text-slate-600">#{p.jerseyNumber}</span>}
                        {isCap && <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-amber-500/15 border border-amber-500/25 text-amber-400"><Crown size={7} />C</span>}
                        {isWK  && <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">🧤WK</span>}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div><RoleBadge roleId={p.role} size="xs" /></div>

                  {/* Bat */}
                  <span className="hidden sm:block text-[10px] text-slate-500 font-semibold">{batSt?.short || "—"}</span>

                  {/* Bowl */}
                  <span className="hidden sm:block text-[10px] text-slate-500 font-semibold">{bowSt?.short || "—"}</span>

                  {/* XI status */}
                  <div className="hidden md:block">
                    {inXI
                      ? <span className="text-[9px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">XI</span>
                      : <span className="text-[9px] text-slate-600">—</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link href={`/cricket/players/${p.id}`}
                      className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all">
                      <Eye size={11} />
                    </Link>
                    <button onClick={() => handleRemoveFromSquad(p.id)}
                      className={`flex items-center gap-0.5 p-1 rounded-lg text-[9px] font-bold transition-all ${isDel ? "text-red-300 bg-red-500/15 animate-pulse" : "text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08]"}`}
                      title={isDel ? "Click again to confirm" : "Remove from squad"}>
                      {isDel ? <XCircle size={11} /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-600 bg-white/[0.01]">
            <span>{squadPlayers.length} squad members</span>
            <span className="flex items-center gap-1">
              {xi.players?.length || 0} selected for XI
            </span>
          </div>
        </div>
      )}

      {/* Add to squad modal */}
      {showAddModal && (
        <AddToSquadModal
          team={team}
          squadIds={squadPlayers.map(p => p.id)}
          onConfirm={() => {}}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────
function OverviewTab({ team, tournament }) {
  const { players } = usePlayers({ teamId: team.id });
  const xi = team.playingXI || {};

  return (
    <div className="space-y-6">
      {/* Stat pills */}
      <div>
        <SectionHeader title="Team Summary" sub="Placeholder stats — updates as matches are scored" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {[
            { label: "Matches",  value: "0",        color: "#a78bfa" },
            { label: "Wins",     value: "0",        color: "#34d399" },
            { label: "Losses",   value: "0",        color: "#f87171" },
            { label: "Runs For", value: "0",        color: "#fbbf24" },
            { label: "Wkts For", value: "0",        color: "#60a5fa" },
            { label: "NRR",      value: "+0.000",   color: "#34d399" },
          ].map(s => <StatPill key={s.label} {...s} />)}
        </div>
      </div>

      {/* Team details */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <SectionHeader title="Team Details" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Full Name",    value: team.name },
            { label: "Short Name",   value: team.shortName },
            { label: "Captain",      value: team.captain || "—" },
            { label: "Tournament",   value: tournament?.name || "—" },
            { label: "Season",       value: tournament?.season || "—" },
            { label: "Squad Size",   value: `${players.length} players` },
            { label: "Playing XI",   value: `${xi.players?.length || 0} / ${MAX_XI} selected` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
              <span className="text-sm font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color */}
      {team.color && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="w-8 h-8 rounded-lg border border-white/[0.1]" style={{ background: team.color }} />
          <div>
            <p className="text-xs font-black text-white">Team Color</p>
            <p className="text-[10px] text-slate-500 font-mono">{team.color}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MATCHES TAB
// ─────────────────────────────────────────────────────────────
function MatchesTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Match History" sub="All matches played by this team" />
      <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
        <span className="text-3xl mb-1">🏏</span>
        <p className="text-sm font-bold text-slate-400">No matches played yet</p>
        <p className="text-xs text-slate-600 text-center max-w-xs">Matches will appear here once they are created and scored for this team.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATISTICS TAB
// ─────────────────────────────────────────────────────────────
function PlaceholderRows({ cols, rows = 4, label }) {
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
      <div className="py-3 text-center text-[10px] text-slate-600 italic border-t border-white/[0.04]">{label}</div>
    </div>
  );
}

function StatsTab({ team }) {
  const { players } = usePlayers({ teamId: team.id });

  return (
    <div className="space-y-6">
      {/* Team totals */}
      <div>
        <SectionHeader title="Team Statistics" sub="Aggregate performance across all matches" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Total Runs",     value: "0",   color: "#fbbf24" },
            { label: "Total Wickets",  value: "0",   color: "#60a5fa" },
            { label: "Highest Score",  value: "0/0", color: "#a78bfa" },
            { label: "Lowest Score",   value: "—",   color: "#f87171" },
          ].map(s => <StatPill key={s.label} {...s} />)}
        </div>
      </div>

      {/* Top batters */}
      <div>
        <SectionHeader title="Top Batters" sub="Team batting performance" />
        <PlaceholderRows
          cols={[
            { k: "rank", l: "#",     w: "36px" }, { k: "name", l: "Player", w: "2fr"  },
            { k: "runs", l: "Runs",  w: "60px" }, { k: "avg",  l: "Avg",   w: "50px" },
            { k: "sr",   l: "SR",    w: "50px" }, { k: "hs",   l: "HS",    w: "44px" },
          ]}
          rows={players.length > 0 ? Math.min(players.length, 5) : 4}
          label="Play matches to generate batting stats"
        />
      </div>

      {/* Top bowlers */}
      <div>
        <SectionHeader title="Top Bowlers" sub="Team bowling performance" />
        <PlaceholderRows
          cols={[
            { k: "rank", l: "#",    w: "36px" }, { k: "name", l: "Player", w: "2fr"  },
            { k: "wkts", l: "Wkts", w: "55px" }, { k: "avg",  l: "Avg",   w: "50px" },
            { k: "eco",  l: "Eco",  w: "50px" }, { k: "best", l: "Best",  w: "50px" },
          ]}
          rows={players.length > 0 ? Math.min(players.length, 4) : 4}
          label="Play matches to generate bowling stats"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CricketTeamDetailPage() {
  const { teamId }                        = useParams();
  const { teams, updateTeam }             = useTeams();
  const { tournaments }                   = useTournaments();
  const [activeTab, setActiveTab]         = useState("overview");
  const [team,      setTeam]              = useState(null);
  const [tournament, setTournament]       = useState(null);
  const [ready,     setReady]             = useState(false);

  useEffect(() => {
    setReady(true);
    const found = teams.find(t => t.id === teamId);
    setTeam(found || null);
    if (found?.tournamentId) setTournament(tournaments.find(t => t.id === found.tournamentId) || null);
  }, [teams, teamId, tournaments]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

  if (!team) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">🛡️</div>
      <h2 className="text-xl font-black text-white">Team not found</h2>
      <p className="text-sm text-slate-500">This team may have been deleted.</p>
      <Link href="/matches?tab=tournaments"
        className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-all">
        <ChevronLeft size={14} /> Back to Cricket Hub
      </Link>
    </div>
  );

  const { players: squadPlayers } = usePlayers; // just for count badge
  const xi = team.playingXI || {};

  return (
    <div className="min-h-screen text-white pb-24">

      {/* Hero */}
      <div className="border-b border-white/[0.06]"
        style={{ background: team.color ? `linear-gradient(180deg,${team.color}12 0%,transparent 100%)` : "linear-gradient(180deg,rgba(124,58,237,0.07) 0%,transparent 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-5 flex-wrap">
            {tournament && (
              <>
                <Link href="/matches?tab=tournaments" className="hover:text-slate-300 transition-colors">Tournaments</Link>
                <ChevronLeft size={10} className="rotate-180" />
                <Link href={`/cricket/tournaments/${tournament.id}`} className="hover:text-slate-300 transition-colors">{tournament.name}</Link>
                <ChevronLeft size={10} className="rotate-180" />
              </>
            )}
            <span className="text-slate-400">{team.name}</span>
          </div>

          {/* Team header */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ background: team.color || "#7c3aed" }} />
              <TeamAvatar team={team} size="xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest border"
                  style={{ color: team.color || "#a78bfa", borderColor: `${team.color || "#7c3aed"}33`, background: `${team.color || "#7c3aed"}15` }}>
                  {team.shortName}
                </span>
                {tournament && <span className="text-[10px] text-slate-500 font-medium">{tournament.name} · {tournament.season}</span>}
                {xi.players?.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                    <Star size={9} /> XI Selected ({xi.players.length})
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{team.name}</h1>
              {team.captain && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                  <Shield size={11} className="text-violet-400" />
                  Captain: <span className="text-white font-bold">{team.captain}</span>
                </p>
              )}
            </div>
          </div>

          {/* Sub-nav with count badges */}
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "overview" && <OverviewTab team={team} tournament={tournament} />}
        {activeTab === "squad"    && <SquadTab    team={team} updateTeam={updateTeam} />}
        {activeTab === "matches"  && <MatchesTab />}
        {activeTab === "stats"    && <StatsTab    team={team} />}
      </div>
    </div>
  );
}
