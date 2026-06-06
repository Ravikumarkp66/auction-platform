"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy, Users, Calendar, Activity, Wifi,
  ChevronLeft, Plus, Pencil, BarChart2,
  TableProperties, X, Upload, CheckCircle2,
  AlertCircle, Loader2, Trash2, XCircle, Eye,
  Shield, TrendingUp,
} from "lucide-react";
import { useTournaments, FORMATS, BALL_TYPES, getTournamentStatus } from "@/hooks/useTournaments";
import { useTeams } from "@/hooks/useTeams";
import { useMatches, MATCH_TYPES, OVERS_PRESETS, getMatchType } from "@/hooks/useMatches";

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────
function statusMeta(s) {
  return ({
    ongoing:   { label: "Ongoing",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: true  },
    upcoming:  { label: "Upcoming",  cls: "text-sky-400     bg-sky-500/10     border-sky-500/25",     dot: false },
    completed: { label: "Completed", cls: "text-slate-400   bg-slate-700/30   border-slate-600/25",   dot: false },
  }[s] || { label: "Upcoming", cls: "text-sky-400 bg-sky-500/10 border-sky-500/25", dot: false });
}
const fmtMeta  = (id) => FORMATS.find(f => f.id === id);
const ballMeta = (id) => BALL_TYPES.find(b => b.id === id);
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────
// REUSABLE UI
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview",     icon: Activity        },
  { id: "matches",  label: "Matches",      icon: Wifi            },
  { id: "teams",    label: "Teams",        icon: Users           },
  { id: "points",   label: "Points Table", icon: TableProperties },
  { id: "stats",    label: "Stats",        icon: BarChart2       },
];

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

function EmptySection({ icon, label, sub, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015]">
      <span className="text-3xl mb-1">{icon}</span>
      <p className="text-sm font-bold text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-600 text-center max-w-xs">{sub}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

function StatCard({ label, value, accent, icon: Icon }) {
  const a = {
    red:     "text-red-400     border-red-500/20     bg-red-500/[0.08]",
    amber:   "text-amber-400   border-amber-500/20   bg-amber-500/[0.08]",
    violet:  "text-violet-400  border-violet-500/20  bg-violet-500/[0.08]",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.08]",
    slate:   "text-slate-400   border-slate-700/50   bg-slate-800/40",
  }[accent] || "text-slate-400 border-slate-700/50 bg-slate-800/40";
  return (
    <div className={`flex flex-col gap-2 p-3.5 rounded-xl border ${a}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={13} className="opacity-40" />
      </div>
      <span className="text-2xl font-black leading-none">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEAM LOGO AVATAR
// ─────────────────────────────────────────────────────────────
function TeamAvatar({ team, size = "md" }) {
  const sz = { sm: "w-7 h-7 text-[9px]", md: "w-9 h-9 text-xs", lg: "w-14 h-14 text-base" }[size] || "w-9 h-9 text-xs";
  if (team.logo) {
    return <img src={team.logo} alt={team.name} className={`${sz} rounded-xl object-cover border border-white/[0.1] shrink-0`} />;
  }
  return (
    <div
      className={`${sz} rounded-xl flex items-center justify-center font-black shrink-0 border border-white/[0.08]`}
      style={{ background: team.color ? `${team.color}22` : "rgba(124,58,237,0.15)", color: team.color || "#a78bfa" }}
    >
      {team.shortName?.slice(0, 3) || team.name?.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD TEAM MODAL
// ─────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#f97316",
];

const inputCls = `
  w-full px-3.5 py-2.5 rounded-xl
  bg-white/[0.04] border border-white/[0.10]
  text-white text-sm font-medium
  placeholder:text-slate-600
  focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07]
  focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
  transition-all duration-200
`;
const labelCls = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5";

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400 font-semibold"><AlertCircle size={10} />{msg}</p>;
}

function AddTeamModal({ tournamentId, onAdd, onClose }) {
  const emptyForm = { name: "", shortName: "", logo: "", captain: "", color: PRESET_COLORS[0] };
  const [form,    setForm]    = useState(emptyForm);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const fileRef = useRef();

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErrors(er => ({ ...er, logo: "Max 2 MB" })); return; }
    const reader = new FileReader();
    reader.onload = ev => { const b64 = ev.target.result; setPreview(b64); set("logo", b64); };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name      = "Team name is required";
    if (!form.shortName.trim()) e.shortName = "Short name is required";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onAdd({ ...form, tournamentId });
    setLoading(false);
    onClose();
  };

  // Close on backdrop click / Escape
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.10] overflow-hidden shadow-2xl"
        style={{ background: "rgba(11,16,40,0.97)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25">
              <Shield size={14} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Add Team</h2>
              <p className="text-[10px] text-slate-500 font-medium">Create a new team for this tournament</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-16 h-16 rounded-xl border-2 border-dashed border-white/[0.15] hover:border-violet-500/40 bg-white/[0.03] flex flex-col items-center justify-center gap-1 transition-all group shrink-0 overflow-hidden"
            >
              {preview
                ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                : <>
                    <Upload size={14} className="text-slate-500 group-hover:text-violet-400 transition-colors" />
                    <span className="text-[9px] text-slate-600 font-bold group-hover:text-slate-400 transition-colors">Logo</span>
                  </>
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-slate-400">Team Logo</p>
              <p className="text-[10px] text-slate-600">Click to upload · PNG, JPG · max 2 MB</p>
              <FieldError msg={errors.logo} />
            </div>
          </div>

          {/* Name + Short Name */}
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className={labelCls} htmlFor="tm-name">Team Name</label>
              <input id="tm-name" type="text" placeholder="e.g. Mumbai Indians" value={form.name}
                onChange={e => set("name", e.target.value)} maxLength={60}
                className={`${inputCls} ${errors.name ? "border-red-500/50" : ""}`} />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <label className={labelCls} htmlFor="tm-short">Short Name</label>
              <input id="tm-short" type="text" placeholder="MI" value={form.shortName}
                onChange={e => set("shortName", e.target.value.toUpperCase())} maxLength={5}
                className={`${inputCls} font-black tracking-widest text-center ${errors.shortName ? "border-red-500/50" : ""}`} />
              <FieldError msg={errors.shortName} />
            </div>
          </div>

          {/* Captain */}
          <div>
            <label className={labelCls} htmlFor="tm-captain">Captain Name</label>
            <input id="tm-captain" type="text" placeholder="e.g. Rohit Sharma" value={form.captain}
              onChange={e => set("captain", e.target.value)} maxLength={60}
              className={inputCls} />
          </div>

          {/* Team Color */}
          <div>
            <label className={labelCls}>Team Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? "scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"}`}
                  style={{ background: c, borderColor: form.color === c ? "white" : "transparent", boxShadow: form.color === c ? `0 0 10px ${c}80` : "none" }} />
              ))}
              {/* Custom color picker */}
              <label className="relative w-7 h-7 rounded-lg border border-white/[0.15] overflow-hidden cursor-pointer hover:border-white/30 transition-all" title="Custom color">
                <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-400">+</div>
                <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(135deg, #7c3aed, #ec4899)` }} />
              </label>
            </div>
            {/* Color preview with short name */}
            {form.name && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                  style={{ background: `${form.color}22`, color: form.color, border: `1px solid ${form.color}33` }}>
                  {form.shortName || form.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[10px] text-slate-500">Preview</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs font-bold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"}`}
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: loading ? "none" : "0 0 16px rgba(124,58,237,0.3)", color: "#ede9fe" }}>
              {loading ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><CheckCircle2 size={13} /> Create Team</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEAM ROW
// ─────────────────────────────────────────────────────────────
function TeamRow({ team, tournamentId, onDelete, isAdmin }) {
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDelete = () => {
    if (confirmDel) { onDelete(team.id); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }
  };

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all duration-150">

      {/* Logo + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TeamAvatar team={team} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white truncate">{team.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border"
              style={{ color: team.color || "#a78bfa", borderColor: `${team.color || "#7c3aed"}33`, background: `${team.color || "#7c3aed"}15` }}>
              {team.shortName}
            </span>
          </div>
          {team.captain && (
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Shield size={8} /> {team.captain}
            </p>
          )}
        </div>
      </div>

      {/* Placeholder stats */}
      <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold shrink-0">
        {[{ label: "MP", value: "0" }, { label: "W", value: "0" }, { label: "L", value: "0" }].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-slate-600 mb-0.5 uppercase tracking-wider text-[9px]">{s.label}</div>
            <div className="text-slate-400 font-black">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href={`/cricket/teams/${team.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[10px] font-bold border border-white/[0.06] transition-all">
          <Eye size={10} /> View
        </Link>
        {isAdmin && (
          <>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/[0.08] hover:bg-violet-500/[0.18] text-violet-400 text-[10px] font-bold border border-violet-500/15 transition-all">
              <Pencil size={10} /> Edit
            </button>
            <button onClick={handleDelete}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${confirmDel ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse" : "bg-red-500/[0.08] hover:bg-red-500/[0.18] text-red-400 border-red-500/15"}`}>
              {confirmDel ? <><XCircle size={10} /> Confirm</> : <><Trash2 size={10} /> Delete</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEAMS TAB
// ─────────────────────────────────────────────────────────────
function TeamsTab({ tournamentId, isAdmin }) {
  const { teams, addTeam, deleteTeam } = useTeams(tournamentId);
  const [showModal, setShowModal] = useState(false);

  const handleAdd = useCallback((data) => { addTeam(data); }, [addTeam]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Teams"
        sub={`${teams.length} team${teams.length !== 1 ? "s" : ""} registered`}
        action={
          isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,.8),rgba(99,102,241,.8))", border: "1px solid rgba(124,58,237,.35)", color: "#e9d5ff", boxShadow: "0 0 12px rgba(124,58,237,.2)" }}
            >
              <Plus size={12} /> Add Team
            </button>
          )
        }
      />

      {teams.length === 0 ? (
        <EmptySection
          icon="🛡️"
          label="No teams added yet"
          sub="Add participating teams to start building your tournament."
          cta={isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: "0 0 18px rgba(124,58,237,.3)" }}
            >
              <Plus size={14} /> Add First Team
            </button>
          )}
        />
      ) : (
        <div className="space-y-1.5">
          {teams.map(t => (
            <TeamRow key={t.id} team={t} tournamentId={tournamentId} onDelete={deleteTeam} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {showModal && <AddTeamModal tournamentId={tournamentId} onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW TAB (with real team count)
// ─────────────────────────────────────────────────────────────
function OverviewTab({ tournament }) {
  const { teams } = useTeams(tournament.id);
  const fmtObj  = fmtMeta(tournament.format);
  const ballObj = ballMeta(tournament.ballType);
  const status  = getTournamentStatus(tournament.startDate, tournament.endDate);
  const sm      = statusMeta(status);

  const stats = [
    { label: "Teams",         value: teams.length, accent: "violet",  icon: Users    },
    { label: "Total Matches", value: 0,            accent: "slate",   icon: Activity },
    { label: "Completed",     value: 0,            accent: "emerald", icon: Trophy   },
    { label: "Live Now",      value: 0,            accent: "red",     icon: Wifi     },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <SectionHeader title="Tournament Info" sub="Configuration and schedule" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Format",     value: fmtObj  ? `${fmtObj.icon} ${fmtObj.label}`   : "—" },
            { label: "Ball Type",  value: ballObj ? `${ballObj.icon} ${ballObj.label}` : "—" },
            { label: "Season",     value: tournament.season || "—" },
            { label: "Start Date", value: fmtDate(tournament.startDate) },
            { label: "End Date",   value: fmtDate(tournament.endDate)   },
            { label: "Status",     value: sm.label                      },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
              <span className="text-sm font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Tournament Summary" sub="Live counts update as matches are added" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <SectionHeader title="Tournament Progress" sub="Match completion timeline" />
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-700"
            style={{ width: status === "completed" ? "100%" : status === "ongoing" ? "40%" : "0%" }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600 font-semibold">
          <span>{fmtDate(tournament.startDate)}</span>
          <span>{fmtDate(tournament.endDate)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// CREATE MATCH MODAL
// ─────────────────────────────────────────────────────────────
const inputM  = "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all duration-200 appearance-none";
const labelM  = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5";
function FErr({ msg }) { return msg ? <p className="mt-1.5 text-[11px] text-red-400 font-semibold flex items-center gap-1"><AlertCircle size={10}/>{msg}</p> : null; }

function CreateMatchModal({ tournament, onAdd, onClose }) {
  const { teams: tournTeams } = useTeams(tournament.id);
  const emptyForm = {
    teamAId: "", teamBId: "",
    matchType: "league",
    overs: "20", customOvers: "",
    date: "", time: "",
    venue: "",
    ballType: tournament.ballType || "",
  };
  const [form,    setForm]    = useState(emptyForm);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const teamBOptions = tournTeams.filter(t => t.id !== form.teamAId);
  const teamAOptions = tournTeams.filter(t => t.id !== form.teamBId);

  const validate = () => {
    const e = {};
    if (!form.teamAId) e.teamAId = "Select Team A";
    if (!form.teamBId) e.teamBId = "Select Team B";
    if (form.teamAId && form.teamBId && form.teamAId === form.teamBId) e.teamBId = "Teams must be different";
    if (!form.matchType) e.matchType = "Select match type";
    const ov = form.overs === "custom" ? Number(form.customOvers) : Number(form.overs);
    if (!ov || ov < 1 || ov > 50) e.overs = "Valid overs: 1–50";
    if (!form.date) e.date = "Match date required";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 450));
    const teamA = tournTeams.find(t => t.id === form.teamAId);
    const teamB = tournTeams.find(t => t.id === form.teamBId);
    const finalOvers = form.overs === "custom" ? Number(form.customOvers) : Number(form.overs);
    onAdd({
      tournamentId: tournament.id,
      teamA: { id: teamA.id, name: teamA.name, shortName: teamA.shortName, logo: teamA.logo, color: teamA.color },
      teamB: { id: teamB.id, name: teamB.name, shortName: teamB.shortName, logo: teamB.logo, color: teamB.color },
      matchType: form.matchType,
      overs:     finalOvers,
      date:      form.date,
      time:      form.time,
      venue:     form.venue,
      ballType:  form.ballType,
    });
    setLoading(false);
    onClose();
  };

  useEffect(() => {
    const esc = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-white/[0.10] shadow-2xl"
        style={{ background: "rgba(11,16,40,0.98)", backdropFilter: "blur(24px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25"><Loader2 size={14} className="text-violet-400" /></div>
            <div>
              <h2 className="text-sm font-black text-white">Create Match</h2>
              <p className="text-[10px] text-slate-500 font-medium">{tournament.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"><X size={14} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {tournTeams.length < 2 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
              <AlertCircle size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300 font-semibold">Add at least 2 teams to this tournament before creating a match.</p>
            </div>
          )}

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelM} htmlFor="mt-teamA">Team A *</label>
              <div className="relative">
                <select id="mt-teamA" value={form.teamAId} onChange={e => set("teamAId", e.target.value)}
                  className={`${inputM} pr-7 cursor-pointer ${errors.teamAId ? "border-red-500/50" : ""}`}>
                  <option value="" className="bg-[#0f172a]">Select…</option>
                  {teamAOptions.map(t => <option key={t.id} value={t.id} className="bg-[#0f172a]">{t.name}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
              </div>
              <FErr msg={errors.teamAId} />
            </div>
            <div>
              <label className={labelM} htmlFor="mt-teamB">Team B *</label>
              <div className="relative">
                <select id="mt-teamB" value={form.teamBId} onChange={e => set("teamBId", e.target.value)}
                  className={`${inputM} pr-7 cursor-pointer ${errors.teamBId ? "border-red-500/50" : ""}`}>
                  <option value="" className="bg-[#0f172a]">Select…</option>
                  {teamBOptions.map(t => <option key={t.id} value={t.id} className="bg-[#0f172a]">{t.name}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
              </div>
              <FErr msg={errors.teamBId} />
            </div>
          </div>

          {/* Match Type */}
          <div>
            <label className={labelM}>Match Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MATCH_TYPES.map(mt => (
                <button key={mt.id} type="button" onClick={() => set("matchType", mt.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    form.matchType === mt.id ? "" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20"
                  }`}
                  style={form.matchType === mt.id ? { borderColor: `${mt.color}50`, background: `${mt.color}12`, color: mt.color } : {}}>
                  <span className="text-base">{mt.icon}</span>
                  <span className="text-[10px] text-center leading-tight">{mt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overs */}
          <div>
            <label className={labelM}>Overs *</label>
            <div className="flex gap-2 flex-wrap">
              {OVERS_PRESETS.map(o => (
                <button key={o} type="button" onClick={() => set("overs", String(o))}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    form.overs === String(o) ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20"
                  }`}>
                  {o} overs
                </button>
              ))}
              <button type="button" onClick={() => set("overs", "custom")}
                className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                  form.overs === "custom" ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20"
                }`}>
                Custom
              </button>
            </div>
            {form.overs === "custom" && (
              <input type="number" min={1} max={50} placeholder="Enter overs (1–50)"
                value={form.customOvers} onChange={e => set("customOvers", e.target.value)}
                className={`${inputM} mt-2 ${errors.overs ? "border-red-500/50" : ""}`} />
            )}
            <FErr msg={errors.overs} />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelM} htmlFor="mt-date">Match Date *</label>
              <input id="mt-date" type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className={`${inputM} ${errors.date ? "border-red-500/50" : ""}`}
                style={{ colorScheme: "dark" }} />
              <FErr msg={errors.date} />
            </div>
            <div>
              <label className={labelM} htmlFor="mt-time">Match Time</label>
              <input id="mt-time" type="time" value={form.time} onChange={e => set("time", e.target.value)}
                className={inputM} style={{ colorScheme: "dark" }} />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className={labelM} htmlFor="mt-venue">Venue / Ground</label>
            <input id="mt-venue" type="text" placeholder="e.g. Wankhede Stadium, Mumbai"
              value={form.venue} onChange={e => set("venue", e.target.value)} maxLength={80}
              className={inputM} />
          </div>

          {/* Ball Type */}
          <div>
            <label className={labelM} htmlFor="mt-ball">Ball Type</label>
            <div className="relative">
              <select id="mt-ball" value={form.ballType} onChange={e => set("ballType", e.target.value)}
                className={`${inputM} pr-7 cursor-pointer`}>
                <option value="" className="bg-[#0f172a]">Select…</option>
                {BALL_TYPES.map(b => <option key={b.id} value={b.id} className="bg-[#0f172a]">{b.icon} {b.label}</option>)}
              </select>
              <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs font-bold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading || tournTeams.length < 2}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${(loading || tournTeams.length < 2) ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01]"}`}
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#ede9fe", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}>
              {loading ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><CheckCircle2 size={13} /> Create Match</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MATCH ROW
// ─────────────────────────────────────────────────────────────
function statusBadge(s) {
  return ({
    live:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    upcoming:  "text-sky-400     bg-sky-500/10     border-sky-500/25",
    completed: "text-slate-400   bg-slate-700/30   border-slate-600/25",
  }[s] || "text-sky-400 bg-sky-500/10 border-sky-500/25");
}

function TeamMini({ teamData, align = "left" }) {
  if (!teamData) return <span className="text-slate-600 text-xs">TBD</span>;
  const isR = align === "right";
  return (
    <div className={`flex items-center gap-1.5 ${isR ? "flex-row-reverse" : ""}`}>
      <div className="w-6 h-6 rounded-lg text-[9px] font-black flex items-center justify-center shrink-0 border border-white/[0.08]"
        style={{ background: teamData.color ? `${teamData.color}20` : "rgba(124,58,237,0.15)", color: teamData.color || "#a78bfa" }}>
        {teamData.logo
          ? <img src={teamData.logo} alt="" className="w-full h-full object-cover rounded-lg" />
          : teamData.shortName?.slice(0, 2)}
      </div>
      <span className={`text-xs font-black text-white truncate max-w-[80px] ${isR ? "text-right" : ""}`}>{teamData.name}</span>
    </div>
  );
}

function MatchRow({ match, onDelete, isAdmin }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const mt  = getMatchType(match.matchType);
  const sm  = match.status || "upcoming";

  const fmtDate = (d, t) => {
    if (!d) return "TBD";
    const ds = new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (!t) return ds;
    const [h, m] = t.split(":");
    return `${ds} · ${+h % 12 || 12}:${m} ${+h >= 12 ? "PM" : "AM"}`;
  };

  const handleDel = () => {
    if (confirmDel) { onDelete(match.id); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }
  };

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all">

      {/* Teams VS */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamMini teamData={match.teamA} />
        <span className="text-[10px] text-slate-600 font-black px-1">VS</span>
        <TeamMini teamData={match.teamB} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
        {mt && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded border"
            style={{ color: mt.color, borderColor: `${mt.color}30`, background: `${mt.color}10` }}>
            {mt.icon} {mt.label}
          </span>
        )}
        {match.overs && <span className="text-[10px] text-slate-500 font-semibold">{match.overs}ov</span>}
        {match.date  && <span className="text-[10px] text-slate-500">{fmtDate(match.date, match.time)}</span>}
        {match.venue && <span className="hidden md:block text-[10px] text-slate-600 truncate max-w-[120px]">{match.venue}</span>}
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${statusBadge(sm)}`}>
          {sm === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}
          {sm.charAt(0).toUpperCase() + sm.slice(1)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {sm === "upcoming" && isAdmin && (
          <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
            ▶ Start
          </button>
        )}
        <Link href={`/cricket/matches/${match.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[10px] font-bold border border-white/[0.06] transition-all">
          <Eye size={10} /> View
        </Link>
        {isAdmin && (
          <>
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/[0.08] hover:bg-violet-500/[0.18] text-violet-400 text-[10px] font-bold border border-violet-500/15 transition-all">
              <Pencil size={10} /> Edit
            </button>
            <button onClick={handleDel}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                confirmDel ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse" : "bg-red-500/[0.08] hover:bg-red-500/[0.18] text-red-400 border-red-500/15"
              }`}>
              {confirmDel ? <><XCircle size={10} />Confirm</> : <><Trash2 size={10} />Del</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MATCHES TAB
// ─────────────────────────────────────────────────────────────
function MatchesTab({ tournamentId, tournament, isAdmin }) {
  const { matches, addMatch, deleteMatch } = useMatches(tournamentId);
  const [showModal,    setShowModal]    = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? matches : matches.filter(m => (m.status || "upcoming") === statusFilter);

  const counts = {
    all:       matches.length,
    upcoming:  matches.filter(m => (m.status || "upcoming") === "upcoming").length,
    live:      matches.filter(m => m.status === "live").length,
    completed: matches.filter(m => m.status === "completed").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <SectionHeader
        title="Fixtures"
        sub={`${matches.length} match${matches.length !== 1 ? "es" : ""} scheduled`}
        action={
          isAdmin && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,.85),rgba(99,102,241,.85))", border: "1px solid rgba(124,58,237,.40)", color: "#e9d5ff", boxShadow: "0 0 12px rgba(124,58,237,.2)" }}>
              <Plus size={12} /> Create Match
            </button>
          )
        }
      />

      {/* Status filter pills */}
      {matches.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {["all", "upcoming", "live", "completed"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                statusFilter === s ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}>
              {s === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${statusFilter === s ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-500"}`}>{counts[s]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 ? (
        <EmptySection icon="🏏" label="No matches created"
          sub="Create your first match to start scheduling fixtures for this tournament."
          cta={isAdmin && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: "0 0 18px rgba(124,58,237,.3)" }}>
              <Plus size={14} /> Create First Match
            </button>
          )}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed border-white/[0.07]">
          <span className="text-2xl">🔍</span>
          <p className="text-sm font-bold text-slate-400">No {statusFilter} matches</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <MatchRow key={m.id} match={m} onDelete={deleteMatch} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {showModal && tournament && (
        <CreateMatchModal tournament={tournament} onAdd={addMatch} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// POINTS TABLE TAB
// ─────────────────────────────────────────────────────────────
const PT_COLS = [
  { key: "pos",  label: "#",   width: "36px" },
  { key: "team", label: "Team",width: "2fr"  },
  { key: "m",    label: "M",   width: "44px" },
  { key: "w",    label: "W",   width: "44px" },
  { key: "l",    label: "L",   width: "44px" },
  { key: "t",    label: "T",   width: "44px" },
  { key: "pts",  label: "PTS", width: "52px" },
  { key: "nrr",  label: "NRR", width: "64px" },
];

function PointsTableTab({ tournamentId }) {
  const { teams } = useTeams(tournamentId);

  return (
    <div className="space-y-4">
      <SectionHeader title="Points Table" sub="Standings update automatically after matches are scored" />
      <div className="rounded-xl border border-white/[0.07] overflow-hidden">
        <div className="grid px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]"
          style={{ gridTemplateColumns: PT_COLS.map(c => c.width).join(" ") }}>
          {PT_COLS.map(c => <span key={c.key} className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.label}</span>)}
        </div>

        {teams.length > 0 ? (
          <div className="divide-y divide-white/[0.03]">
            {teams.map((t, i) => (
              <div key={t.id} className="grid px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                style={{ gridTemplateColumns: PT_COLS.map(c => c.width).join(" ") }}>
                <span className="text-[10px] font-black text-slate-500">{i + 1}</span>
                <div className="flex items-center gap-2">
                  <TeamAvatar team={t} size="sm" />
                  <div>
                    <p className="text-xs font-black text-white leading-none">{t.name}</p>
                    <p className="text-[9px] text-slate-600 font-semibold">{t.shortName}</p>
                  </div>
                </div>
                {["0", "0", "0", "0", "0", "+0.000"].map((v, j) => (
                  <span key={j} className="text-xs font-bold text-slate-500">{v}</span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[10px] text-slate-600 italic">
            Add teams to populate the points table
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-white/[0.04] text-[10px] text-slate-600">
          Points · NRR auto-calculated after matches
        </div>
      </div>
      <div className="px-4 py-3 rounded-xl bg-violet-500/[0.05] border border-violet-500/10 text-[10px] text-slate-500 font-medium">
        <span className="text-violet-400 font-black">NRR: </span>
        (Total runs scored / Total overs faced) − (Total runs conceded / Total overs bowled)
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────
const BATTING_COLS  = [
  { key:"rank",width:"36px",label:"#" }, { key:"name",width:"2fr",label:"Batter" },
  { key:"team",width:"1fr",label:"Team" }, { key:"mat",width:"44px",label:"Mat" },
  { key:"runs",width:"56px",label:"Runs" }, { key:"avg",width:"50px",label:"Avg" },
  { key:"sr",width:"50px",label:"SR" }, { key:"hs",width:"44px",label:"HS" },
];
const BOWLING_COLS  = [
  { key:"rank",width:"36px",label:"#" }, { key:"name",width:"2fr",label:"Bowler" },
  { key:"team",width:"1fr",label:"Team" }, { key:"mat",width:"44px",label:"Mat" },
  { key:"wkts",width:"52px",label:"Wkts" }, { key:"avg",width:"50px",label:"Avg" },
  { key:"eco",width:"50px",label:"Eco" }, { key:"best",width:"50px",label:"Best" },
];

function StatTable({ columns, accentCls, emptyLabel }) {
  return (
    <div className={`rounded-xl border overflow-hidden ${accentCls}`}>
      <div className="grid px-4 py-2.5 border-b border-white/[0.06]"
        style={{ gridTemplateColumns: columns.map(c => c.width).join(" ") }}>
        {columns.map(c => <span key={c.key} className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.label}</span>)}
      </div>
      {[...Array(5)].map((_,i) => (
        <div key={i} className="grid px-4 py-3 border-b border-white/[0.03]"
          style={{ gridTemplateColumns: columns.map(c => c.width).join(" ") }}>
          {columns.map((c,j) => (
            <div key={c.key} className="h-3 rounded-full animate-pulse bg-slate-800/40"
              style={{ width: j===0?"20px":j===1?"70%":"50%", animationDelay:`${i*80+j*25}ms` }} />
          ))}
        </div>
      ))}
      <div className="px-4 py-3 text-center text-[10px] text-slate-600 italic">{emptyLabel}</div>
    </div>
  );
}

function StatsTab() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Top Run Scorers" sub="Batting leaderboard for this tournament" />
        <StatTable columns={BATTING_COLS} accentCls="border-amber-500/15 bg-amber-500/[0.02]" emptyLabel="Complete matches to populate batting stats" />
      </div>
      <div>
        <SectionHeader title="Top Wicket Takers" sub="Bowling leaderboard for this tournament" />
        <StatTable columns={BOWLING_COLS} accentCls="border-red-500/15 bg-red-500/[0.02]" emptyLabel="Complete matches to populate bowling stats" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CricketTournamentDetailPage() {
  const { id }          = useParams();
  const { tournaments } = useTournaments();
  const [activeTab, setActiveTab] = useState("overview");
  const [tournament, setTournament] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const found = tournaments.find(t => t.id === id);
    setTournament(found || null);
  }, [tournaments, id]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">🏆</div>
      <h2 className="text-xl font-black text-white">Tournament not found</h2>
      <p className="text-sm text-slate-500">This tournament may have been deleted.</p>
      <Link href="/matches?tab=tournaments"
        className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-all">
        <ChevronLeft size={14} /> Back to Tournaments
      </Link>
    </div>
  );

  const status  = getTournamentStatus(tournament.startDate, tournament.endDate);
  const sm      = statusMeta(status);
  const fmtObj  = fmtMeta(tournament.format);
  const ballObj = ballMeta(tournament.ballType);
  const isAdmin = true;

  return (
    <div className="min-h-screen text-white pb-24">

      {/* Hero header */}
      <div className="border-b border-white/[0.06]"
        style={{ background: "linear-gradient(180deg,rgba(124,58,237,0.07) 0%,transparent 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-0">

          <Link href="/matches?tab=tournaments"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-semibold mb-5 transition-colors">
            <ChevronLeft size={13} /> Tournaments
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-violet-600/25 rounded-2xl blur-lg" />
                <div className="relative w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-2xl">
                  {ballObj?.icon || "🏆"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${sm.cls}`}>
                    {sm.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                    {sm.label}
                  </span>
                  {fmtObj  && <span className="text-[10px] text-slate-500 font-semibold">{fmtObj.icon} {fmtObj.label}</span>}
                  {ballObj && <span className="text-[10px] text-slate-600 font-medium">{ballObj.icon} {ballObj.label}</span>}
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{tournament.name}</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Season {tournament.season}
                  {tournament.startDate && <> · {fmtDate(tournament.startDate)} → {fmtDate(tournament.endDate)}</>}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 sm:mt-1 shrink-0">
                <Link href={`/cricket/tournaments/${id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-slate-300 text-xs font-bold transition-all">
                  <Pencil size={12} /> Edit
                </Link>
              </div>
            )}
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "overview" && <OverviewTab tournament={tournament} />}
        {activeTab === "matches"  && <MatchesTab tournamentId={id} tournament={tournament} isAdmin={isAdmin} />}
        {activeTab === "teams"    && <TeamsTab    tournamentId={id} isAdmin={isAdmin} />}
        {activeTab === "points"   && <PointsTableTab tournamentId={id} />}
        {activeTab === "stats"    && <StatsTab />}
      </div>
    </div>
  );
}
