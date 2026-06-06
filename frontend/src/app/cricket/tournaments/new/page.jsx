"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { useTournaments, FORMATS, BALL_TYPES } from "@/hooks/useTournaments";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i - 1);

// ─── Shared input styles ──────────────────────────────────────
const inputCls = `
  w-full px-3.5 py-2.5 rounded-xl
  bg-white/[0.04] border border-white/[0.10]
  text-white text-sm font-medium
  placeholder:text-slate-600
  focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07]
  focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
  transition-all duration-200
  appearance-none
`;
const labelCls = "block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5";

// ─── Option Card ──────────────────────────────────────────────
function OptionCard({ selected, onSelect, icon, label, desc, id }) {
  return (
    <button
      type="button"
      id={`option-${id}`}
      onClick={onSelect}
      className={`
        relative flex flex-col items-start gap-1 p-3 rounded-xl
        border text-left w-full transition-all duration-200
        ${selected
          ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(124,58,237,0.3),0_0_16px_rgba(124,58,237,0.12)]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
        }
      `}
    >
      {selected && (
        <CheckCircle2 size={13} className="absolute top-2.5 right-2.5 text-violet-400" />
      )}
      <span className="text-xl leading-none">{icon}</span>
      <span className={`text-xs font-black mt-1 ${selected ? "text-violet-300" : "text-slate-200"}`}>
        {label}
      </span>
      <span className="text-[10px] text-slate-500 font-medium leading-tight">{desc}</span>
    </button>
  );
}

// ─── Field error ──────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400 font-semibold">
      <AlertCircle size={10} /> {msg}
    </p>
  );
}

// ─── Section divider ─────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 border-y border-white/[0.05] bg-white/[0.02]">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────
export default function CreateTournamentPage() {
  const router = useRouter();
  const { addTournament } = useTournaments();

  const emptyForm = {
    name: "", season: String(CURRENT_YEAR),
    format: "", ballType: "", startDate: "", endDate: "",
  };

  const [form,      setForm]      = useState(emptyForm);
  const [errors,    setErrors]    = useState({});
  const [submitted, setSubmitted] = useState(null); // holds created tournament
  const [loading,   setLoading]   = useState(false);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name      = "Tournament name is required";
    if (!form.format)       e.format    = "Select a tournament format";
    if (!form.ballType)     e.ballType  = "Select a ball type";
    if (!form.startDate)    e.startDate = "Pick a start date";
    if (!form.endDate)      e.endDate   = "Pick an end date";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 500)); // UX pause
    const created = addTournament({ ...form });
    setLoading(false);
    setSubmitted(created);
  };

  // ── Success screen ──
  if (submitted) {
    const fmt      = FORMATS.find(f => f.id === submitted.format);
    const ballType = BALL_TYPES.find(b => b.id === submitted.ballType);
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Tournament Created!</h2>
          <p className="text-slate-400 text-sm mb-1 font-medium">
            <span className="text-violet-300 font-black">{submitted.name}</span> has been set up.
          </p>
          <p className="text-slate-600 text-xs mb-8">
            {ballType?.icon} {ballType?.label} · {fmt?.icon} {fmt?.label} · {submitted.season}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/matches?tab=tournaments"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-all shadow-lg shadow-violet-900/30"
            >
              <Trophy size={14} /> View Tournaments
            </Link>
            <button
              onClick={() => { setSubmitted(null); setForm(emptyForm); }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-slate-300 text-sm font-bold transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 pb-24">

      {/* Header */}
      <div className="max-w-xl mx-auto mb-8">
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-semibold mb-6 transition-colors"
        >
          <ChevronLeft size={13} /> Back to Cricket Hub
        </Link>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-violet-600/30 rounded-2xl blur-xl" />
            <div className="relative w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
              <Trophy size={24} className="text-violet-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Create Tournament</h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">Set up a new cricket tournament</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit} noValidate>
          <div
            className="rounded-2xl border border-white/[0.08] overflow-hidden"
            style={{ background: "rgba(15,20,48,0.70)", backdropFilter: "blur(24px)" }}
          >
            {/* Basic Info */}
            <SectionDivider label="Basic Info" />
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className={labelCls} htmlFor="t-name">Tournament Name</label>
                <input
                  id="t-name" type="text"
                  placeholder="e.g. Lakshmish Premier League 2025"
                  value={form.name} onChange={e => set("name", e.target.value)}
                  maxLength={80}
                  className={`${inputCls} ${errors.name ? "border-red-500/50" : ""}`}
                />
                <FieldError msg={errors.name} />
              </div>
              <div>
                <label className={labelCls} htmlFor="t-season">Season / Year</label>
                <div className="relative">
                  <select
                    id="t-season" value={form.season}
                    onChange={e => set("season", e.target.value)}
                    className={`${inputCls} pr-9 cursor-pointer`}
                  >
                    {YEARS.map(y => (
                      <option key={y} value={String(y)} className="bg-[#0f172a] text-white">{y}</option>
                    ))}
                  </select>
                  <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Format */}
            <SectionDivider label="Tournament Format" />
            <div className="px-5 py-5">
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(f => (
                  <OptionCard key={f.id} id={f.id} icon={f.icon} label={f.label} desc={f.desc}
                    selected={form.format === f.id} onSelect={() => set("format", f.id)} />
                ))}
              </div>
              <FieldError msg={errors.format} />
            </div>

            {/* Ball Type */}
            <SectionDivider label="Ball Type" />
            <div className="px-5 py-5">
              <div className="grid grid-cols-3 gap-2">
                {BALL_TYPES.map(b => (
                  <OptionCard key={b.id} id={b.id} icon={b.icon} label={b.label} desc={b.desc}
                    selected={form.ballType === b.id} onSelect={() => set("ballType", b.id)} />
                ))}
              </div>
              <FieldError msg={errors.ballType} />
            </div>

            {/* Dates */}
            <SectionDivider label="Tournament Dates" />
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="t-start">
                    <span className="flex items-center gap-1.5"><Calendar size={10} /> Start Date</span>
                  </label>
                  <input id="t-start" type="date" value={form.startDate}
                    onChange={e => set("startDate", e.target.value)}
                    className={`${inputCls} ${errors.startDate ? "border-red-500/50" : ""}`}
                    style={{ colorScheme: "dark" }} />
                  <FieldError msg={errors.startDate} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="t-end">
                    <span className="flex items-center gap-1.5"><Calendar size={10} /> End Date</span>
                  </label>
                  <input id="t-end" type="date" value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={e => set("endDate", e.target.value)}
                    className={`${inputCls} ${errors.endDate ? "border-red-500/50" : ""}`}
                    style={{ colorScheme: "dark" }} />
                  <FieldError msg={errors.endDate} />
                </div>
              </div>
            </div>

            {/* Preview */}
            {(form.name || form.format || form.ballType) && (
              <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-2">Preview</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                  {form.name     && <span className="text-white font-black">{form.name}</span>}
                  {form.season   && <span>Season {form.season}</span>}
                  {form.format   && <span>{FORMATS.find(f => f.id === form.format)?.icon} {FORMATS.find(f => f.id === form.format)?.label}</span>}
                  {form.ballType && <span>{BALL_TYPES.find(b => b.id === form.ballType)?.icon} {BALL_TYPES.find(b => b.id === form.ballType)?.label}</span>}
                  {form.startDate && form.endDate && <span>{form.startDate} → {form.endDate}</span>}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="px-5 pb-5">
              <button
                type="submit" disabled={loading}
                className={`relative w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl text-sm font-black uppercase tracking-wide transition-all duration-200 ${loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"}`}
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  boxShadow: loading ? "none" : "0 0 24px rgba(124,58,237,0.40), 0 4px 16px rgba(0,0,0,0.4)",
                  color: "#ede9fe",
                }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating Tournament…</>
                ) : (
                  <><Trophy size={16} /> Create Tournament</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
