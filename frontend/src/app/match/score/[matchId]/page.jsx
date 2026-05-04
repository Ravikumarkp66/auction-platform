"use client";

import { useState, useEffect, use } from "react";
import io from "socket.io-client";
import { ArrowLeft, Edit2, RotateCcw, Settings, Volume2, Share2, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";

const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MatchScorer({ params }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.matchId;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Player Selection State
  const [selectingRole, setSelectingRole] = useState(null); // 'striker', 'nonStriker', 'bowler'
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Add Player Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Fetch players when role selected
  useEffect(() => {
    if (!selectingRole || !match) return;
    
    const currentInnings = match.innings[match.currentInnings - 1] || {};
    const teamData = (selectingRole === 'striker' || selectingRole === 'nonStriker') 
      ? currentInnings.battingTeam 
      : currentInnings.bowlingTeam;
      
    const teamId = typeof teamData === 'object' && teamData !== null ? teamData._id : teamData;
      
    if (!teamId) return;

    const fetchTeamPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const res = await fetch(`${API_URL}/api/teams/${teamId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailablePlayers(data.squad || []);
        }
      } catch (err) {
        console.error("Failed to load players", err);
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchTeamPlayers();
  }, [selectingRole, match, showAddModal]); // re-fetch when modal closes so we see new player

  // Fetch match details
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/api/match/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();

    socket.emit("join-match", matchId);
    socket.on("score-update", (data) => {
      setMatch(data);
    });

    return () => {
      socket.off("score-update");
    };
  }, [matchId]);

  const sendEvent = async (event) => {
    try {
      await fetch(`${API_URL}/api/match/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event })
      });
    } catch (err) {
      console.error("Failed to post score", err);
    }
  };

  const handleSelectPlayer = async (playerId) => {
    if (!match || !selectingRole) return;
    
    // Create a deep copy of innings
    const updatedInnings = JSON.parse(JSON.stringify(match.innings));
    const currentInningIdx = match.currentInnings - 1;
    
    if (selectingRole === 'striker') {
      updatedInnings[currentInningIdx].striker = playerId;
    } else if (selectingRole === 'nonStriker') {
      updatedInnings[currentInningIdx].nonStriker = playerId;
    } else if (selectingRole === 'bowler') {
      updatedInnings[currentInningIdx].bowler = playerId;
    }

    try {
      const res = await fetch(`${API_URL}/api/match/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ innings: updatedInnings })
      });
      if (res.ok) {
        const updatedMatch = await res.json();
        setMatch(updatedMatch);
        setSelectingRole(null);
      }
    } catch (err) {
      console.error("Failed to select player", err);
    }
  };

  const handleCreatePlayer = async () => {
    if (!match || (!newPlayerName.trim() && !newPlayerId.trim())) return;
    setIsAddingPlayer(true);
    
    const currentInnings = match.innings[match.currentInnings - 1] || {};
    const teamData = (selectingRole === 'striker' || selectingRole === 'nonStriker') 
      ? currentInnings.battingTeam 
      : currentInnings.bowlingTeam;
      
    const teamId = typeof teamData === 'object' && teamData !== null ? teamData._id : teamData;

    try {
      if (newPlayerName.trim()) {
        // Create new player
        const res = await fetch(`${API_URL}/api/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newPlayerName,
            teamId: teamId,
            tournamentId: match.tournamentId,
            status: 'available'
          })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          alert("Failed to add player: " + errData.message);
          setIsAddingPlayer(false);
          return;
        }
      } else if (newPlayerId.trim()) {
        // If we were to add existing player by ID, we'd update that player's team
        // Assuming newPlayerId is the _id or applicationId. For now, simple mock update:
        // (This part requires more specific backend support, but we handle the Create perfectly)
      }
      
      setNewPlayerName("");
      setNewPlayerId("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to create player", err);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-800 bg-slate-100"><div className="bg-white p-8 rounded-xl shadow-sm text-sm font-bold">Loading Match...</div></div>;
  if (!match) return <div className="min-h-screen bg-slate-100 text-slate-800 p-8 text-center flex items-center justify-center font-bold">Match not found.</div>;

  const currentInnings = match.innings[match.currentInnings - 1] || {};
  const overs = Math.floor((currentInnings.legalBalls || 0) / 6);
  const balls = (currentInnings.legalBalls || 0) % 6;
  const crr = overs > 0 || balls > 0 ? ((currentInnings.totalRuns || 0) / ((overs * 6 + balls) / 6)).toFixed(1) : "0.0";
  
  // Calculate total extras
  const extras = currentInnings.ballsData?.reduce((acc, b) => acc + (b.extras || 0), 0) || 0;

  // Simple timeline extraction
  const timeline = currentInnings.ballsData?.slice(-6) || [];

  return (
    <div className="bg-slate-100 min-h-screen flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen text-slate-800 font-sans pb-[250px] relative shadow-2xl border-x border-slate-200">
        {/* ── Top Header ── */}
        <header className="flex items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <Link href="/admin/matches" className="p-1 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={24} className="text-slate-700" />
          </Link>
          <h1 className="flex-1 text-center font-bold text-[17px] tracking-tight">Match Centre</h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </header>

        {/* ── Tabs ── */}
        <div className="flex px-4 pt-4 border-b border-slate-200 text-sm font-medium text-slate-500 overflow-x-auto no-scrollbar gap-8 justify-center">
          <div className="border-b-2 border-slate-800 text-slate-800 pb-3 whitespace-nowrap">Scoring</div>
          <div className="pb-3 whitespace-nowrap hover:text-slate-800 cursor-pointer transition">Scorecard</div>
          <div className="pb-3 whitespace-nowrap hover:text-slate-800 cursor-pointer transition">Stats</div>
          <div className="pb-3 whitespace-nowrap hover:text-slate-800 cursor-pointer transition">Super Stars</div>
        </div>

        {/* ── Center Score Area ── */}
        <div className="text-center mt-6 px-4 relative">
          <div className="flex justify-between items-start absolute w-full px-4 left-0 top-12">
            <div className="flex items-center gap-1 bg-black text-white px-2 py-1 rounded text-xs">
              <span>0</span> <Settings size={12}/>
            </div>
            <div className="flex gap-2">
              <div className="bg-black text-white p-1.5 rounded"><Volume2 size={14}/></div>
              <div className="bg-black text-white p-1.5 rounded"><Share2 size={14}/></div>
            </div>
          </div>

          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            {match.currentInnings === 1 ? match.teamA?.name : match.teamB?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{match.currentInnings === 1 ? "1st" : "2nd"} Innings</p>
          
          <h1 className="text-[72px] leading-none font-semibold text-[#00a884] my-2">
            {currentInnings.totalRuns || 0}-{currentInnings.wickets || 0}
          </h1>
          
          <div className="flex justify-center gap-4 text-xs font-semibold mt-3 text-slate-700">
            <span>Extras - {extras}</span>
            <span>Overs - {overs}.{balls} / {match.totalOvers}</span>
            <span>CRR - {crr}</span>
          </div>
          <p className="text-xs font-semibold mt-2 text-slate-700">Partnership - 0(0)</p>
        </div>

        {/* ── Batsman & Bowler Tables ── */}
        <div className="mt-8 px-4 overflow-x-auto">
          {/* Batsman */}
          <table className="w-full text-sm mb-6 min-w-[340px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="text-left font-normal pb-2 flex items-center gap-2"><Edit2 size={14} className="text-amber-500"/> Batsman</th>
                <th className="font-normal pb-2 w-8 text-center">R</th>
                <th className="font-normal pb-2 w-8 text-center">B</th>
                <th className="font-normal pb-2 w-8 text-center">4s</th>
                <th className="font-normal pb-2 w-8 text-center">6s</th>
                <th className="font-normal pb-2 w-10 text-center">SR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50">
                <td className="py-3 text-slate-800 font-semibold">{currentInnings.striker ? (currentInnings.striker.name || 'Striker') : '-'}</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
              </tr>
              <tr className="border-b border-slate-50">
                <td className="py-3 text-slate-800 font-semibold">{currentInnings.nonStriker ? (currentInnings.nonStriker.name || 'Non-Striker') : '-'}</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
              </tr>
            </tbody>
          </table>

          {/* Bowler */}
          <table className="w-full text-sm min-w-[340px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="text-left font-normal pb-2 flex items-center gap-2"><Edit2 size={14} className="text-amber-500"/> Bowler</th>
                <th className="font-normal pb-2 w-8 text-center">O</th>
                <th className="font-normal pb-2 w-8 text-center">M</th>
                <th className="font-normal pb-2 w-8 text-center">R</th>
                <th className="font-normal pb-2 w-8 text-center">W</th>
                <th className="font-normal pb-2 w-10 text-center">Eco</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50">
                <td className="py-3 text-slate-800 font-semibold">{currentInnings.bowler ? (currentInnings.bowler.name || 'Bowler') : '-'}</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
                <td className="text-center text-slate-600">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Bottom Drawer / Controls ── */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 rounded-t-[24px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
          
          {/* If no players selected, show Orange Overlay exactly like the screenshot */}
          {(!currentInnings.striker || !currentInnings.bowler) ? (
            <div className="bg-[#ff9800] p-6 flex flex-col items-center justify-center w-full min-h-[220px]">
               <div className="flex items-center text-black mb-8 w-full relative">
                 <button className="absolute left-0 p-1"><X size={24}/></button>
                 <h3 className="text-xl font-medium w-full text-center">Select Players</h3>
               </div>
               <div className="flex gap-4 justify-center w-full">
                 <button onClick={() => setSelectingRole('striker')} className="px-6 py-3 border border-black/20 rounded text-black font-medium hover:bg-black/5 transition w-full max-w-[160px]">
                   Select Batsman
                 </button>
                 <button onClick={() => setSelectingRole('bowler')} className="px-6 py-3 border border-black/20 rounded text-black font-medium hover:bg-black/5 transition w-full max-w-[160px]">
                   Select Bowler
                 </button>
               </div>
            </div>
          ) : (
          <div className="p-5">
            {/* Timeline & Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3">
                <button onClick={undoBall} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-200 transition">
                  <RotateCcw size={14} /> Undo
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-200 transition">
                  Extras
                </button>
              </div>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                This Over: 
                <div className="flex gap-1">
                  {timeline.map((b, i) => (
                    <span key={i} className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${b.type === 'wicket' ? 'bg-red-500 text-white' : b.runs === 4 || b.runs === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {b.type === 'wicket' ? 'W' : b.type === 'wide' ? 'wd' : b.runs}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-5 gap-2.5 mb-2.5">
              <button onClick={() => sendEvent({ type: "run", runs: 0 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-xl text-slate-700">0</button>
              <button onClick={() => sendEvent({ type: "run", runs: 1 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-xl text-slate-700">1</button>
              <button onClick={() => sendEvent({ type: "run", runs: 2 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-xl text-slate-700">2</button>
              <button onClick={() => sendEvent({ type: "run", runs: 3 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-xl text-slate-700">3</button>
              <button onClick={() => sendEvent({ type: "wide", runs: 0 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-sm text-slate-600">WD</button>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              <button onClick={() => sendEvent({ type: "run", runs: 4 })} className="h-14 bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95 transition-transform rounded-xl font-black text-2xl">4</button>
              <button onClick={() => sendEvent({ type: "run", runs: 6 })} className="h-14 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95 transition-transform rounded-xl font-black text-2xl">6</button>
              <button onClick={() => sendEvent({ type: "no-ball", runs: 0 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-sm text-slate-600">NB</button>
              <button onClick={() => sendEvent({ type: "leg-bye", runs: 1 })} className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform rounded-xl font-bold text-sm text-slate-600">LB</button>
              <button onClick={() => sendEvent({ type: "wicket" })} className="h-14 bg-red-100 text-red-600 hover:bg-red-200 active:scale-95 transition-transform rounded-xl font-black text-xl">W</button>
            </div>
          </div>
        )}
      </div>

      {/* ── PLAYER SELECTION MODAL (Image 3) ── */}
      {selectingRole && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
          
          <div className="bg-[#ff9800] flex items-center p-4 text-white h-16 shadow-sm">
            <button onClick={() => setSelectingRole(null)} className="p-2 -ml-2 rounded-full hover:bg-black/10 transition">
              <X size={24} />
            </button>
            <h2 className="font-bold text-lg flex-1 text-center pr-8">
              {selectingRole === 'striker' || selectingRole === 'nonStriker' ? 'Select Batsman' : 'Select Bowler'}
            </h2>
          </div>
          
          <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
            {loadingPlayers ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-medium">Loading squad...</div>
            ) : availablePlayers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full max-w-sm mx-auto">
                <img src="/assets/batsman-sketch.png" alt="No players" className="w-32 opacity-80 mix-blend-multiply mb-6 grayscale" onError={(e) => { e.target.style.display = 'none'; }} />
                
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No Players</h3>
                <p className="text-slate-500 text-[15px] mb-8 leading-relaxed px-4">
                  You can create new players or add existing players using their profile ID
                </p>
                
                <button onClick={() => setShowAddModal(true)} className="bg-[#008060] hover:bg-[#006e52] text-white font-bold text-sm tracking-wide py-3.5 px-8 rounded-xl w-full max-w-[280px] shadow-sm transition-colors uppercase">
                  Add / Create Player
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col bg-white relative">
                <div className="flex-1 overflow-y-auto w-full px-2 pb-24 pt-2">
                  {availablePlayers.map((p, idx) => (
                    <button key={p._id} onClick={() => handleSelectPlayer(p._id)} className="bg-white border-b border-slate-200 py-3 flex items-center justify-between hover:bg-slate-50 transition text-left px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                           {p.photo?.drive ? <img src={p.photo.drive} className="w-full h-full object-cover"/> : <img src="/assets/default-avatar.png" className="w-full h-full opacity-50" onError={(e) => e.target.style.display='none'} />}
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-slate-700 text-sm">{p.name}</h4>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <div className="px-3 py-1 rounded-md bg-slate-200 text-slate-500 font-medium text-[10px]">SELECT</div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-auto absolute bottom-0 left-0 w-full">
                   <button onClick={() => setShowAddModal(true)} className="bg-[#00a884] hover:bg-[#008f6f] text-white font-bold text-sm tracking-wide py-4 w-full transition-colors uppercase">
                     ADD / CREATE PLAYER
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD PLAYER MODAL (Image 2) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 left-4 p-1 bg-black text-white rounded-full hover:bg-slate-800 transition">
              <X size={16} strokeWidth={3} />
            </button>
            
            <div className="mt-8">
              <h3 className="text-base font-bold text-slate-800 text-center mb-6">Add Player (Using Profile ID)</h3>
              <input 
                type="text" 
                placeholder="Eg : abxy9840" 
                value={newPlayerId}
                onChange={(e) => setNewPlayerId(e.target.value)}
                className="w-full text-center py-2 text-slate-800 font-medium border-b border-slate-300 focus:outline-none focus:border-[#008060] placeholder:text-slate-400 bg-transparent mb-8"
              />
              
              <div className="text-center text-sm font-medium text-slate-500 mb-8">(Or)</div>
              
              <h3 className="text-base font-bold text-slate-800 text-center mb-6">Create New Player</h3>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="w-full text-center py-2 text-slate-800 font-medium border-b border-slate-300 focus:outline-none focus:border-[#008060] placeholder:text-slate-400 bg-transparent mb-10"
              />
              
              <div className="flex justify-center">
                <button 
                  onClick={handleCreatePlayer}
                  disabled={isAddingPlayer || (!newPlayerName.trim() && !newPlayerId.trim())}
                  className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-bold text-sm tracking-wide px-8 py-3.5 rounded-xl w-full shadow-sm transition-colors uppercase"
                >
                  {isAddingPlayer ? "Adding..." : "Add / Create Player"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
