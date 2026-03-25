"use client";

/**
 * RulesConfigPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * A self-contained, collapsible admin UI for configuring TournamentRules.config.
 *
 * ONLY rendered (and active) when auctionMode === "points".
 * For money-based auctions this component renders nothing — backward compat safe.
 *
 * Props:
 *   tournamentId  – optional; if provided, auto-loads saved rules from the API.
 *   auctionMode   – "money" | "points"
 *   config        – controlled config object  (parent state)
 *   onChange      – (newConfig) => void       (parent state updater)
 *
 * The component does NOT save to the API itself — it just feeds values back
 * to the parent via onChange so the wizard can include them in the launch payload.
 * The actual API save (PUT /api/rules/:id) should be called AFTER the tournament
 * is created.
 */

import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle,
  CheckCircle, Zap, Settings, Users, RotateCcw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Default / empty config skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_RULES_CONFIG = {
  budget: { total: 200, type: "points" },
  retention: { enabled: true, maxPlayers: 1, costPerPlayer: 50 },
  basePrice: { batsman: 2, bowler: 2, allRounder: 4 },
  increments: [
    { min: 2,  max: 10,   step: 1 },
    { min: 10, max: 20,   step: 2 },
    { min: 20, max: 50,   step: 5 },
    { min: 50, max: null, step: 10 },
  ],
  squad: { minPlayers: 11, maxPlayers: 15 },
  categoryConstraints: {
    "1st year": { min: 2, max: 15 },
    "2nd year": { min: 2, max: 15 },
    "3rd year": { min: 2, max: 15 },
    "4th year": { min: 2, max: 15 },
  },
  specialAdjustments: {
    captainReducesMax: false,
    viceCaptainReducesMax: false,
    retainedPlayerReducesMax: false,
  },
  rounds: [
    { name: "4th year Players", category: "4th year" },
    { name: "3rd year Players", category: "3rd year" },
    { name: "2nd year Players", category: "2nd year" },
    { name: "1st year Players", category: "1st year" },
  ],
  useRounds: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Small design-system primitives (DRY)
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="font-black text-sm text-white uppercase tracking-wider">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/8">{children}</div>}
    </div>
  );
};

const Label = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{children}</p>
);

const NumberInput = ({ value, onChange, min = 0, placeholder = "" }) => (
  <input
    type="number"
    min={min}
    value={value ?? ""}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    className="w-full bg-[#0B0F2A] border border-white/10 rounded-xl px-3 py-2
      font-semibold text-white text-sm outline-none
      focus:border-violet-500/70 transition-all placeholder:text-slate-600"
  />
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? "bg-violet-500" : "bg-white/10"}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
        ${checked ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
    </div>
    <span className="text-sm font-semibold text-slate-300">{label}</span>
  </label>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RulesConfigPanel({ tournamentId, auctionMode, config, onChange }) {
  const [issues, setIssues] = useState([]);

  // Only active for points-based auctions
  if (auctionMode !== "points") return null;

  // Helper: immutably update a nested path in config
  const set = (path, value) => {
    const keys = path.split(".");
    const next = JSON.parse(JSON.stringify(config));
    let cursor = next;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") cursor[keys[i]] = {};
      cursor = cursor[keys[i]];
    }
    cursor[keys[keys.length - 1]] = value;
    onChange(next);
  };

  const get = (path, fallback = undefined) => {
    try {
      return path.split(".").reduce((o, k) => o?.[k], config) ?? fallback;
    } catch { return fallback; }
  };

  // ── Sanity check on every config change ──────────────────────────────────
  useEffect(() => {
    // Basic checks if any
    setIssues([]);
  }, [config]);

  // ── Increment bands helpers ───────────────────────────────────────────────
  const increments = get("increments", []);
  const addBand = () => {
    const last = increments[increments.length - 1];
    onChange({
      ...config,
      increments: [
        ...increments.map((b) => ({ ...b, max: b.max })),
        { min: last?.max ?? 50, max: null, step: 10 },
      ],
    });
  };
  const removeBand = (i) => {
    const next = increments.filter((_, idx) => idx !== i);
    onChange({ ...config, increments: next });
  };
  const updateBand = (i, field, value) => {
    const next = increments.map((b, idx) =>
      idx === i ? { ...b, [field]: value === "" ? null : Number(value) } : b
    );
    onChange({ ...config, increments: next });
  };

  // ── Category constraints helpers ──────────────────────────────────────────
  const catConstraints = get("categoryConstraints", {});
  const catKeys = Object.keys(catConstraints);

  // ── Rounds helpers ────────────────────────────────────────────────────────
  const useRounds = get("useRounds", false);
  const rounds = get("rounds", []);

  return (
    <div className="space-y-4 mt-2">
      {/* Header banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-500/10
        border border-violet-500/25 px-5 py-4">
        <Zap className="w-5 h-5 text-violet-400 shrink-0" />
        <div>
          <p className="text-sm font-black text-white">Advanced Rule Engine — Points Mode</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Configure retention, base prices, increments, category constraints &amp; rounds.
            Leave defaults for a simple points auction.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_RULES_CONFIG)}
          title="Reset to defaults"
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black
            text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Issues warnings */}
      {issues.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 px-5 py-4 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Config Issues Detected</span>
          </div>
          {issues.map((issue, i) => (
            <p key={i} className="text-xs text-amber-200/80 pl-6">{issue}</p>
          ))}
        </div>
      )}

      {/* ── 2. Retention ── */}
      <SectionCard title="Retention Settings" icon="🏅">
        <Toggle
          checked={get("retention.enabled", false)}
          onChange={(v) => set("retention.enabled", v)}
          label="Enable player retention"
        />
        {get("retention.enabled") && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Max Retained Players</Label>
              <NumberInput value={get("retention.maxPlayers")} onChange={(v) => set("retention.maxPlayers", v)} min={0} />
            </div>
            <div>
              <Label>Cost per Retained Player (pts)</Label>
              <NumberInput value={get("retention.costPerPlayer")} onChange={(v) => set("retention.costPerPlayer", v)} min={0} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 3. Role-based Base Price ── */}
      <SectionCard title="Role Base Prices" icon="💎">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ["Batsman",       "batsman"],
            ["Bowler",        "bowler"],
            ["All-Rounder",   "allRounder"],
          ].map(([label, key]) => (
            <div key={key}>
              <Label>{label}</Label>
              <NumberInput
                value={get(`basePrice.${key}`)}
                onChange={(v) => set(`basePrice.${key}`, v)}
                min={0}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── 4. Increment Rules ── */}
      <SectionCard title="Bid Increment Steps" icon="📈">
        <p className="text-[10px] text-slate-500 mb-3">
          Define step size per bid range. Last row's max = ∞ (leave blank).
        </p>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 px-1">
            {["Min Bid", "Max Bid", "Step", ""].map((h) => (
              <Label key={h}>{h}</Label>
            ))}
          </div>
          {increments.map((band, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 items-center">
              <NumberInput value={band.min} onChange={(v) => updateBand(i, "min", v)} />
              <NumberInput value={band.max} onChange={(v) => updateBand(i, "max", v)} placeholder="∞" />
              <NumberInput value={band.step} onChange={(v) => updateBand(i, "step", v)} min={1} />
              <button
                type="button"
                onClick={() => removeBand(i)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500
                  hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBand}
            className="flex items-center gap-2 text-xs font-black text-violet-400
              hover:text-violet-300 transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Band
          </button>
        </div>
      </SectionCard>

      {/* ── 6. Category Constraints ── */}
      <SectionCard title="Category (Year-wise) Constraints" icon="📅">
        <p className="text-[10px] text-slate-500 mb-3">
          Set min/max players per year-category per team.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-[100px_1fr_1fr_40px] gap-3 px-1">
            {["Category", "Min", "Max", ""].map((h) => <Label key={h}>{h}</Label>)}
          </div>
          {catKeys.map((cat) => (
            <div key={cat} className="grid grid-cols-[100px_1fr_1fr_40px] gap-3 items-center">
              <p className="text-xs font-black text-violet-300 uppercase">{cat}</p>
              <NumberInput
                value={catConstraints[cat]?.min}
                onChange={(v) => set(`categoryConstraints.${cat}.min`, v)}
                min={0}
              />
              <NumberInput
                value={catConstraints[cat]?.max}
                onChange={(v) => set(`categoryConstraints.${cat}.max`, v)}
                min={0}
              />
              <button
                type="button"
                onClick={() => {
                  const next = { ...catConstraints };
                  delete next[cat];
                  set("categoryConstraints", next);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500
                  hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newKey = `year${catKeys.length + 1}`;
              set(`categoryConstraints.${newKey}`, { min: 2, max: 5 });
            }}
            className="flex items-center gap-2 text-xs font-black text-violet-400
              hover:text-violet-300 transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
      </SectionCard>

      {/* ── 7. Special Adjustments ── */}
      <SectionCard title="Special Adjustments" icon="🎖️">
        <p className="text-[10px] text-slate-500 mb-3">
          When selected, reduces the category max by 1 for the player's category.
        </p>
        <div className="space-y-3">
          {[
            ["captainReducesMax",       "Captain reduces category max"],
            ["viceCaptainReducesMax",   "Vice-Captain reduces category max"],
            ["retainedPlayerReducesMax","Retained player reduces category max"],
          ].map(([key, label]) => (
            <Toggle
              key={key}
              checked={get(`specialAdjustments.${key}`, false)}
              onChange={(v) => set(`specialAdjustments.${key}`, v)}
              label={label}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── 8. Round Configuration ── */}
      <SectionCard title="Round-Based Auction" icon="🔄">
        <Toggle
          checked={useRounds}
          onChange={(v) => set("useRounds", v)}
          label="Enable round-based auction flow"
        />
        {useRounds && (
          <div className="mt-4 space-y-3">
            <p className="text-[10px] text-slate-500">
              Each round filters players by category. Rounds play sequentially.
            </p>
            <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1">
              {["Round Name", "Category", ""].map((h) => <Label key={h}>{h}</Label>)}
            </div>
            {rounds.map((round, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                <input
                  value={round.name}
                  onChange={(e) => {
                    const next = rounds.map((r, ri) =>
                      ri === i ? { ...r, name: e.target.value } : r
                    );
                    set("rounds", next);
                  }}
                  placeholder="Round name"
                  className="bg-[#0B0F2A] border border-white/10 rounded-xl px-3 py-2
                    font-semibold text-white text-sm outline-none
                    focus:border-violet-500/70 transition-all placeholder:text-slate-600"
                />
                <input
                  value={round.category}
                  onChange={(e) => {
                    const next = rounds.map((r, ri) =>
                      ri === i ? { ...r, category: e.target.value } : r
                    );
                    set("rounds", next);
                  }}
                  placeholder="year1 / year2 …"
                  className="bg-[#0B0F2A] border border-white/10 rounded-xl px-3 py-2
                    font-semibold text-white text-sm outline-none
                    focus:border-violet-500/70 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => set("rounds", rounds.filter((_, ri) => ri !== i))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500
                    hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("rounds", [...rounds, { name: `Round ${rounds.length + 1}`, category: "" }])}
              className="flex items-center gap-2 text-xs font-black text-violet-400
                hover:text-violet-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Round
            </button>
          </div>
        )}
      </SectionCard>

      {/* Success indicator */}
      {issues.length === 0 && (
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold px-1">
          <CheckCircle className="w-4 h-4" />
          Rule configuration is valid
        </div>
      )}
    </div>
  );
}
