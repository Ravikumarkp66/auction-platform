"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, ShieldAlert, Sparkles, Plus, Trash2 } from "lucide-react";

export default function QuickMatchWizard() {
  const router = useRouter();
  
  // Wizard state
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState("kabaddi");
  const [name, setName] = useState("Quick Match");
  const [venue, setVenue] = useState("Lakshmish Sports Arena");
  const [firstHalfMinutes, setFirstHalfMinutes] = useState(10);
  const [secondHalfMinutes, setSecondHalfMinutes] = useState(10);
  const [clockMode, setClockMode] = useState("SMART_CLUTCH");
  const [clutchMinutes, setClutchMinutes] = useState(2);
  
  // Teams state
  const [teamAName, setTeamAName] = useState("Tigers");
  const [teamAColor, setTeamAColor] = useState("#ef4444"); // Red
  const [teamAPlayers, setTeamAPlayers] = useState([
    { name: "Ravi Raider", jerseyNumber: "7", role: "Raider" },
    { name: "Arun Defender", jerseyNumber: "10", role: "Defender" },
    { name: "Kiran AllRound", jerseyNumber: "9", role: "All Rounder" },
  ]);

  const [teamBName, setTeamBName] = useState("Warriors");
  const [teamBColor, setTeamBColor] = useState("#3b82f6"); // Blue
  const [teamBPlayers, setTeamBPlayers] = useState([
    { name: "Vijay Raider", jerseyNumber: "18", role: "Raider" },
    { name: "Shankar Defender", jerseyNumber: "4", role: "Defender" },
    { name: "Ramesh AllRound", jerseyNumber: "3", role: "All Rounder" },
  ]);

  // Input states for adding players manually
  const [newPlayerA, setNewPlayerA] = useState({ name: "", jerseyNumber: "", role: "Raider" });
  const [newPlayerB, setNewPlayerB] = useState({ name: "", jerseyNumber: "", role: "Raider" });

  const [submitting, setSubmitting] = useState(false);

  // Auto-generation helper
  const handleAutoGenerateRosters = () => {
    // 7 players for Team A
    setTeamAPlayers([
      { name: "Ravi K P", jerseyNumber: "7", role: "Raider" },
      { name: "Anand Kumar", jerseyNumber: "10", role: "Defender" },
      { name: "Darshan Gowda", jerseyNumber: "99", role: "All Rounder" },
      { name: "Chethan Gowda", jerseyNumber: "11", role: "Raider" },
      { name: "Lokesh Naik", jerseyNumber: "3", role: "Defender" },
      { name: "Manu Prasad", jerseyNumber: "45", role: "All Rounder" },
      { name: "Karthik Raj", jerseyNumber: "8", role: "Defender" }
    ]);

    // 7 players for Team B
    setTeamBPlayers([
      { name: "Vijay Gowda", jerseyNumber: "18", role: "Raider" },
      { name: "Shanthi Kumar", jerseyNumber: "4", role: "Defender" },
      { name: "Girish Prasad", jerseyNumber: "3", role: "All Rounder" },
      { name: "Suresh Naik", jerseyNumber: "9", role: "Raider" },
      { name: "Satish Gowda", jerseyNumber: "5", role: "Defender" },
      { name: "Prashanth Shetty", jerseyNumber: "2", role: "All Rounder" },
      { name: "Nitin Kumar", jerseyNumber: "1", role: "Defender" }
    ]);
  };

  const addPlayerToTeamA = () => {
    if (!newPlayerA.name.trim()) return;
    setTeamAPlayers([...teamAPlayers, { ...newPlayerA }]);
    setNewPlayerA({ name: "", jerseyNumber: "", role: "Raider" });
  };

  const removePlayerFromTeamA = (index) => {
    setTeamAPlayers(teamAPlayers.filter((_, i) => i !== index));
  };

  const addPlayerToTeamB = () => {
    if (!newPlayerB.name.trim()) return;
    setTeamBPlayers([...teamBPlayers, { ...newPlayerB }]);
    setNewPlayerB({ name: "", jerseyNumber: "", role: "Raider" });
  };

  const removePlayerFromTeamB = (index) => {
    setTeamBPlayers(teamBPlayers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (teamAPlayers.length < 3 || teamBPlayers.length < 3) {
      alert("Please add at least 3 players per team to start the scorer panel.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/sports-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          name,
          venue,
          teamA: {
            name: teamAName,
            color: teamAColor,
            players: teamAPlayers
          },
          teamB: {
            name: teamBName,
            color: teamBColor,
            players: teamBPlayers
          },
          matchClock: {
            firstHalfDuration: Number(firstHalfMinutes) * 60,
            secondHalfDuration: Number(secondHalfMinutes) * 60,
            mode: clockMode,
            clutchThreshold: Number(clutchMinutes) * 60
          }
        })
      });

      if (res.ok) {
        const createdMatch = await res.json();
        
        // Immediately trigger Match status update to live
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/sports-matches/${createdMatch._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live" })
        });

        router.push(`/admin/sports/score/${createdMatch._id}`);
      } else {
        alert("Failed to initialize quick match. Server error.");
      }
    } catch (err) {
      console.error(err);
      alert("Error starting scorer panel. Check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 text-white pb-20">
      {/* Back Button */}
      <Link href="/admin/sports" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-6">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Step Indicators */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${step >= 1 ? "bg-violet-500" : "bg-slate-800"}`} />
        <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${step >= 2 ? "bg-violet-500" : "bg-slate-800"}`} />
        <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${step >= 3 ? "bg-violet-500" : "bg-slate-800"}`} />
      </div>

      <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl backdrop-blur-2xl">
        
        {/* ── STEP 1: SPORT SELECTION ── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-black mb-1">STEP 1 — SELECT SPORT & SETTINGS</h2>
            <p className="text-slate-400 text-sm mb-6">Choose the sport ruleset and fill basic tournament venue variables.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {/* Kabaddi */}
              <button 
                onClick={() => setSport("kabaddi")}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${sport === "kabaddi" ? "bg-violet-600/20 border-violet-500" : "bg-slate-900/40 border-slate-850 hover:bg-slate-900/80"}`}
              >
                <span className="text-3xl">🤼</span>
                <span className="font-bold text-sm">Kabaddi</span>
              </button>
              
              {/* Cricket */}
              <button 
                disabled
                className="p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 bg-slate-900/10 border-slate-900 opacity-40 cursor-not-allowed"
                title="Use original scorer panel for cricket auctions"
              >
                <span className="text-3xl">🏏</span>
                <span className="font-bold text-sm">Cricket (Soon)</span>
              </button>

              {/* Volleyball */}
              <button 
                disabled
                className="p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 bg-slate-900/10 border-slate-900 opacity-40 cursor-not-allowed"
              >
                <span className="text-3xl">🏐</span>
                <span className="font-bold text-sm">Volleyball (Soon)</span>
              </button>

              {/* Football */}
              <button 
                disabled
                className="p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 bg-slate-900/10 border-slate-900 opacity-40 cursor-not-allowed"
              >
                <span className="text-3xl">⚽</span>
                <span className="font-bold text-sm">Football (Soon)</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-sm font-semibold"
                  placeholder="Eg: Koratagere Kabaddi League Finals 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Arena / Venue</label>
                <input 
                  type="text" 
                  value={venue} 
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-sm font-semibold"
                  placeholder="Eg: Town Stadium, Bengaluru"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">First Half Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={firstHalfMinutes}
                    onChange={(e) => setFirstHalfMinutes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Second Half Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={secondHalfMinutes}
                    onChange={(e) => setSecondHalfMinutes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Official Clock Mode</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    ["CONTINUOUS", "Continuous Clock"],
                    ["STOP_EVERY_RAID", "Stop After Every Raid"],
                    ["SMART_CLUTCH", "Smart Clutch Clock"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setClockMode(value)}
                      className={`rounded-xl border px-3 py-3 text-xs font-black uppercase tracking-wider transition ${clockMode === value ? "border-violet-400 bg-violet-500/20 text-white" : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {clockMode === "SMART_CLUTCH" && (
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Stop official timer below this many minutes</label>
                    <input
                      type="number"
                      min="0"
                      value={clutchMinutes}
                      onChange={(e) => setClutchMinutes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-sm font-semibold"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button 
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm uppercase tracking-wide rounded-xl transition"
              >
                Continue Setup
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: TEAMS IDENTITIES ── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black mb-1">STEP 2 — TEAM IDENTITY SETUPS</h2>
            <p className="text-slate-400 text-sm mb-6">Define both team names and custom stadium display colors.</p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Team A */}
              <div className="space-y-4 bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
                <h3 className="font-bold border-b border-slate-850 pb-2 text-violet-400">🟥 TEAM A (Home)</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                  <input 
                    type="text" 
                    value={teamAName} 
                    onChange={(e) => setTeamAName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Theme Color</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={teamAColor} 
                      onChange={(e) => setTeamAColor(e.target.value)}
                      className="w-12 h-10 bg-transparent cursor-pointer border-0"
                    />
                    <input 
                      type="text" 
                      value={teamAColor} 
                      onChange={(e) => setTeamAColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs font-mono uppercase text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-4 bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
                <h3 className="font-bold border-b border-slate-850 pb-2 text-violet-400">🟦 TEAM B (Away)</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                  <input 
                    type="text" 
                    value={teamBName} 
                    onChange={(e) => setTeamBName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Theme Color</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={teamBColor} 
                      onChange={(e) => setTeamBColor(e.target.value)}
                      className="w-12 h-10 bg-transparent cursor-pointer border-0"
                    />
                    <input 
                      type="text" 
                      value={teamBColor} 
                      onChange={(e) => setTeamBColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs font-mono uppercase text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button 
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-slate-700 hover:border-slate-500 rounded-xl font-bold text-xs uppercase"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm uppercase tracking-wide rounded-xl transition"
              >
                Add Players Roster
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PLAYERS ROSTERS ── */}
        {step === 3 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black">STEP 3 — SQUAD & PLAYERS SETUP</h2>
                <p className="text-slate-400 text-sm">Add active players manually or generate pre-populated rosters.</p>
              </div>
              <button 
                onClick={handleAutoGenerateRosters}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500/25 to-yellow-600/25 border border-yellow-500/35 hover:from-amber-500/40 hover:to-yellow-600/40 text-yellow-400 text-xs font-black uppercase tracking-wider rounded-xl transition"
              >
                <Sparkles size={14} className="fill-current" /> Auto-generate squads
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Team A Roster */}
              <div className="space-y-4">
                <h3 className="font-bold flex items-center justify-between">
                  <span>{teamAName} ({teamAPlayers.length} players)</span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: teamAColor }} />
                </h3>
                
                {/* Roster list */}
                <div className="max-h-60 overflow-y-auto bg-slate-950/40 rounded-xl p-3 border border-slate-900 divide-y divide-slate-800/40">
                  {teamAPlayers.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-4 text-center">No players registered. Add manually below or auto-generate above.</p>
                  ) : (
                    teamAPlayers.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm font-semibold">
                          #{p.jerseyNumber} - {p.name} <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">{p.role}</span>
                        </span>
                        <button onClick={() => removePlayerFromTeamA(i)} className="text-rose-500 hover:text-rose-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Form to add manually */}
                <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-3 grid grid-cols-6 gap-2">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={newPlayerA.name}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, name: e.target.value })}
                    className="col-span-3 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="J#" 
                    value={newPlayerA.jerseyNumber}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, jerseyNumber: e.target.value })}
                    className="col-span-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none text-center"
                  />
                  <select 
                    value={newPlayerA.role}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, role: e.target.value })}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded px-1 py-1.5 text-[10px] text-slate-400 focus:outline-none font-bold uppercase"
                  >
                    <option value="Raider">Raider</option>
                    <option value="Defender">Defender</option>
                    <option value="All Rounder">All-Rd</option>
                  </select>
                  <button 
                    onClick={addPlayerToTeamA}
                    className="col-span-6 flex items-center justify-center gap-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-black uppercase tracking-wider text-slate-200"
                  >
                    <Plus size={12} /> Add player
                  </button>
                </div>
              </div>

              {/* Team B Roster */}
              <div className="space-y-4">
                <h3 className="font-bold flex items-center justify-between">
                  <span>{teamBName} ({teamBPlayers.length} players)</span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: teamBColor }} />
                </h3>
                
                {/* Roster list */}
                <div className="max-h-60 overflow-y-auto bg-slate-950/40 rounded-xl p-3 border border-slate-900 divide-y divide-slate-800/40">
                  {teamBPlayers.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-4 text-center">No players registered. Add manually below or auto-generate above.</p>
                  ) : (
                    teamBPlayers.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm font-semibold">
                          #{p.jerseyNumber} - {p.name} <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">{p.role}</span>
                        </span>
                        <button onClick={() => removePlayerFromTeamB(i)} className="text-rose-500 hover:text-rose-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Form to add manually */}
                <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-3 grid grid-cols-6 gap-2">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={newPlayerB.name}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, name: e.target.value })}
                    className="col-span-3 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="J#" 
                    value={newPlayerB.jerseyNumber}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, jerseyNumber: e.target.value })}
                    className="col-span-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none text-center"
                  />
                  <select 
                    value={newPlayerB.role}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, role: e.target.value })}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded px-1 py-1.5 text-[10px] text-slate-400 focus:outline-none font-bold uppercase"
                  >
                    <option value="Raider">Raider</option>
                    <option value="Defender">Defender</option>
                    <option value="All Rounder">All-Rd</option>
                  </select>
                  <button 
                    onClick={addPlayerToTeamB}
                    className="col-span-6 flex items-center justify-center gap-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-black uppercase tracking-wider text-slate-200"
                  >
                    <Plus size={12} /> Add player
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button 
                onClick={() => setStep(2)}
                className="px-5 py-3 border border-slate-700 hover:border-slate-500 rounded-xl font-bold text-xs uppercase"
              >
                Back
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition disabled:opacity-50"
              >
                {submitting ? "Initializing..." : "Go Live & Start Scorer"}
                <Play size={14} fill="currentColor" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
