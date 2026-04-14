"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { API_URL } from "../../../lib/apiConfig";
import {
  CheckCircle, ChevronRight, ChevronLeft, Rocket,
  Upload, RefreshCw, Trash2, AlertCircle, Users,
  Trophy, Zap, Settings, PlayCircle, Eye, Maximize, Shuffle, Plus
} from "lucide-react";
import ImageEditModal from "../../../components/ImageEditModal";
import RulesConfigPanel, { DEFAULT_RULES_CONFIG } from "../../../components/RulesConfigPanel";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5;
const STEP_META = [
  { label: "Info",     icon: "🏆", title: "Tournament Information",  desc: "Core setup parameters" },
  { label: "Teams",   icon: "👥", title: "Teams Setup",              desc: "Configure your teams" },
  { label: "Icons",   icon: "⭐", title: "Icon Players",             desc: "Assign pre-retained stars" },
  { label: "Players", icon: "🧍", title: "Player Pool",              desc: "Upload auction players" },
  { label: "Launch",  icon: "🚀", title: "Review & Launch",          desc: "Confirm and go live" },
];

const DEFAULT_CONFIG = {
  name: "", numTeams: 10, iconsPerTeam: 3,
  organizerName: "", organizerLogo: "",
  baseBudget: 10000, defaultBasePrice: 100,
  squadSize: 15, auctionSlots: 120,
  auctionDate: "", auctionType: "live",
  // Auction engine fields
  auctionMode: "money",     // "money" | "points"
  squadMinPlayers: 1,
  squadMaxPlayers: 15,
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function ls(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function sse(key, val) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
}

function findValue(row, keys) {
  const rowKeys = Object.keys(row);
  // 1. Exact matches for any of the keys
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
    if (found) return row[found];
  }
  // 2. Exact matches (more aggressive)
  const pk = keys.map(k => k.toLowerCase().trim());
  const exact = rowKeys.find(rk => pk.includes(rk.toLowerCase().trim()));
  if (exact) return row[exact];

  // 3. Partial matches
  for (const k of keys) {
    const found = rowKeys.find(rk => {
      const lrk = rk.toLowerCase().trim();
      const lk = k.toLowerCase().trim();
      
      // Strict matching for "age" to avoid vill-age, st-age, etc.
      if (lk === "age") {
        return (lrk === "age" || lrk === "ವಯಸ್ಸು" || lrk.includes("player age") || lrk === "years" || lrk === "ವಯಸ್ಸು (age)");
      }

      return lrk.includes(lk);
    });
    if (found) return row[found];
  }
  return null;
}

const fixUrl = (url) => {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.+?)\//);
    if (match?.[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    const idParam = new URLSearchParams(url.split("?")[1]).get("id");
    if (idParam) return `https://drive.google.com/uc?export=view&id=${idParam}`;
  }
  return url;
};

const proxyUrl = (url) => {
  if (!url || typeof url !== "string" || !url.trim().toLowerCase().startsWith("http")) return "";
  const API = API_URL;
  // Only proxy Google Drive links — other URLs load fine directly
  if (url.includes("drive.google.com")) {
    const fixed = fixUrl(url); // convert to uc?export=view first
    return `${API}/api/proxy-image?url=${encodeURIComponent(fixed)}`;
  }
  return url;
};

const hasNonEng = (s) => /[^\x00-\x7F]/.test(s);

const calculateAge = (dob) => {
  if (!dob) return null;
  try {
    const today = new Date();
    let birthDate;

    // Handle Excel Serial Dates
    if (typeof dob === 'number') {
      birthDate = new Date(Math.round((dob - 25569) * 864e5));
    } else if (dob instanceof Date) {
      birthDate = dob;
    } else {
      let s = String(dob).trim()
        .replace(/[\.\-]/g, '/')
        .replace(/[೦-೯]/g, d => "೦೧೨೩೪೫೬೭೮೯".indexOf(d)); // Convert Kannada numerals if any
      
      const parts = s.split('/');
      if (parts.length === 3) {
        let [p1, p2, p3] = parts.map(Number);
        
        // Determine Year (p3 is usually year)
        let y = p3, m = p2, d = p1;
        if (y < 31 && p1 > 1900) { y = p1; m = p2; d = p3; } // YYYY/MM/DD
        if (y < 100) y += (y > 30 ? 1900 : 2000);
        
        // Handle DD/MM or MM/DD ambiguity (prioritize birth reporting logic)
        // If m > 12, it must be DD/MM
        if (m > 12 && d <= 12) {
          const temp = m; m = d; d = temp;
        }

        birthDate = new Date(y, m - 1, d);
      } else {
        birthDate = new Date(s);
      }
    }

    if (isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return null;
  }
};

const ROLE_MAP = {
  // Batsman variants
  bat: "Batsman", batter: "Batsman", batting: "Batsman",
  batsman: "Batsman", batsmen: "Batsman", "ಬ್ಯಾಟ್ಸ್ಮನ್": "Batsman",
  
  // Bowler variants
  bowl: "Bowler", bowler: "Bowler", bowling: "Bowler", "ಬೌಲರ್": "Bowler",
  
  // All-Rounder variants
  "all-rounder": "All-Rounder", allrounder: "All-Rounder", "all rounder": "All-Rounder",
  ar: "All-Rounder", "ಅಲ್ ರೌಂಡರ್": "All-Rounder", "ಆಲ್ ರೌಂಡರ್": "All-Rounder",
  
  // Wicket Keeper variants (fallback to Batsman)
  "wicket keeper": "Batsman", wicketkeeper: "Batsman",
  wk: "Batsman", keeper: "Batsman", "ವಿಕೆಟ್ ಕೀಪರ್": "Batsman",
  
  // WK-Batsman variants (fallback to Batsman)
  "wk-batsman": "Batsman", "wk batsman": "Batsman", wkbatsman: "Batsman",
  "wicket keeper batsman": "Batsman", "keeper batsman": "Batsman",
};

const normalizeRole = (raw) => {
  if (!raw) return "All-Rounder";
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, " ");
  // Exact match first
  if (ROLE_MAP[key]) return ROLE_MAP[key];
  // Partial match
  for (const [k, v] of Object.entries(ROLE_MAP)) {
    if (key.includes(k)) return v;
  }
  // Passthrough if it's already a valid role
  const valid = ["Batsman","Bowler","All-Rounder"];
  const found = valid.find(v => v.toLowerCase() === key);
  return found || "All-Rounder";
};

const normalizeCategory = (raw) => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes("1") || s.includes("first")) return "year1";
  if (s.includes("2") || s.includes("second")) return "year2";
  if (s.includes("3") || s.includes("third")) return "year3";
  if (s.includes("4") || s.includes("fourth")) return "year4";
  return null;
};

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="px-6 pt-6 pb-0">
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10 z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 z-0 transition-all duration-500 ease-out"
          style={{
            width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
          }}
        />
        {STEP_META.map((s, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs
                transition-all duration-300
                ${done   ? "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.6)]" :
                  active ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(124,58,237,0.7)] scale-110" :
                           "bg-white/5 border border-white/10 text-slate-500"}
              `}>
                {done ? <CheckCircle className="w-5 h-5 text-white" /> : (
                  <span className={active ? "text-white" : ""}>{s.icon}</span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block
                ${done ? "text-emerald-400" : active ? "text-violet-300" : "text-slate-600"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP CARD WRAPPER
// ─────────────────────────────────────────────────────────────
function StepCard({ step, children, onReset, resetLabel = "Reset" }) {
  const meta = STEP_META[step - 1];
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">
              <span>Step {step} of {TOTAL_STEPS}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-violet-400">{meta.desc}</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              <span className="mr-2">{meta.icon}</span>{meta.title}
            </h2>
          </div>
          {onReset && (
            <button onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400
                bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              <RefreshCw className="w-3 h-3" /> {resetLabel}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FIELD
// ─────────────────────────────────────────────────────────────
function Field({ label, error, children, hint }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</label>
        {error && <span className="text-[10px] text-red-400 font-bold animate-pulse">{error}</span>}
      </div>
      {children}
      {hint && !error && <p className="text-[10px] text-slate-600 mt-1 px-1">{hint}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full bg-[#0B0F2A] border ${err ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3
   font-semibold text-white text-sm outline-none focus:border-violet-500/70 transition-all
   placeholder:text-slate-600`;

// ─────────────────────────────────────────────────────────────
// NAVIGATION FOOTER
// ─────────────────────────────────────────────────────────────
function NavButtons({ step, onPrev, onNext, onLaunch, launching }) {
  return (
    <div className="shrink-0 border-t border-white/10 px-6 py-4 flex justify-between items-center
      bg-[#0B0F2A]/80 backdrop-blur-xl">
      <button
        onClick={onPrev}
        disabled={step === 1}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm
          text-slate-400 border border-white/10 hover:border-white/20 hover:text-white
          disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      {step < TOTAL_STEPS ? (
        <button onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white
            bg-gradient-to-r from-violet-600 to-cyan-500
            shadow-[0_0_18px_rgba(124,58,237,0.4)]
            hover:shadow-[0_0_26px_rgba(124,58,237,0.7)]
            hover:scale-105 transition-all">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={onLaunch} disabled={launching}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-sm text-black
            bg-gradient-to-r from-yellow-400 to-yellow-500
            shadow-[0_0_20px_rgba(255,215,0,0.5)]
            hover:shadow-[0_0_32px_rgba(255,215,0,0.8)]
            hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {launching ? (
            <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Launching…</>
          ) : (
            <><Rocket className="w-4 h-4" /> 🚀 Start Auction</>
          )}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN WIZARD
// ─────────────────────────────────────────────────────────────
export default function CreateTournamentWizard() {
  const router = useRouter();

  // Persistent state
  const [step,        setStep]        = useState(() => ls("wiz_step", 1));
  const [config,      setConfig]      = useState(() => ls("wiz_config", DEFAULT_CONFIG));
  const [teams,       setTeams]       = useState(() => ls("wiz_teams", []));
  const [icons,       setIcons]       = useState(() => ls("wiz_icons", []));
  const [players,     setPlayers]     = useState(() => ls("wiz_players", []));
  const [originalPlayers, setOriginalPlayers] = useState(() => ls("wiz_original_players", []));
  const [rulesConfig, setRulesConfig] = useState(() => ls("wiz_rules", DEFAULT_RULES_CONFIG));
  const [parsedData,  setParsedData]  = useState(null); // RAW data for multi-step use
  const [errors,      setErrors]      = useState({});
  const [uploading,   setUploading]   = useState(false);
  const [converting,  setConverting]  = useState(false);
  const [launching,   setLaunching]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // { type: 'team'|'icon'|'player', index, url }

  // Save to localStorage whenever state changes
  useEffect(() => { sse("wiz_step",    step);    }, [step]);
  useEffect(() => { sse("wiz_config",  config);  }, [config]);
  useEffect(() => { sse("wiz_teams",   teams);   }, [teams]);
  useEffect(() => { sse("wiz_icons",   icons);   }, [icons]);
  useEffect(() => { sse("wiz_players", players); }, [players]);
  useEffect(() => { sse("wiz_original_players", originalPlayers); }, [originalPlayers]);
  useEffect(() => { sse("wiz_rules",   rulesConfig); }, [rulesConfig]);

  // Repair session if originalPlayers is missing
  useEffect(() => {
    if (players.length > 0 && originalPlayers.length === 0) {
      setOriginalPlayers([...players]);
    }
  }, [players, originalPlayers]);

  // ── Reset ──────────────────────────────────────────────────
  const fullReset = () => {
    setStep(1); setConfig(DEFAULT_CONFIG); setTeams([]);
    setIcons([]); setPlayers([]); setOriginalPlayers([]); setErrors({});
    setRulesConfig(DEFAULT_RULES_CONFIG);
    ["wiz_step","wiz_config","wiz_teams","wiz_icons","wiz_players",
     "wiz_original_players", "wiz_rules"].forEach(k => localStorage.removeItem(k));
  };

  // ── Validation ─────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!config.name.trim())                        e.name        = "Required";
    if (!config.numTeams || config.numTeams < 2)    e.numTeams    = "Min 2";
    if (config.iconsPerTeam < 0)                    e.iconsPerTeam = "Required";
    if (!config.baseBudget || config.baseBudget < 1) e.baseBudget  = "Required";
    if (!config.defaultBasePrice || config.defaultBasePrice < 1) e.defaultBasePrice = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const te = teams.map(t => ({ name: !t.name.trim(), shortName: !t.shortName?.trim() }));
    setErrors({ teams: te });
    return !te.some(e => e.name || e.shortName);
  };

  const validateStep3 = () => {
    // We actively ignore "To be confirmed" template slots
    const actualIcons = icons.filter(p => p.name && p.name !== "To be confirmed");
    const ie = actualIcons.map(p => ({ name: !p.name.trim() }));
    // No error state needed here unless an actual filled player has no name
    return true; 
  };

  const validateStep4 = () => {
    if (!config.squadSize || config.squadSize < 1) {
      setErrors({ squadSize: "Must be at least 1" }); return false;
    }
    if (config.squadSize < config.iconsPerTeam) {
      setErrors({ squadSize: "Must be ≥ icons per team" }); return false;
    }
    setErrors({});
    return true;
  };

  const validateStep5 = () => {
    if (players.length === 0) {
      setErrors({ players: "Upload at least one player" }); return false;
    }
    setErrors({});
    return true;
  };

  // ── Next step logic ────────────────────────────────────────
  // Helper: default iconRole by position within a team's icon slots
  const iconRoleForSlot = (posInTeam) => {
    if (posInTeam === 0) return "captain";
    if (posInTeam === 1) return "viceCaptain";
    return "retained";
  };

  const goNext = () => {
    setErrors({});
    if (step === 1) {
      if (!validateStep1()) return;
      const n = Number(config.numTeams);
      const existing = teams.length === n ? teams : Array.from({ length: n }, (_, i) => ({
        name: teams[i]?.name || `Team ${i + 1}`,
        shortName: teams[i]?.shortName || `T${i + 1}`,
        logoUrl: teams[i]?.logoUrl || "",
        color: ["#7c3aed","#06b6d4","#f97316","#ef4444","#10b981","#f59e0b","#8b5cf6","#3b82f6","#ec4899","#14b8a6"][i % 10],
      }));
      setTeams(existing);
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      // Generate icon slots and auto-fill from temporary store if exists
      const total = config.numTeams * config.iconsPerTeam;
      const cachedIcons = ls("wiz_temp_icons", []);
      
      const slots = [];
      teams.forEach((team, ti) => {
        const sysT = team.name.toLowerCase().trim();
        const matchIcons = cachedIcons.filter(ci => {
          if (ci.assigned) return false;
          const impT = ci.teamName?.toLowerCase().trim();
          return impT && (sysT.includes(impT) || impT.includes(sysT));
        });
        
        if (matchIcons.length > 0) {
          matchIcons.forEach(match => {
            match.assigned = true;
            slots.push({ ...match, team: team.name, teamIdx: ti });
          });
        } else {
          // If no CSV match, populate C & VC only (2 cards max default)
          for (let j = 0; j < Math.min(2, config.iconsPerTeam); j++) {
            slots.push({ 
              name: "To be confirmed", 
              role: "All-Rounder", 
              category: "1st year",
              village: "TBC", 
              age: "TBC", 
              applicationId: "-",
              mobile: "-",
              imageUrl: team.logoUrl || "", 
              team: team.name, 
              teamIdx: ti,
              iconRole: iconRoleForSlot(j),
            });
          }
        }
      });
      setIcons(slots);
      
      // Auto-trigger image fix for Drive links
      const driveLinks = slots.filter(s => s.imageUrl?.includes("drive.google.com")).map(s => s.imageUrl);
      if (driveLinks.length > 0) fixIconImages(slots);
      
      setStep(3);
    } else if (step === 3) {
      if (!validateStep3()) return;
      setStep(4);
    } else if (step === 4) {
      if (!validateStep5()) return;
      setStep(5);
    }
  };

  const goPrev = () => setStep(s => Math.max(s - 1, 1));

  // ── Image upload ───────────────────────────────────────────
  const handleImageUpload = async (file, callback, folder = "teams") => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToS3(file, folder);
      callback(url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Excel: Global / Teams ─────────────────────────────────
  const handleTeamsExcel = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: true });
        const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        setParsedData(rawRows);

        // 1. Extract Teams (Filter: Name required)
        const teamRows = rawRows.filter(row => {
          return findValue(row, ["teamName", "team name", "name", "team", "ತಂಡ"]);
        });

        if (teamRows.length > 0) {
          const importedTeams = teamRows.map((row, i) => ({
            name:      findValue(row, ["teamName","team name","name","team","ತಂಡ"]),
            shortName: findValue(row, ["shortName","short name","code","id"]) || (findValue(row, ["teamName","team name","name","team"])?.slice(0, 3).toUpperCase() || "TBD"),
            logoUrl:   proxyUrl(findValue(row, ["logoUrl","logo","image","link", "imageUrl", "logo link", "team logo", "team_logo"])),
            logoOriginalUrl: findValue(row, ["logoUrl","logo","image","link", "imageUrl", "logo link", "team logo", "team_logo"]),
            color:     ["#7c3aed","#06b6d4","#f97316","#ef4444","#10b981","#f59e0b"][i % 6],
          }));
          setTeams(importedTeams);
          setConfig(p => ({ ...p, numTeams: importedTeams.length }));
          
          // Trigger Logo Fix
          const logoLinks = importedTeams.filter(t => t.logoUrl?.includes("drive.google.com")).map(t => t.logoUrl);
          if (logoLinks.length > 0) {
            handleLogoProxy(importedTeams, [...new Set(logoLinks)]);
          }
        }

        // 2. Extract Icons (Handle horizontal columns format first)
        let importedIcons = [];
        rawRows.forEach(row => {
          const teamName = findValue(row, ["teamName", "team name", "name", "team", "ತಂಡ"]);
          if (teamName) {
            importedIcons.push(...extractIconsFromRow(row, teamName));
          }
        });

        // Fallback: If no column-wise icons were found, try row-wise parsing
        if (importedIcons.length === 0) {
          const iconRows = rawRows.filter(row => {
            const name = findValue(row, ["player name", "playerName", "icon", "name", "athlete", "ಆಟಗಾರನ ಹೆಸರು"]);
            const img = findValue(row, ["imageUrl", "photo", "image", "link", "url", "icon image", "ಭಾವಚಿತ್ರ"]);
            // Avoid treating pure team rows as player rows
            const hasTeamKeys = findValue(row, ["teamName", "team logo", "logoUrl"]);
            return name && img && !hasTeamKeys;
          });

          if (iconRows.length > 0) {
            importedIcons = iconRows.map(row => ({
              name:     findValue(row, ["player name", "playerName", "icon", "name", "athlete", "ಆಟಗಾರನ ಹೆಸರು"]),
              role:     normalizeRole(findValue(row, ["playing role", "role", "skill", "player role", "category", "type", "position", "ಪಾತ್ರ", "ಸ್ಥಾನ"])),
              village:  findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
              age:     Number(calculateAge(findValue(row, ["dob", "birth"]))) || Number(findValue(row, ["age", "ವಯಸ್ಸು"])) || 0,
              imageUrl: proxyUrl(findValue(row, ["imageUrl", "photo", "image", "link", "url", "icon image", "ಭಾವಚಿತ್ರ"])),
              imageOriginalUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url", "icon image", "ಭಾವಚಿತ್ರ"]),
              teamName: findValue(row, ["team", "teamName", "team name", "ತಂಡ"])
            }));
          }
        }

        if (importedIcons.length > 0) {
          ls("wiz_temp_icons", importedIcons); 
        }

      } catch (err) { 
        console.error(err);
        alert("Invalid file format"); 
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleLogoProxy = async (currentTeams, links) => {
    const API = API_URL;
    setConverting(true);
    try {
      const res = await fetch(`${API}/api/upload/proxy-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: links, folder: "teams" })
      });
      const data = await res.json();
      if (data.results) {
        setTeams(prev => prev.map(t => {
          const match = data.results.find(r => r.originalUrl === t.logoOriginalUrl && r.success);
          return match ? { ...t, logoUrl: match.s3Url, logoOriginalUrl: null } : t;
        }));
      }
    } catch (e) {
      console.error("Logo fix failed", e);
    } finally {
      setConverting(false);
    }
  };

  // Helper: Deduced Year from USN based on 2026
  const calculateYearFromUSN = (usnStr) => {
    if (!usnStr || typeof usnStr !== 'string') return "1st year";
    const match = usnStr.match(/2[0-9]/);
    if (match) {
      const yr = parseInt(match[0], 10);
      const diff = 26 - yr;
      if (diff === 3) return "3rd year";
      if (diff === 2) return "2nd year";
      if (diff >= 4) return "4th year";
    }
    return "1st year";
  };

  // ── Helper: Extract Icons Column-wise ──
  const extractIconsFromRow = (row, teamName) => {
    const iconsFound = [];
    
    // Track sequential indices for generic duplicate columns (e.g. "USN", "USN_1")
    let genericUsnIdx = 1; 
    let genericPhnIdx = 1;
    const rowKeys = Object.keys(row).map(k => k.toLowerCase().trim());
    
    const extractRole = (prefixes, roleType) => {
      // Find Name
      const pName = findValue(row, prefixes.flatMap(p => [`${p} name`, `${p}name`, p, `${p} player name`, `${p} player`]));
      if (!pName || pName.toLowerCase() === "yes" || pName.toLowerCase() === "no") return null;

      // Find USN
      let pUsn = findValue(row, prefixes.flatMap(p => [`${p} usn`, `${p}usn`, `${p} id`, `${p} roll`, `${p} usn number`, `${p} app id`]));
      if (!pUsn) {
        // Fallback to sequential generic headers: 'usn', 'usn_1', 'usn_2'
        const suffix = genericUsnIdx === 1 ? "" : `_${genericUsnIdx - 1}`;
        pUsn = findValue(row, [`usn${suffix}`, `id${suffix}`, `roll no${suffix}`]);
        if (pUsn) genericUsnIdx++;
      }

      // Find Phone
      let pPhn = findValue(row, prefixes.flatMap(p => [`${p} phn number`, `${p} phn`, `${p} phone`, `${p} mobile`, `${p} number`, `${p} contact`, `${p} phone number`]));
      if (!pPhn) {
        // Fallback to sequential generic headers: 'phn number', 'phn number_1'
        const suffix = genericPhnIdx === 1 ? "" : `_${genericPhnIdx - 1}`;
        pPhn = findValue(row, [`phn number${suffix}`, `phone number${suffix}`, `mobile${suffix}`, `phone${suffix}`, `phn${suffix}`, `contact${suffix}`]);
        if (pPhn) genericPhnIdx++;
      }

      const pImg = findValue(row, prefixes.flatMap(p => [`${p} photo`, `${p} image`, `${p} url`, `${p} id card`, `${p} link`, `${p} pic`]));
      
      return {
        name: pName,
        mobile: pPhn || "-",
        imageUrl: proxyUrl(pImg),
        imageOriginalUrl: pImg,
        role: "All-Rounder", // default backend necessity
        category: calculateYearFromUSN(pUsn || ""), // Dynamic Year calculation from USN
        village: "-", 
        age: 0, 
        teamName, 
        iconRole: roleType,
        applicationId: pUsn || "-", // Store USN but don't use it for assignment
      };
    };

    const cap = extractRole(["captain", "capt", "c", "captian"], "captain");
    if (cap) iconsFound.push(cap);
    const vc = extractRole(["vice captain", "vc", "vice-captain", "vice", "v captain", "vice captian", "vp", "v c"], "viceCaptain");
    if (vc) iconsFound.push(vc);
    const ret = extractRole(["retained", "retain", "ret", "retianed", "retained player", "retention"], "retained");
    if (ret) iconsFound.push(ret);

    return iconsFound;
  };

  const fixIconImages = async (currentIcons) => {
    const list = currentIcons || icons;
    const API = API_URL;
    const driveLinks = list.filter(p => p.imageUrl && p.imageUrl.includes("drive.google.com")).map(p => p.imageUrl);
    const uniqueLinks = [...new Set(driveLinks)];
    
    if (uniqueLinks.length === 0) return;
    
    setConverting(true);
    try {
      const res = await fetch(`${API}/api/upload/proxy-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: uniqueLinks, folder: "players" })
      });
      const data = await res.json();
      
      if (data.results) {
        setIcons(prev => {
          let next = [...prev];
          data.results.forEach(res => {
            if (res.success) {
              // Update all instances using this URL
              next = next.map(ic => ic.imageOriginalUrl === res.originalUrl ? { ...ic, imageUrl: res.s3Url, imageOriginalUrl: null } : ic);
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Icon batch proxy failed", err);
    } finally {
      setConverting(false);
    }
  };

  // ── Excel: Icons ───────────────────────────────────────────
  const handleIconsExcel = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let updated = [...icons];

        rows.forEach(row => {
          const teamMatch = findValue(row, ["team","teamName","team name"]);
          if (!teamMatch) return;
          const tIdx = teams.findIndex(t => {
            const sysT = t.name.toLowerCase().trim();
            const impT = teamMatch.toLowerCase().trim();
            return sysT.includes(impT) || impT.includes(sysT);
          });
          if (tIdx === -1) return;

          // Process row horizontally first for columns (C, VC, Retained)
          const extracted = extractIconsFromRow(row, teamMatch);
          if (extracted.length > 0) {
            // Remove lingering empty slots for this team so we can cleanly place them
            updated = updated.filter(p => !(p.teamIdx === tIdx && p.name === "To be confirmed"));

            extracted.forEach(extItem => {
              // See if role (C, VC, Retained) is already manually placed, update it, else push new slot!
              const slot = updated.findIndex(p => p.teamIdx === tIdx && p.iconRole === extItem.iconRole);
              if (slot !== -1) {
                updated[slot] = {
                  ...updated[slot],
                  name: extItem.name,
                  category: extItem.category, // Use pre-calculated category from extraction
                  mobile: extItem.mobile,
                  imageUrl: extItem.imageUrl,
                  imageOriginalUrl: extItem.imageOriginalUrl,
                };
              } else {
                updated.push({
                  ...extItem,
                  team: teams[tIdx].name,
                  teamIdx: tIdx,
                });
              }
            });
          } else {
             // Fallback to row-wise assignment
             const slot = updated.findIndex(p => p.teamIdx === tIdx && (!p.name || p.name === "To be confirmed"));
             if (slot !== -1) {
               updated[slot] = {
                 ...updated[slot],
                 name:     findValue(row, ["player name", "playerName", "icon", "name"]) || "",
                 role:     normalizeRole(findValue(row, ["role", "type", "position"])),
                 mobile:   findValue(row, ["phone", "mobile", "phn"]) || "-",
                 imageUrl: proxyUrl(findValue(row, ["imageUrl", "photo", "image", "link", "url"])),
                 imageOriginalUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url"]),
               };
             }
          }
        });
        setIcons(updated);
        fixIconImages(updated);
      } catch { alert("Invalid file format"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const fixPlayerImages = async (currentPlayers) => {
    const list = currentPlayers || players;
    const API = API_URL;
    
    // Use original Drive URLs for S3 upload, not the proxy URLs
    const driveLinks = list
      .filter(p => p.imageOriginalUrl?.includes("drive.google.com"))
      .map(p => p.imageOriginalUrl);
    const uniqueLinks = [...new Set(driveLinks)];
    if (uniqueLinks.length === 0) return;

    setConverting(true);
    try {
      const res = await fetch(`${API}/api/upload/proxy-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: uniqueLinks, folder: "players" })
      });
      const data = await res.json();
      if (data.results) {
        setPlayers(prev => prev.map(p => {
          const match = data.results.find(r => r.originalUrl === p.imageOriginalUrl && r.success);
          // Swap proxy URL for permanent S3 URL when ready
          return match ? { ...p, imageUrl: match.s3Url, imageOriginalUrl: null } : p;
        }));
      }
    } catch (err) {
      console.error("S3 batch failed", err);
    } finally {
      setConverting(false);
    }
  };

  const jumblePlayers = () => {
    if (players.length < 2) return;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    // Re-index slno based on new order (preserve original USN)
    const ordered = shuffled.map((p, i) => ({ ...p, id: i + 1 }));
    setPlayers(ordered);
  };

  const revertJumble = () => {
    if (originalPlayers.length > 0) {
      setPlayers([...originalPlayers]);
    }
  };

  // ── Excel: Players ─────────────────────────────────────────
  const handlePlayersExcel = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: true });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const imported = rows.map((row, i) => {
          const dobVal = findValue(row, ["dob", "date of birth", "birth", "ಹುಟ್ಟಿದ ದಿನಾಂಕ", "d.o.b", "birthdate", "birth_date", "dateofbirth"]);
          const calcAge = calculateAge(dobVal);
          const rawAge = findValue(row, ["age", "years", "ವಯಸ್ಸು", "playerage", "player_age"]);
          const rawUrl = findValue(row, ["imageUrl", "photo", "image", "id card", "idcard", "id card photo", "link", "url", "ಭಾವಚಿತ್ರ"]) || "";
          const rawUSN = findValue(row, ["usn", "roll no", "id number", "id", "roll"]);

          const r = normalizeRole(findValue(row, [
              "playing role", "playerrole", "player role", "role", "skill", "type", "position", "playing style", "batting/bowling", "speciality", "specialty", "ಪಾತ್ರ", "ಸ್ಥಾನ", "ವಿಭಾಗ"
            ]));

          return {
            id: i + 1,
            name:         findValue(row, ["player name", "playerName", "name", "player", "ಆಟಗಾರನ ಹೆಸರು"]) || "PLAYER NAME",
            role: r,
            category: normalizeCategory(findValue(row, ["year", "yer", "batch", "class", "category", "ವರ್ಷ", "ವರ್ಗ"])),
            age:         Number(calcAge) || Number(rawAge) || 0,
            dob:          dobVal ? (dobVal instanceof Date ? dobVal.toLocaleDateString() : String(dobVal)) : "",
            mobile:       findValue(row, ["phonenumebr", "mobile", "phone", "contact", "ಮೊಬೈಲ್", "ದೂರವಾಣಿ"]) || "-",
            battingStyle: findValue(row, ["batting", "battingStyle", "style", "ಬ್ಯಾಟಿಂಗ್"]) || "Right Hand",
            bowlingStyle: findValue(row, ["bowling", "bowlingStyle", "ಬೌಲಿಂಗ್"]) || "-",
            village:      findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
            basePrice:    config.auctionMode === "points" ? (r === "All-Rounder" ? rulesConfig.basePrice.allRounder : rulesConfig.basePrice.batsman) : (Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || config.defaultBasePrice),
            imageUrl:     proxyUrl(rawUrl),   // shows instantly via proxy
            imageOriginalUrl: rawUrl,     // kept for S3 conversion later
            imageLoading: false,          // no loading state needed anymore!
            status:       "available",
          };
        });

        setPlayers(imported);
        setOriginalPlayers(imported);
        setErrors({});

        // S3 conversion runs silently — user already sees images via proxy
        setTimeout(() => fixPlayerImages(imported), 1000);

      } catch (err) { 
        console.error(err);
        alert("Invalid player file format"); 
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Launch ─────────────────────────────────────────────────
  const launchAuction = async () => {
    setLaunching(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          auctionMode: config.auctionMode || "money",
          squadMinPlayers: config.squadMinPlayers || 1,
          squadMaxPlayers: config.squadMaxPlayers || config.squadSize || 15,
          teams,
          players: [
            ...icons.filter(i => i.name && i.name !== "To be confirmed").map(p => ({ 
              ...p, 
              isIcon: true, 
              status: "sold", 
              soldPrice: (config.auctionMode === 'points' && p.iconRole === 'retained') 
                ? rulesConfig.retention.costPerPlayer 
                : 0 
            })),
            ...players,
          ],
        }),
      });
      const data = await res.json();
      if (data.tournamentId || data._id) {
        const tid = data.tournamentId || data._id;

        // Save rules for points-based auctions (fire-and-forget — non-blocking)
        if (config.auctionMode === "points") {
          const effectiveRules = {
            ...rulesConfig,
            budget: { ...rulesConfig.budget, total: config.baseBudget, type: "points" },
            squad:  {
              minPlayers: config.squadMinPlayers || rulesConfig.squad?.minPlayers || 1,
              maxPlayers: config.squadMaxPlayers || rulesConfig.squad?.maxPlayers || 15,
            },
          };
          fetch(`${API_URL}/api/rules/${tid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: effectiveRules }),
          }).catch(err => console.warn("[RULES] Save failed (non-fatal):", err.message));
        }

        fullReset();
        router.push(`/live-auction?id=${tid}`);
      } else {
        alert("Server error: " + (data.message || "Unknown error"));
      }
    } catch {
      alert("Could not reach the backend. Make sure the server is running.");
    } finally {
      setLaunching(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0F2A] rounded-2xl border border-white/10 overflow-hidden">

      {/* Global Reset */}
      <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-0">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">🏗️ Auction Creation Wizard</h1>
          <p className="text-slate-500 text-xs mt-0.5">All changes are auto-saved locally</p>
        </div>
        <button onClick={fullReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400
            bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 transition-all">
          <RefreshCw className="w-3 h-3" /> Reset All
        </button>
      </div>

      <ProgressBar step={step} />

      {/* Step separator */}
      <div className="h-px bg-white/5 mx-6 mt-6" />

      {/* ── STEP 1: Tournament Info ── */}
      {step === 1 && (
        <StepCard step={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-1">
              <Field label="Tournament Name *" error={errors.name}>
                <input className={inputCls(errors.name)} value={config.name}
                  onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Parameshwar Cup 2026" />
              </Field>
            </div>

            <div className="md:col-span-1">
              <Field label="Organizer Name" hint="Display name of the hosting body">
                <input className={inputCls(false)} value={config.organizerName}
                  onChange={e => setConfig(p => ({ ...p, organizerName: e.target.value }))}
                  placeholder="e.g. Lakshmish Cricket Club" />
              </Field>
            </div>

            {/* ── TOURNAMENT LOGO UPLOAD ── */}
            <div className="md:col-span-2">
                 <Field label="Tournament / Organizer Logo" hint="Shown on posters, overlays and dashboards (Ideal: Transparent PNG)">
                    <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[50px] pointer-events-none" />
                        
                        <div className="relative w-24 h-24 shrink-0 bg-[#0B0F2A] rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all hover:border-violet-500/30">
                            {config.organizerLogo ? (
                                <img src={config.organizerLogo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Trophy className="w-8 h-8 text-slate-700" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-white animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-3">
                            <input 
                              type="file" 
                              accept="image/*" 
                              id="org-logo" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(e.target.files[0], (url) => setConfig(p => ({ ...p, organizerLogo: url })), "tournaments")} 
                            />
                            <label 
                              htmlFor="org-logo"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
                            >
                                <Upload className="w-3.5 h-3.5" /> {config.organizerLogo ? "Change Logo" : "Upload Brand Logo"}
                            </label>
                            {config.organizerLogo && (
                                <button 
                                  onClick={() => setConfig(p => ({ ...p, organizerLogo: "" }))}
                                  className="ml-3 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
                                >
                                   Remove
                                </button>
                            )}
                            <p className="text-[9px] text-slate-500 font-medium italic underline underline-offset-4 decoration-slate-800">
                                This logo acts as the primary visual identity for the entire tournament.
                            </p>
                        </div>
                    </div>
                 </Field>
            </div>

            {/* ── Auction Type (Live / Demo) ── */}
            <Field label="Auction Mode Type *">
              <select className={inputCls(false)} value={config.auctionType}
                onChange={e => setConfig(p => ({ ...p, auctionType: e.target.value }))}>
                <option value="live">🔴 Live Auction</option>
                <option value="demo">🟡 Demo / Practice</option>
              </select>
            </Field>

            {/* ── Auction Date ── */}
            <Field label="Auction Date" hint="Optional planning reference">
              <input type="date" className={inputCls(false)} value={config.auctionDate}
                onChange={e => setConfig(p => ({ ...p, auctionDate: e.target.value }))} />
            </Field>

            {/* ── NEW: Auction Currency Mode ── */}
            <div className="md:col-span-2">
              <Field label="Auction Currency Mode *"
                hint={config.auctionMode === 'points' ? 'Budgets and bids will be expressed in Points, not ₹' : 'Standard money-based auction (₹ INR)'}>
                <div className="grid grid-cols-2 gap-3">
                  {[{ val: 'money', icon: '💰', title: 'Money (₹)', desc: 'INR-based bidding' },
                    { val: 'points', icon: '⚡', title: 'Points', desc: 'Point-based bidding' }].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setConfig(p => ({
                        ...p,
                        auctionMode: opt.val,
                        baseBudget: opt.val === 'points' ? 200 : 10000,
                        defaultBasePrice: opt.val === 'points' ? 2 : 100,
                      }))}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        config.auctionMode === opt.val
                          ? 'border-violet-500 bg-violet-500/15 text-white shadow-[0_0_16px_rgba(124,58,237,0.35)]'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div className="text-left">
                        <p className="font-black text-sm">{opt.title}</p>
                        <p className="text-[10px] font-normal opacity-60">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Number of Teams *" error={errors.numTeams}>
              <input type="number" min={2} max={30} className={inputCls(errors.numTeams)}
                value={config.numTeams}
                onChange={e => setConfig(p => ({ ...p, numTeams: Number(e.target.value) || 0 }))} />
            </Field>

            <Field label="Captain, VC & Retained Players per Team *" error={errors.iconsPerTeam}
              hint="Pre-retained / Special designated players per team">
              <input type="number" min={0} max={10} className={inputCls(errors.iconsPerTeam)}
                value={config.iconsPerTeam}
                onChange={e => setConfig(p => ({ ...p, iconsPerTeam: Number(e.target.value) || 0 }))} />
            </Field>

            {/* ── Budget — label/symbol adapts to auctionMode ── */}
            <Field
              label={config.auctionMode === 'points' ? 'Team Budget (Points) *' : 'Team Budget (₹) *'}
              error={errors.baseBudget}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-black pointer-events-none select-none">
                  {config.auctionMode === 'points' ? 'Pts' : '₹'}
                </span>
                <input type="number" min={1}
                  className={`${inputCls(errors.baseBudget)} pl-10`}
                  value={config.baseBudget}
                  onChange={e => setConfig(p => ({ ...p, baseBudget: Number(e.target.value) || 0 }))} />
              </div>
            </Field>

            {config.auctionMode === 'money' && (
              <Field
                label='Default Base Price (₹) *'
                error={errors.defaultBasePrice}
                hint="Used when player base price is missing">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-black pointer-events-none select-none">
                    ₹
                  </span>
                  <input type="number" min={1}
                    className={`${inputCls(errors.defaultBasePrice)} pl-10`}
                    value={config.defaultBasePrice}
                    onChange={e => setConfig(p => ({ ...p, defaultBasePrice: Number(e.target.value) || 0 }))} />
                </div>
              </Field>
            )}

            {/* ── NEW: Squad Size Constraints ── */}
            <div className="md:col-span-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 px-0.5">Squad Configuration</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Total Squad Size *" error={errors.squadSize}
                  hint="Max roster incl. icons">
                  <input type="number" min={1} className={inputCls(errors.squadSize)}
                    value={config.squadSize}
                    onChange={e => setConfig(p => ({ ...p, squadSize: Number(e.target.value) || 0 }))} />
                </Field>
                <Field label="Min Players per Team" hint="Soft lower limit">
                  <input type="number" min={1} className={inputCls(false)}
                    value={config.squadMinPlayers}
                    onChange={e => setConfig(p => ({ ...p, squadMinPlayers: Number(e.target.value) || 1 }))} />
                </Field>
                <Field label="Max Players per Team" hint="Hard upper limit">
                  <input type="number" min={1} className={inputCls(false)}
                    value={config.squadMaxPlayers}
                    onChange={e => setConfig(p => ({ ...p, squadMaxPlayers: Number(e.target.value) || 15 }))} />
                </Field>
              </div>
            </div>
          </div>

          {/* Advanced Rules (only for points-based auctions) */}
          {config.auctionMode === "points" && (
            <div>
              <div className="h-px bg-white/5 my-2" />
              <RulesConfigPanel
                auctionMode={config.auctionMode}
                config={rulesConfig}
                onChange={setRulesConfig}
              />
            </div>
          )}

          {/* Summary preview */}
          <div className="rounded-2xl bg-violet-500/5 border border-violet-500/15 p-5 grid grid-cols-3 gap-4">
            {[
              ["Total Teams",   config.numTeams],
              ["Total Icons",   config.numTeams * config.iconsPerTeam],
              ["Budget / Team", config.auctionMode === 'points'
                ? `${Number(config.baseBudget).toLocaleString()} Pts`
                : `₹${(config.baseBudget).toLocaleString()}`
              ],
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black text-white">{val}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </StepCard>
      )}

      {/* ── STEP 2: Teams ── */}
      {step === 2 && (
        <StepCard step={2} onReset={() => {
          setTeams(Array.from({ length: config.numTeams }, (_, i) => ({
            name: `Team ${i+1}`, shortName: `T${i+1}`, logoUrl: "", color: "#7c3aed"
          })));
        }} resetLabel="Reset Teams">
          {/* Bulk upload */}
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-dashed border-violet-500/30
              bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer transition-all group">
              <Upload className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-violet-400">Bulk Upload Teams (Excel / CSV)</span>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleTeamsExcel} />
            </label>

            {converting && (
              <div className="px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl animate-pulse flex items-center gap-2">
                 <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                 <span className="text-[10px] font-black text-violet-400 uppercase">Converting Images...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {teams.map((team, i) => (
              <div key={i} className={`bg-white/[0.03] border ${errors.teams?.[i]?.name || errors.teams?.[i]?.shortName ? "border-red-500/40" : "border-white/10"} rounded-2xl p-5 flex items-center gap-4`}>
                {/* Logo */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer hover:border-violet-500/50 transition-all shrink-0 group">
                  {team.logoUrl
                    ? <img src={team.logoUrl} alt="logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl font-black"
                        style={{ background: team.color + "33", color: team.color }}>
                        {team.name?.[0] || "T"}
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditTarget({ type: "team", index: i, url: team.logoUrl });
                    }}>
                    <Maximize className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    placeholder="Team Name *"
                    value={team.name}
                    onChange={e => {
                      const nt = [...teams]; nt[i].name = e.target.value; setTeams(nt);
                      setErrors(p => ({ ...p, teams: p.teams?.map((te, idx) => idx === i ? { ...te, name: false } : te) }));
                    }}
                    className={`w-full bg-transparent border-b ${errors.teams?.[i]?.name ? "border-red-500" : "border-white/10"} py-1 font-black text-white text-sm focus:border-violet-500 outline-none placeholder:text-slate-600 transition-colors`}
                  />
                  <input
                    placeholder="Short Code (e.g. CSK) *"
                    value={team.shortName || ""}
                    maxLength={5}
                    onChange={e => {
                      const nt = [...teams]; nt[i].shortName = e.target.value.toUpperCase(); setTeams(nt);
                    }}
                    className={`w-full bg-transparent border-b ${errors.teams?.[i]?.shortName ? "border-red-500" : "border-white/10"} py-1 font-bold text-slate-300 text-xs focus:border-violet-500 outline-none placeholder:text-slate-600 transition-colors`}
                  />
                </div>
              </div>
            ))}
          </div>
        </StepCard>
      )}

      {/* ── STEP 3: Icon Players ── */}
      {step === 3 && (
        <StepCard step={3} onReset={() => {
          // Reset just generates C & VC
          setIcons(teams.flatMap((t, ti) => [
            { name: "To be confirmed", role: "All-Rounder", category: "1st year", iconRole: "captain", teamIdx: ti, team: t.name, applicationId: "-", mobile: "-" },
            { name: "To be confirmed", role: "All-Rounder", category: "1st year", iconRole: "viceCaptain", teamIdx: ti, team: t.name, applicationId: "-", mobile: "-" }
          ]));
        }} resetLabel="Reset Icons">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">Icon Players</h3>
            <button
              onClick={() => setIcons([])}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              title="Clear all icons to import new CSV"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Icons
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            {parsedData && (
               <div className="flex-1 py-3 px-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Using data from team upload</h4>
                    <p className="text-[9px] text-emerald-500/70 font-bold">Icons were automatically extracted from your file</p>
                  </div>
               </div>
            )}
            
            <label className="flex-1 flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer transition-all group">
              <Upload className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-violet-400">Bulk Upload Icons (Excel / CSV)</span>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleIconsExcel} />
            </label>

            {converting ? (
              <div className="px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl animate-pulse flex items-center gap-2">
                 <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                 <span className="text-[10px] font-black text-violet-400 uppercase">Processing...</span>
              </div>
            ) : (
            icons.some(i => i.imageOriginalUrl?.includes("drive.google.com")) && (
                <button onClick={() => fixIconImages()} className="px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 hover:bg-amber-500/20 transition-all">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-400 uppercase">Fix Images</span>
                </button>
              )
            )}
          </div>

          <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {teams.map((team, ti) => {
              const teamIcons = icons.filter(ic => ic.teamIdx === ti);
              if (teamIcons.length === 0) return null;
              return (
                <div key={ti} className="space-y-3">
                  <div className="flex items-center gap-3">
                    {team.logoUrl
                      ? <img src={team.logoUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                      : <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: team.color + "44", color: team.color }}>{team.name?.[0]}</div>
                    }
                    <span className="font-black text-sm text-white uppercase tracking-wide">{team.name}</span>
                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{teamIcons.length} icon{teamIcons.length > 1 ? "s" : ""}</span>
                    <button type="button" onClick={() => {
                        const newIcon = { name: "To be confirmed", role: "All-Rounder", category: "1st year", village: "-", age: "-", applicationId: "-", mobile: "-", imageUrl: "", team: team.name, teamIdx: ti, iconRole: null };
                        setIcons([...icons, newIcon]);
                    }} className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase text-violet-400 border border-violet-500/20 hover:bg-violet-500/10 px-2 py-1 rounded transition-colors">
                        <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-2 pl-3 border-l-2" style={{ borderColor: team.color + "55" }}>
                    {teamIcons.map((icon, ii) => {
                      const globalIdx = icons.findIndex((ic, gi) => ic.teamIdx === ti && (icons.filter((x, xi) => x.teamIdx === ti && xi < gi).length === ii));
                      const err = errors.icons?.[globalIdx]?.name;
                      return (
                        <div key={ii} className={`bg-white/[0.03] border ${err ? "border-red-500/40" : "border-white/8"} rounded-xl p-4 flex flex-col md:flex-row gap-4`}>
                          {/* Icon Photo edit */}
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer hover:border-violet-500/50 transition-all shrink-0 group">
                            {icon.imageUrl
                              ? <img src={icon.imageUrl} alt="icon" className="w-full h-full object-cover" />
                              : <div className="text-xl">📸</div>
                            }
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditTarget({ type: "icon", index: globalIdx, url: icon.imageUrl });
                              }}>
                              <Maximize className="w-4 h-4 text-white" />
                            </div>
                            {/* Role badge overlay */}
                            {icon.iconRole && (
                              <div className={`absolute bottom-0 left-0 right-0 text-center text-[8px] font-black uppercase tracking-widest py-0.5
                                ${icon.iconRole === "captain"     ? "bg-amber-500/90 text-black"
                                : icon.iconRole === "viceCaptain" ? "bg-slate-400/90 text-black"
                                : "bg-emerald-600/90 text-white"}`}>
                                {icon.iconRole === "captain" ? "C" : icon.iconRole === "viceCaptain" ? "VC" : "R"}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <input placeholder="Icon Name *" value={icon.name}
                                onChange={e => {
                                  const ni = [...icons]; ni[globalIdx].name = e.target.value; setIcons(ni);
                                }}
                                className={`w-full bg-transparent border-b ${err ? "border-red-500" : "border-white/10"} py-1 font-bold text-white text-sm focus:border-violet-500 outline-none placeholder:text-slate-600 transition-colors`} />
                            </div>
                            <select title="Year" value={icon.category || "1st year"}
                              onChange={e => { const ni = [...icons]; ni[globalIdx].category = e.target.value; setIcons(ni); }}
                              className="bg-[#0B0F2A] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-300 focus:border-violet-500 outline-none">
                              {["1st year","2nd year","3rd year", "4th year"].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <input title="USN / App ID" placeholder="USN" value={icon.applicationId}
                              onChange={e => { 
                                const ni = [...icons]; 
                                ni[globalIdx].applicationId = e.target.value; 
                                ni[globalIdx].category = calculateYearFromUSN(e.target.value); 
                                setIcons(ni); 
                              }}
                              className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-300 focus:border-violet-500 outline-none placeholder:text-slate-600 transition-colors" />
                            <input title="Contact Number" placeholder="Phone" value={icon.mobile}
                              onChange={e => { const ni = [...icons]; ni[globalIdx].mobile = e.target.value; setIcons(ni); }}
                              className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-300 focus:border-violet-500 outline-none placeholder:text-slate-600 transition-colors" />
                            {/* USN Display Only - Not used for auction assignment */}
                            {icon.applicationId && icon.applicationId !== "-" && (
                              <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-400">
                                USN: {icon.applicationId}
                              </div>
                            )}
                            
                            {/* ── Icon Assignment pills ── */}
                            <div className="col-span-2 md:col-span-4 flex items-center gap-2 pt-1 border-t border-white/5 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0">Assignment:</span>
                              {[
                                { val: "captain",     label: "C",   fullLabel: "Captain",      color: "amber" },
                                { val: "viceCaptain", label: "VC",  fullLabel: "Vice Captain",  color: "slate" },
                                { val: "retained",   label: "R",   fullLabel: "Retained",      color: "emerald" },
                              ].map(opt => {
                                const active = icon.iconRole === opt.val;
                                const colorMap = {
                                  amber:   active ? "bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"   : "border-white/10 text-slate-500 hover:border-amber-400/50 hover:text-amber-400",
                                  slate:   active ? "bg-slate-400/20 border-slate-300 text-slate-200 shadow-[0_0_10px_rgba(148,163,184,0.25)]" : "border-white/10 text-slate-500 hover:border-slate-400/50 hover:text-slate-300",
                                  emerald: active ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.25)]" : "border-white/10 text-slate-500 hover:border-emerald-400/50 hover:text-emerald-400",
                                };
                                return (
                                  <button
                                    key={opt.val}
                                    type="button"
                                    title={opt.fullLabel}
                                    onClick={() => {
                                      const ni = [...icons];
                                      if (opt.val === "retained" && ni[globalIdx].iconRole === "retained") {
                                        ni[globalIdx].iconRole = null;
                                      } else {
                                        ni[globalIdx].iconRole = opt.val;
                                      }
                                      setIcons(ni);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${colorMap[opt.color]}`}
                                  >
                                    <span>{opt.label}</span>
                                    <span className="hidden md:inline opacity-70">{opt.fullLabel}</span>
                                  </button>
                                );
                              })}
                              {!icon.iconRole && (
                                <span className="text-[9px] text-slate-600 italic">None</span>
                              )}
                              
                              <button title="Delete Item" type="button" onClick={() => {
                                 setIcons(icons.filter((_, idx) => idx !== globalIdx));
                              }} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 transition-colors shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </StepCard>
      )}

      {/* ── STEP 4: Player Pool ── */}
      {step === 4 && (
        <StepCard step={4}>
          {players.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-4 w-full py-16 rounded-2xl
              border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="font-black text-violet-300 text-lg">Upload Player Pool</p>
                <p className="text-slate-500 text-sm mt-1">Supports .xlsx · .xls · .csv</p>
                <p className="text-slate-600 text-xs mt-2">Columns: Name, Role, Age, DOB, Batting Style, Bowling Style, Village, Base Price, Image URL</p>
              </div>
              {errors.players && <p className="text-red-400 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.players}</p>}
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handlePlayersExcel} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-300 text-sm">{players.length} players imported</span>
                  </div>
                  
                  {converting ? (
                    <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-xl animate-pulse">
                      <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                      <span className="font-bold text-violet-300 text-sm">Converting Images to S3...</span>
                    </div>
                  ) : (
                    players.some(p => p.imageOriginalUrl?.includes("drive.google.com")) && (
                      <button onClick={() => fixPlayerImages()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all shadow-lg shadow-amber-500/5">
                        <Zap className="w-3 h-3" /> Fix Drive Images
                      </button>
                    )
                  )}
                </div>
                
                {players.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={jumblePlayers} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-lg shadow-cyan-500/5">
                      <Shuffle className="w-4 h-4" /> Jumble
                    </button>
                    {originalPlayers.length > 0 && (
                      <button onClick={revertJumble} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-white/10 text-slate-400 hover:bg-white/5 transition-all">
                        <RefreshCw className="w-3 h-3" /> Revert
                      </button>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-violet-400
                  bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 cursor-pointer transition-all">
                  <RefreshCw className="w-3 h-3" /> Re-upload
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handlePlayersExcel} />
                </label>
              </div>

              {/* Preview table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className={`grid px-5 py-3 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/10 gap-3 ${config.auctionMode === 'points' ? "grid-cols-[60px_40px_100px_1fr_1fr_1fr_120px_50px]" : "grid-cols-[60px_60px_1fr_1fr_1fr_80px_1fr_120px_50px]"}`}>
                  <span>Photo</span>
                  {config.auctionMode === 'points' && <span>Sl No</span>}
                  <span>{config.auctionMode === 'points' ? "USN" : "App ID"}</span>
                  <span>Name</span>
                  <span>Mobile</span>
                  <span>Role</span>
                  {config.auctionMode !== 'points' && <span className="text-center">Age</span>}
                  {config.auctionMode !== 'points' && <span>Village</span>}
                  <span className="text-right">Base Price</span>
                  <span></span>
                </div>
                <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                  {players.map((p, i) => {
                    const nameError = hasNonEng(p.name);
                    const villageError = hasNonEng(p.village);
                    const rowError = nameError || villageError;

                    return (
                      <div key={i} className={`grid px-5 py-2.5 items-center transition-colors gap-3 ${config.auctionMode === 'points' ? "grid-cols-[60px_40px_100px_1fr_1fr_1fr_120px_50px]" : "grid-cols-[60px_60px_1fr_1fr_1fr_80px_1fr_120px_50px]"}
                        ${rowError ? "bg-red-500/[0.15] border-l-2 border-l-red-500" : "hover:bg-white/[0.02]"}`}>
                        {/* Photo Column */}
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer hover:border-violet-500/50 transition-all shrink-0 group">
                        {p.imageLoading ? (
                          // Shimmer placeholder while S3 is processing
                          <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 
                            animate-pulse rounded" />
                        ) : p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-sm">📸</div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditTarget({ type: "player", index: i, url: p.imageUrl });
                          }}>
                          <Maximize className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {config.auctionMode === 'points' && (
                        <div className="text-[11px] font-black text-slate-500 text-center">
                          {p.id}
                        </div>
                      )}

                      {/* Name Editable */}
                      <input value={p.name}
                        onChange={e => { const np = [...players]; np[i].name = e.target.value; setPlayers(np); }}
                        className={`bg-transparent border-b border-transparent hover:border-white/10 focus:border-violet-500 text-sm font-bold outline-none w-full py-1 ${hasNonEng(p.name) ? "text-red-500" : "text-white"}`} />

                      {/* Mobile Column */}
                      <div className="text-[10px] font-black text-slate-400">
                        {p.mobile}
                      </div>

                      {/* Role Editable */}
                      <select value={p.role}
                        onChange={e => { 
                          const np = [...players]; 
                          np[i].role = e.target.value;
                          if (config.auctionMode === 'points') {
                             np[i].basePrice = e.target.value === "All-Rounder" ? rulesConfig.basePrice.allRounder : rulesConfig.basePrice.batsman;
                          }
                          setPlayers(np); 
                        }}
                        className="bg-[#0B0F2A] border border-white/10 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 focus:border-violet-500 outline-none w-full">
                        {["Batsman","Bowler","All-Rounder"].map(v => <option key={v}>{v}</option>)}
                      </select>

                      {/* Age Editable */}
                      {config.auctionMode !== 'points' && (
                        <input value={p.age}
                          onChange={e => { const np = [...players]; np[i].age = e.target.value; setPlayers(np); }}
                          className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-violet-500 text-xs text-slate-400 font-semibold text-center outline-none w-full py-1" />
                      )}

                      {/* Village Editable */}
                      {config.auctionMode !== 'points' && (
                        <input value={p.village}
                          onChange={e => { const np = [...players]; np[i].village = e.target.value; setPlayers(np); }}
                          className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-violet-500 text-xs text-slate-500 outline-none w-full py-1" />
                      )}

                      {/* Price Editable */}
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-violet-500 text-[10px] font-black">{config.auctionMode === 'points' ? 'PTS' : '₹'}</span>
                        <input type="number" value={p.basePrice}
                          onChange={e => { const np = [...players]; np[i].basePrice = Number(e.target.value); setPlayers(np); }}
                          className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-violet-500 text-xs text-violet-400 font-bold text-right outline-none w-14 py-1" />
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${p.name}?`)) {
                            setPlayers(prev => {
                              const updated = prev.filter((_, idx) => idx !== i);
                              // Re-index all serial numbers sequentially
                              return updated.map((pl, seq) => ({ ...pl, id: seq + 1 }));
                            });
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center group/del"
                        title="Delete Player"
                      >
                        <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                      </button>
                      </div>
                    );
                  })}
                  {players.length === 0 && (
                    <div className="py-20 text-center text-slate-600 font-semibold italic">
                      Upload an Excel or CSV file to populate the player pool
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* ── STEP 5: Review & Launch ── */}
      {step === 5 && (
        <StepCard step={5}>
          <div className="space-y-5">
            {/* Tournament header */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-500/10 border border-violet-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">🏆</div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tournament</p>
                  <h3 className="text-xl font-black text-white">{config.name}</h3>
                </div>
                <div className="ml-auto px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest
                  bg-red-500/15 border border-red-500/25 text-red-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {config.auctionType === "live" ? "Live" : "Demo"}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Teams",          val: config.numTeams,                icon: "👥" },
                  { label: "Icons",          val: icons.filter(i => i.name).length, icon: "⭐" },
                  { label: "Auction Players", val: players.length,                icon: "🧍" },
                  { label: "Budget / Team",
                    val: config.auctionMode === 'points'
                      ? `${Number(config.baseBudget).toLocaleString()} Pts`
                      : `₹${Number(config.baseBudget).toLocaleString()}`,
                    icon: config.auctionMode === 'points' ? "⚡" : "💰" },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="bg-white/[0.04] rounded-xl p-4 text-center border border-white/8">
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="text-lg font-black text-white">{val}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Teams preview */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Teams & Available Budget</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {teams.map((t, i) => {
                  const teamIcons = icons.filter(ic => ic.teamIdx === i);
                  const retainedCount = teamIcons.filter(ic => ic.iconRole === "retained").length;
                  const deducted = config.auctionMode === 'points' ? (retainedCount * rulesConfig.retention.costPerPlayer) : 0;
                  const pointsLabel = config.auctionMode === 'points' ? "Pts" : "₹";
                  return (
                    <div key={i} className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.logoUrl
                          ? <img src={t.logoUrl} className="w-8 h-8 rounded object-cover" alt="" />
                          : <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black" style={{ background: t.color + "44", color: t.color }}>{t.name?.[0]}</div>
                        }
                        <div>
                          <p className="text-sm font-bold text-white">{t.shortName || t.name}</p>
                          {retainedCount > 0 && (
                            <p className="text-[10px] text-slate-500 bg-white/5 inline-block px-1.5 py-0.5 rounded uppercase mt-0.5">
                              {retainedCount} Retained
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {deducted > 0 && <p className="text-[10px] text-red-400 font-bold mb-0.5">-{deducted} {pointsLabel} Deducted</p>}
                        <p className="text-sm font-black text-emerald-400">{config.baseBudget - deducted} {pointsLabel} Ready</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">Ready to launch?</p>
                <p className="text-xs text-slate-400 mt-0.5">This will create the tournament, teams, and players in the database and redirect you to the live auction control room.</p>
              </div>
            </div>
          </div>
        </StepCard>
      )}

      <NavButtons step={step} onPrev={goPrev} onNext={goNext} onLaunch={launchAuction} launching={launching} />

      {/* Image Editor Modal */}
      {editTarget && (
        <ImageEditModal
          title={`Edit ${editTarget.type === 'team' ? 'Team Logo' : 'Player Photo'}`}
          initialImage={editTarget.url}
          onClose={() => setEditTarget(null)}
          onSave={async (file) => {
            const folder = editTarget.type === 'team' ? 'teams' : 'players';
            await handleImageUpload(file, (url) => {
              if (editTarget.type === 'team') {
                const nt = [...teams]; nt[editTarget.index].logoUrl = url; setTeams(nt);
              } else if (editTarget.type === 'icon') {
                const ni = [...icons]; ni[editTarget.index].imageUrl = url; setIcons(ni);
              } else if (editTarget.type === 'player') {
                const np = [...players]; np[editTarget.index].imageUrl = url; setPlayers(np);
              }
            }, folder);
          }}
        />
      )}
    </div>
  );
}
