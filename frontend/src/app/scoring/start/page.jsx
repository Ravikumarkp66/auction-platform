"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, XCircle, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OpenMatch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id');
  
  // Basic Match Info
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [scorer, setScorer] = useState("");
  
  // Match Settings
  const [overs, setOvers] = useState(4);
  const [format, setFormat] = useState("T10");
  const [wickets, setWickets] = useState(10);
  const [ballType, setBallType] = useState("Tennis Ball");
  
  // Team Selection State
  const [teams, setTeams] = useState([]);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [selectingSlot, setSelectingSlot] = useState(null); // 'A', 'B', or null

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLocation, setNewTeamLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Active Tournament & Match
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [createdMatchId, setCreatedMatchId] = useState(matchId || null);

  // Toss State
  const [showTossModal, setShowTossModal] = useState(false);
  const [tossWinner, setTossWinner] = useState(null);
  const [tossDecision, setTossDecision] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    setDate(now.toLocaleDateString('en-GB', options));
    
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    setTime(now.toLocaleTimeString('en-US', timeOptions));

    // Fetch Teams and Active Tournament
    const fetchData = async () => {
      try {
        const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/teams`);
        if (teamsRes.ok) setTeams(await teamsRes.json());
        
        const tourRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/tournaments/status/active`);
        if (tourRes.ok) {
          const data = await tourRes.json();
          if (data && data.tournament) setActiveTournamentId(data.tournament._id);
        }

        if (matchId) {
          const matchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match/${matchId}`);
          if (matchRes.ok) {
            const m = await matchRes.json();
            setTeamA(m.teamA);
            setTeamB(m.teamB);
            setVenue(m.venue || "");
            setDate(m.date || "");
            setTime(m.time || "");
            setFormat(m.format || "T10");
            setOvers(m.totalOvers || 4);
            setBallType(m.ballType || "Tennis Ball");
            setScorer(m.scorer || "");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [matchId]);

  const handleSelectTeam = (team) => {
    if (selectingSlot === 'A') setTeamA(team);
    if (selectingSlot === 'B') setTeamB(team);
    setSelectingSlot(null); // close overlay
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    if (!activeTournamentId) {
      alert("No active tournament found. Cannot create team.");
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          shortName: newTeamName.substring(0, 3).toUpperCase(),
          location: newTeamLocation,
          tournamentId: activeTournamentId,
          remainingBudget: 1000000 // default budget
        })
      });
      if (res.ok) {
        const newTeam = await res.json();
        // Add new team to the top of the list so it's immediately visible
        setTeams([newTeam, ...teams]);
        
        // Close ONLY the create modal, keep the Select Team overlay open
        setShowCreateModal(false);
        setNewTeamName("");
        setNewTeamLocation("");
      } else {
        alert("Failed to create team. Check console.");
        console.error(await res.text());
      }
    } catch (err) {
      console.error(err);
      alert("Error creating team.");
    } finally {
      setIsCreating(false);
    }
  };

  const saveMatchData = async () => {
    if (!teamA || !teamB) {
      alert("Please select both Team A and Team B.");
      return null;
    }
    if (!activeTournamentId) {
      alert("No active tournament found. Please create/activate one first.");
      return null;
    }

    try {
      const url = createdMatchId 
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match/${createdMatchId}` 
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match`;
      const method = createdMatchId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: activeTournamentId,
          teamA: teamA._id,
          teamB: teamB._id,
          totalOvers: overs,
          venue,
          date,
          time,
          format,
          ballType,
          scorer
        })
      });

      if (res.ok) {
        const matchData = await res.json();
        setCreatedMatchId(matchData._id);
        return matchData._id;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleSaveFixture = async () => {
    const id = await saveMatchData();
    if (id) {
      router.push('/scoring/matches');
    }
  };

  const handleStartMatchClick = async () => {
    const id = await saveMatchData();
    if (id) {
      setShowTossModal(true);
    }
  };

  const handleStartScoring = async () => {
    if (!tossWinner || !tossDecision) {
      alert("Please select toss winner and decision!");
      return;
    }
    setIsStarting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/match/${createdMatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "live",
          toss: { winner: tossWinner, decision: tossDecision }
        })
      });
      if (res.ok) {
        router.push(`/match/score/${createdMatchId}`);
      }
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  // ── SETTINGS MODAL ──
  if (showSettingsModal) {
    return (
      <div className="min-h-screen bg-black/50 flex flex-col justify-end">
        <div className="bg-white w-full rounded-t-[32px] p-6 pb-10 animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowSettingsModal(false)} className="p-1"><ArrowLeft size={24}/></button>
            <h2 className="text-lg font-bold">Match Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Select Overs */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Select Overs*</h3>
              <input 
                type="number" 
                value={overs} 
                onChange={(e) => setOvers(Number(e.target.value))} 
                className="w-full text-center text-xl font-bold py-2 border-b border-slate-300 mb-4 focus:outline-none"
              />
              <div className="flex justify-between px-2">
                {[10, 20, 30, 40, 50].map(val => (
                  <button key={val} onClick={() => setOvers(val)} className="text-sm font-semibold text-slate-600 hover:text-[#008060]">{val}</button>
                ))}
              </div>
            </div>

            {/* Select Format */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Select Format*</h3>
              <div className="flex flex-wrap gap-3">
                {["T10", "T20", "ONE DAY", "TEST MATCH", "100"].map(fmt => (
                  <button 
                    key={fmt} 
                    onClick={() => setFormat(fmt)}
                    className={`px-4 py-1.5 border rounded font-semibold text-sm transition-colors ${format === fmt ? 'bg-[#008060] text-white border-[#008060]' : 'border-slate-300 text-slate-600'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Wickets */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Wickets</h3>
              <input 
                type="number" 
                value={wickets} 
                onChange={(e) => setWickets(Number(e.target.value))} 
                className="w-full text-center text-xl font-bold py-2 border-b border-slate-300 focus:outline-none"
              />
            </div>

            {/* Ball Type */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Ball Type*</h3>
              <div className="flex flex-wrap gap-3">
                {["Leather Ball", "Tennis Ball", "Vicky Ball", "Sixit Ball", "Willson Ball"].map(bt => (
                  <button 
                    key={bt} 
                    onClick={() => setBallType(bt)}
                    className={`px-4 py-1.5 border rounded font-semibold text-sm transition-colors ${ballType === bt ? 'bg-[#008060] text-white border-[#008060]' : 'border-slate-300 text-slate-600'}`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowSettingsModal(false)}
              className="w-full bg-[#008060] text-white font-bold py-3.5 rounded-xl shadow mt-8"
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SELECT TEAM OVERLAY ──
  if (selectingSlot) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col relative">
        <header className="flex items-center p-4 bg-[#008060] text-white">
          <button onClick={() => setSelectingSlot(null)} className="p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors">
            <X size={24} />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg mr-8">Select Team</h1>
        </header>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800 mb-2">Option 1</h3>
            <input type="text" placeholder="Search by Team ID" className="w-full bg-slate-50 border border-slate-100 p-3 rounded text-sm focus:outline-none" />
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-slate-800 mb-2">Option 2</h3>
            <button onClick={() => setShowCreateModal(true)} className="w-full bg-[#008060] text-white font-bold text-xs py-3.5 rounded shadow-sm hover:bg-[#006e52] active:scale-95 transition-transform">
              CREATE NEW TEAM
            </button>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-1">Option 3</h3>
            <p className="text-xs text-slate-500 mb-4">Select one from your existing teams</p>
            <div className="space-y-1">
              {teams.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4">No teams available. Create one.</p>
              ) : (
                teams.map(team => (
                  <button key={team._id} onClick={() => handleSelectTeam(team)} className="w-full flex items-center gap-4 py-3 px-2 hover:bg-slate-50 rounded transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {team.logoUrl || team.logo ? <img src={team.logoUrl || team.logo} alt={team.name} className="w-full h-full object-cover" /> : <span className="font-bold text-slate-500 text-xs">{team.name.substring(0,2)}</span>}
                    </div>
                    <span className="font-bold text-slate-800 text-sm tracking-wide text-left">{team.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 pt-8 pb-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="absolute top-6 left-6 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-700 transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
              <div className="flex flex-col items-center mt-6 space-y-8 px-4">
                <input type="text" placeholder="Team Name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full text-center py-2 text-slate-800 font-medium border-b border-slate-300 focus:outline-none focus:border-[#00a884] placeholder:text-slate-800 transition-colors bg-transparent" />
                <input type="text" placeholder="Location" value={newTeamLocation} onChange={(e) => setNewTeamLocation(e.target.value)} className="w-full text-center py-2 text-slate-800 font-medium border-b border-slate-300 focus:outline-none focus:border-[#00a884] placeholder:text-slate-800 transition-colors bg-transparent" />
              </div>
              <div className="mt-12 flex justify-center px-4">
                <button onClick={handleCreateTeam} disabled={isCreating || !newTeamName.trim()} className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-bold text-sm tracking-wide px-8 py-3.5 rounded-xl w-[200px] transition-colors shadow-sm">
                  {isCreating ? "CREATING..." : "CREATE TEAM"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN OPEN MATCH SCREEN ──
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <header className="flex items-center p-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-8">Open Match</h1>
      </header>

      <div className="p-6 max-w-md mx-auto w-full flex flex-col items-center">
        <div className="flex justify-center gap-12 w-full mt-8 mb-12">
          {/* Team A Slot */}
          <div className="flex flex-col items-center gap-3 w-24">
            <span className="text-[11px] font-medium text-slate-400">Select Team</span>
            <button onClick={() => setSelectingSlot('A')} className="w-24 h-24 rounded-full bg-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-[3px] border-white overflow-hidden relative">
              {teamA ? (
                <>{(teamA.logoUrl || teamA.logo) ? <img src={teamA.logoUrl || teamA.logo} alt="Team A" className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-slate-500">{teamA.name.substring(0,2)}</span>}</>
              ) : <Plus size={40} className="text-white" strokeWidth={2.5} />}
            </button>
            <span className="text-sm font-bold text-slate-800 tracking-wide mt-1 text-center break-words w-full leading-tight">
              {teamA ? teamA.name : "TEAM A"}
            </span>
          </div>
          
          {/* Team B Slot */}
          <div className="flex flex-col items-center gap-3 w-24">
            <span className="text-[11px] font-medium text-slate-400">Select Team</span>
            <button onClick={() => setSelectingSlot('B')} className="w-24 h-24 rounded-full bg-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-[3px] border-white overflow-hidden relative">
              {teamB ? (
                <>{(teamB.logoUrl || teamB.logo) ? <img src={teamB.logoUrl || teamB.logo} alt="Team B" className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-slate-500">{teamB.name.substring(0,2)}</span>}</>
              ) : <Plus size={40} className="text-white" strokeWidth={2.5} />}
            </button>
            <span className="text-sm font-bold text-slate-800 tracking-wide mt-1 text-center break-words w-full leading-tight">
              {teamB ? teamB.name : "TEAM B"}
            </span>
          </div>
        </div>

        {/* ── Form Inputs ── */}
        <div className="w-full space-y-6">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Venue" 
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full text-center font-medium text-slate-800 py-2 focus:outline-none bg-transparent placeholder:text-slate-800" 
            />
            <div className="h-px bg-slate-200 w-full transition-colors group-focus-within:bg-[#008060]"></div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 group">
              <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-center py-2 text-slate-800 font-medium focus:outline-none bg-transparent" />
              <div className="h-px bg-slate-200 w-full group-focus-within:bg-[#008060] transition-colors"></div>
            </div>
            <div className="flex-1 group">
              <input type="text" value={time} onChange={(e) => setTime(e.target.value)} className="w-full text-center py-2 text-slate-800 font-medium focus:outline-none bg-transparent" />
              <div className="h-px bg-slate-200 w-full group-focus-within:bg-[#008060] transition-colors"></div>
            </div>
          </div>

          <div className="pt-2 cursor-pointer" onClick={() => setShowSettingsModal(true)}>
            <div className="text-center font-medium text-[#008060] py-2 hover:bg-slate-50 transition-colors rounded">
              {overs} Overs - {format} - {ballType}
            </div>
            <div className="h-px bg-slate-200 w-full"></div>
          </div>

          <div className="pt-2 group">
            <input 
              type="text" 
              value={scorer}
              onChange={(e) => setScorer(e.target.value)}
              placeholder="Select Scorer (Optional)" 
              className="w-full text-center py-2 text-slate-800 font-medium focus:outline-none bg-transparent placeholder:text-slate-400"
            />
            <div className="h-px bg-slate-200 w-full group-focus-within:bg-[#008060] transition-colors"></div>
          </div>
        </div>

        <div className="flex w-full gap-4 mt-12 mb-4">
          <button onClick={handleSaveFixture} className="flex-1 py-3.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-bold rounded-xl active:scale-95 transition-transform tracking-wide shadow-sm">
            SAVE FIXTURE
          </button>
          <button onClick={handleStartMatchClick} className="flex-1 py-3.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-bold rounded-xl active:scale-95 transition-transform tracking-wide shadow-sm">
            START MATCH
          </button>
        </div>
        
        <div className="w-full flex justify-center mb-8">
          <Link href="/scoring/matches" className="px-6 py-2 border border-slate-300 text-slate-600 rounded-full font-bold text-xs hover:bg-slate-50 transition-colors">
            View Match
          </Link>
        </div>

        {/* ── TOSS MODAL (Image 3) ── */}
        {showTossModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 pt-8 pb-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowTossModal(false)} 
                className="absolute top-6 left-6 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-700 transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mt-6 mb-6 text-left px-2 pl-10">Who won the toss?</h2>
              
              <div className="flex gap-4 mb-8 px-2">
                {/* Team A Button */}
                <button 
                  onClick={() => setTossWinner(teamA?._id)}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${tossWinner === teamA?._id ? 'border-[#008060] bg-[#008060]/5' : 'border-slate-200'}`}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800 shadow-md mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                    {(teamA?.logoUrl || teamA?.logo) ? <img src={teamA.logoUrl || teamA.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{teamA?.name?.slice(0,2)}</span>}
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center">{teamA?.name}</span>
                </button>
                
                {/* Team B Button */}
                <button 
                  onClick={() => setTossWinner(teamB?._id)}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${tossWinner === teamB?._id ? 'border-[#008060] bg-[#008060]/5' : 'border-slate-200'}`}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800 shadow-md mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                    {(teamB?.logoUrl || teamB?.logo) ? <img src={teamB.logoUrl || teamB.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{teamB?.name?.slice(0,2)}</span>}
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center">{teamB?.name}</span>
                </button>
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-4 text-left px-2">Decided to?</h2>
              
              <div className="flex gap-4 mb-8 px-2">
                <button 
                  onClick={() => setTossDecision('bat')}
                  className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-colors ${tossDecision === 'bat' ? 'border-[#008060] bg-[#008060] text-white shadow-md' : 'border-slate-300 text-slate-700'}`}
                >
                  Bat
                </button>
                <button 
                  onClick={() => setTossDecision('bowl')}
                  className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-colors ${tossDecision === 'bowl' ? 'border-[#008060] bg-[#008060] text-white shadow-md' : 'border-slate-300 text-slate-700'}`}
                >
                  Bowl
                </button>
              </div>

              <div className="px-2 mt-4">
                <button 
                  onClick={handleStartScoring}
                  disabled={!tossWinner || !tossDecision || isStarting}
                  className="w-full bg-[#008060] hover:bg-[#006e52] disabled:opacity-50 text-white font-bold py-4 rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {isStarting ? "STARTING..." : "START SCORING"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
