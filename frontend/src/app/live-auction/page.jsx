"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { io } from "socket.io-client"
import BreakControlPanel from '../../components/BreakControlPanel'
import CompactBreakControl from '../../components/CompactBreakControl'

function LiveAuctionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const tournamentId = searchParams.get("id")

  // Redirect non-admin users
  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user?.role !== "admin") {
      router.push("/auctions")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!session || session.user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-6">Auction control is restricted to administrators only.</p>
          <Link 
            href="/auctions" 
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
          >
            View Live Auctions
          </Link>
        </div>
      </div>
    )
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [config, setConfig] = useState({ name: "", baseBudget: 0, totalTeams: 0 })
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [currentBid, setCurrentBid] = useState(0)
  const [highestBidder, setHighestBidder] = useState(null)
  const [bidPulse, setBidPulse] = useState(false)
  const [roundHistory, setRoundHistory] = useState([])
  const [results, setResults] = useState([])
  const [lastBidTime, setLastBidTime] = useState(0)
  
  const [activeSidebar, setActiveSidebar] = useState(null) // 'teams' or 'stats'
  const [editingPlayerField, setEditingPlayerField] = useState(null) // field name like 'name', 'role', etc.
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editingShortId, setEditingShortId] = useState(null)
  const [tempValue, setTempValue] = useState("")
  const [tempShort, setTempShort] = useState("")
  const [bidIncrement, setBidIncrement] = useState(100)
  const [socket, setSocket] = useState(null)

  // Edge Case 1: Debounce / Cooldown
  const BID_COOLDOWN = 600; 

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    })
    
    setSocket(s)

    // Connection events
    s.on('connect', () => {
      // Socket connected for live auction control panel
    })

    s.on('disconnect', (reason) => {
      console.log('Live auction socket disconnected:', reason)
      if (reason === 'io server disconnect') {
        s.connect()
      }
    })

    s.on('connect_error', (error) => {
      console.error('Live auction socket connection error:', error)
      setTimeout(() => {
        s.connect()
      }, 2000)
    })

    return () => {
      console.log('Cleaning up live auction socket connection')
      s.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!tournamentId) {
      router.push("/auction")
      return
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}`)
      .then(res => res.ok ? res.json() : Promise.reject("Failed to load"))
      .then(data => {
        if (!data || !data.tournament) throw new Error("Tournament not found")
        
        setConfig({
          name: data.tournament.name,
          baseBudget: data.tournament.baseBudget,
          totalTeams: data.tournament.numTeams
        })
        
        setTeams(data.teams.map(t => ({
          id: t._id,
          name: t.name,
          shortName: t.shortName || "TBD",
          logoUrl: t.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`,
          totalBudget: data.tournament.baseBudget,
          remainingBudget: t.remainingBudget,
          players: data.players.filter(p => p.team === t._id),
          color: t.color || "bg-blue-600"
        })))
        
        setPlayers(data.players.map(p => ({
          id: p._id,
          name: p.name,
          role: p.role || "All-Rounder",
          village: p.village || "-",
          dob: p.dob || "-",
          town: p.town,
          age: p.age || 20,
          image: p.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}`, 
          placeholder: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
          basePrice: p.basePrice || 100,
          soldPrice: p.soldPrice,
          team: p.team,
          status: p.status,
          battingStyle: p.battingStyle || "Right Hand",
          bowlingStyle: p.bowlingStyle || "-"
        })))
        
        const nextIdx = data.players.findIndex(p => p.status === "available" || p.status === "auction")
        const idx = nextIdx !== -1 ? nextIdx : 0
        setCurrentPlayerIndex(idx)
        setCurrentBid(0)
        
        const sold = data.players.filter(p => p.status === "sold")
        setResults(sold.map(p => ({
          player: p.name,
          team: data.teams.find(t => t._id === p.team)?.name || "-",
          price: p.soldPrice,
          status: "SOLD",
          color: "text-emerald-400 bg-emerald-500/10"
        })))
        
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError("Could not load tournament data. Is the backend running?")
        setLoading(false)
      })
  }, [tournamentId, router])

  const player = players[currentPlayerIndex]

  // Broadcast state changes to Overlay via Socket.io
  useEffect(() => {
    if (!socket || !player) return
    const topTeam = teams.find(t => t.id === highestBidder)
    
    // Calculate simple team statistics for the overlay
    const overlayTeams = teams.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logoUrl: t.logoUrl,
      remainingBudget: t.remainingBudget,
      playersCount: t.players.length,
      maxPlayers: config.squadSize || 15 // default or config
    }))

    socket.emit("auctionUpdate", {
      player: player,
      currentBid: currentBid,
      highestBidder: topTeam?.name || null,
      highestBidderLogo: topTeam?.logoUrl || null,
      tournamentName: config.name,
      teams: overlayTeams,
      roundHistory: roundHistory.slice(0, 5) // Last 5 bids
    })
  }, [socket, player, currentBid, highestBidder, config.name, teams, roundHistory, config.squadSize])

  // Edge Case 7: Only allow bid if player is available
  const canPlaceBid = player && (player.status === "available" || player.status === "auction");

  const placeBid = (teamId) => {
    // Edge Case 1: Double-click prevention
    const now = Date.now()
    if (now - lastBidTime < BID_COOLDOWN) return
    if (!canPlaceBid) return

    const increment = Number(bidIncrement) || 100
    const newBid = currentBid === 0 
      ? Math.max(player.basePrice, increment) 
      : currentBid + increment
    
    // Check if team has enough budget
    const biddingTeam = teams.find(t => t.id === teamId)
    if (biddingTeam.remainingBudget < newBid) {
      alert(`${biddingTeam.name} has insufficient budget!`)
      return
    }

    setLastBidTime(now)
    setCurrentBid(newBid)
    setHighestBidder(teamId)
    setBidPulse(true)
    setTimeout(() => setBidPulse(false), 400)
    
    setRoundHistory([{ team: biddingTeam.name, teamId: teamId, bid: newBid }, ...roundHistory])
    
    // Reset increment to default 100 after bid
    setBidIncrement(100)
  }

  // Edge Case 5: Undo Last Bid
  const undoLastBid = () => {
    if (roundHistory.length === 0) return
    const newHistory = [...roundHistory]
    newHistory.shift() // Remove last bid
    setRoundHistory(newHistory)
    
    if (newHistory.length === 0) {
      setCurrentBid(0)
      setHighestBidder(null)
    } else {
      setCurrentBid(newHistory[0].bid)
      setHighestBidder(newHistory[0].teamId)
    }
  }

  const sellPlayer = async () => {
    if (!player) return
    
    // Edge Case 2: Click SOLD without any bid
    if (!highestBidder || currentBid === 0) {
      if (confirm("No bids placed. Mark as UNSOLD?")) {
        unsoldPlayer()
      }
      return
    }

    if (!confirm(`Sell ${player.name} to ${teams.find(t=>t.id===highestBidder)?.name} for ₹${currentBid}?`)) return
    
    // Edge Case 6: SOLD clicked twice prevention (local check)
    if (player.status === "sold") return

    // Update locally immediately
    const updatedTeams = teams.map((team) =>
      team.id === highestBidder
        ? { 
            ...team, 
            remainingBudget: team.remainingBudget - currentBid,
            players: [...team.players, player]
          }
        : team
    )
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = {
      ...player,
      soldPrice: currentBid,
      team: highestBidder,
      status: "sold"
    }
    setTeams(updatedTeams)
    setPlayers(updatedPlayers)
    setResults([{
      player: player.name,
      team: teams.find(t => t.id === highestBidder).name,
      price: currentBid,
      status: "SOLD",
      color: "text-emerald-400 bg-emerald-500/10"
    }, ...results])
    // Stay on player to show banner
  }

  const unsoldPlayer = () => {
    if (!player) return
    if (player.status === "sold" || player.status === "unsold") return

    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = { ...player, status: "unsold" }
    setPlayers(updatedPlayers)
    setResults([{
      player: player.name,
      team: "-",
      price: "-",
      status: "UNSOLD",
      color: "text-red-400 bg-red-500/10"
    }, ...results])
    // Stay on player to show banner
  }

  const nextPlayer = () => {
    // Confirmation before accidental move if BID IS ACTIVE
    if (currentPlayerIndex < players.length - 1 && currentPlayerIndex !== -1) {
       if (currentBid > 0 && player.status === "available" && !confirm("Auction in progress. Discard bids and move to next player?")) return
    }

    const nextIdx = currentPlayerIndex + 1;
    if (nextIdx < players.length) {
      setCurrentPlayerIndex(nextIdx)
      setCurrentBid(0)
      setHighestBidder(null)
      setRoundHistory([])
    } else {
      setCurrentPlayerIndex(-1)
    }
  }

  const prevPlayer = () => {
    if (currentPlayerIndex > 0) {
      if (currentBid > 0 && !confirm("Auction in progress. Discard bids and move to previous player?")) return
      
      setCurrentPlayerIndex(currentPlayerIndex - 1)
      setCurrentBid(0)
      setHighestBidder(null)
      setRoundHistory([])
    }
  }

  const handleImageUpload = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        callback(data.url);
      } else {
        alert("Upload failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Network error during upload");
    } finally {
      setLoading(false);
    }
  }

  const handlePlayerUpdate = async (id, field, newValue) => {
    if (!newValue.toString().trim() && ["name", "role", "basePrice"].includes(field)) return setEditingPlayerField(null);
    try {
      const isNumberField = ['basePrice', 'age'].includes(field);
      const valueToSend = isNumberField ? Number(newValue) : newValue;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: valueToSend })
      });
      if (res.ok) {
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: valueToSend } : p));
        console.log(`Player ${field} updated successfully`);
      } else {
        const data = await res.json();
        alert("Failed to save: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(`Failed to update player ${field}:`, err);
      alert("Network error: Could not connect to server");
    } finally {
      setEditingPlayerField(null);
    }
  }

  const handleTeamNameUpdate = async (id, field, newValue) => {
    if (!newValue.trim() && field === "name") return setEditingTeamId(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue })
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: newValue } : t));
        console.log(`Team ${field} updated successfully`);
      } else {
        const data = await res.json();
        alert("Failed to save: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(`Failed to update team ${field}:`, err);
      alert("Network error: Could not connect to server");
    } finally {
      setEditingTeamId(null);
      setEditingShortId(null);
    }
  }


  const getRoleColor = (role) => {
    const r = role.toLowerCase()
    if (r.includes('batsman')) return 'text-blue-400'
    if (r.includes('bowler')) return 'text-red-400'
    return 'text-amber-400' // All-rounder / Default
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-6">
       <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
       <p className="font-black tracking-[0.5em] text-emerald-500 animate-pulse uppercase">Syncing Live Data</p>
    </div>
  )
  
  if (error) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
      <p className="text-4xl mb-6">🚫</p>
      <p className="text-xl font-bold mb-4">{error}</p>
      <Link href="/auction" className="bg-emerald-600 px-8 py-3 rounded-xl font-bold shadow-lg">Back to Dashboard</Link>
    </div>
  )

  const soldPlayers = players.filter(p => p.status === "sold")
  const unsoldPlayers = players.filter(p => p.status === "unsold")
  const mostExpensive = [...soldPlayers].sort((a, b) => b.soldPrice - a.soldPrice)[0]
  
  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-6 font-sans text-white flex flex-col overflow-hidden">
      {/* HEADER - Responsive Layout */}
      <div className="mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <Link href="/auctions" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-emerald-500 whitespace-nowrap backdrop-blur-md min-h-[40px] flex items-center shadow-lg">
            ← Back to Auctions
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900/80 rounded-xl p-1 border border-slate-700 shadow-xl backdrop-blur-md">
              <button
                onClick={prevPlayer}
                disabled={currentPlayerIndex <= 0}
                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 transition-all min-h-[40px]"
              >
                ←
              </button>
              <div className="w-[1px] bg-slate-700/50 mx-1"></div>
              <button
                onClick={nextPlayer}
                disabled={currentPlayerIndex >= players.length - 1 || currentPlayerIndex === -1}
                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 transition-all min-h-[40px]"
              >
                →
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-[9px] sm:text-[10px] text-emerald-500 font-black tracking-[0.4em] mb-0.5 opacity-60 uppercase animate-pulse">Live Broadcast</p>
          <h1 className="text-lg sm:text-2xl lg:text-4xl font-black tracking-tighter uppercase drop-shadow-2xl leading-tight">
            {config.name} <span className="text-emerald-500 italic font-medium">AUCTION</span>
          </h1>
        </div>
      </div>
      

      <div className="flex gap-4 min-h-0 flex-1 overflow-hidden">
        {/* FIXED LEFT SIDEBAR - Desktop Only */}
        <div className="hidden md:flex w-16 border-r border-slate-800 flex-col items-center py-6 gap-8 bg-slate-900/20 shrink-0">
           <button 
             onClick={() => setActiveSidebar('teams')}
             className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'teams' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             title="Teams Rosters"
           >
             <span className="text-xl">👥</span>
           </button>
           <button 
             onClick={() => setActiveSidebar('stats')}
             className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'stats' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             title="Market Insights"
           >
             <span className="text-xl">📊</span>
           </button>
        </div>

        {/* MOBILE SIDEBAR PANEL (Bottom Bar Style) */}
        {!activeSidebar && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 flex justify-around items-center h-16 z-50 pb-[env(safe-area-inset-bottom)]">
             <button onClick={() => setActiveSidebar('teams')} className="flex flex-col items-center gap-1">
                <span className="text-xl">👥</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Teams</span>
             </button>
             <button onClick={() => setActiveSidebar('stats')} className="flex flex-col items-center gap-1">
                <span className="text-xl">📊</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Stats</span>
             </button>
          </div>
        )}

        {/* POP-UP MODAL (CENTERED) */}
        {activeSidebar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setActiveSidebar(null)}></div>
            <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0a111f] border border-slate-700 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
              {/* Modal Header */}
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex gap-2">
                   <button 
                     onClick={() => setActiveSidebar('teams')}
                     className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebar === 'teams' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                   >
                     Teams
                   </button>
                   <button 
                     onClick={() => setActiveSidebar('stats')}
                     className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebar === 'stats' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                   >
                     Stats
                   </button>
                </div>
                <button onClick={() => setActiveSidebar(null)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500 hover:text-white rounded-full transition-all text-xl">✕</button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeSidebar === 'teams' ? (
                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">SL</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Logo</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Name</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Budget</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Squad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...teams].sort((a, b) => a.remainingBudget - b.remainingBudget).map((team, idx) => (
                          <tr 
                            key={team.id} 
                            className={`border-b border-slate-800/50 transition-all hover:bg-white/5 ${highestBidder === team.id ? 'bg-blue-600/10' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <span className="text-xs font-black text-slate-600">{idx + 1}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shadow-inner">
                                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                               <div className="flex flex-col">
                                  <span className="text-sm font-black text-white uppercase tracking-tight">{team.name}</span>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">{team.shortName}</span>
                               </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <span className="text-sm font-black text-emerald-400">₹{team.remainingBudget.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="flex flex-col items-end">
                                  <span className={`text-sm font-black ${team.players.length >= 15 ? 'text-blue-400' : 'text-white'}`}>
                                    {team.players.length}<span className="text-slate-600 text-[10px] ml-1">/ 15</span>
                                  </span>
                                  <div className="w-16 h-1 mt-1 bg-slate-800 rounded-full overflow-hidden">
                                     <div 
                                       className="h-full bg-blue-500 transition-all duration-500" 
                                       style={{ width: `${Math.min((team.players.length / 15) * 100, 100)}%` }}
                                     ></div>
                                  </div>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                       <div className="col-span-2 bg-slate-800/30 p-6 rounded-3xl border border-slate-700/30">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-widest">Top Purchase</p>
                          {mostExpensive ? (
                             <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 flex items-center justify-center text-3xl">🥇</div>
                                <div>
                                   <p className="text-xl font-black text-white">{mostExpensive.name}</p>
                                   <p className="text-2xl font-black text-emerald-400">₹{mostExpensive.soldPrice.toLocaleString()}</p>
                                </div>
                             </div>
                          ) : <p className="text-slate-600 italic">No players sold yet</p>}
                       </div>
                       <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/30 flex flex-col justify-center text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest">Completion</p>
                          <p className="text-4xl font-black text-white">{soldPlayers.length + unsoldPlayers.length}/{players.length}</p>
                       </div>
                    </div>

                    <div className="bg-slate-900/20 rounded-3xl border border-slate-800 p-6">
                       <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                         Transaction History
                       </h3>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {roundHistory.length === 0 ? (
                          <div className="py-12 text-center opacity-20 italic font-black uppercase tracking-widest text-xs">Waiting for opening bid</div>
                        ) : (
                          roundHistory.map((h, i) => (
                            <div key={i} className={`flex justify-between items-center p-4 rounded-xl transition-all ${i === 0 ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-lg' : 'opacity-40 border border-transparent'}`}>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600 font-black text-xs">#{roundHistory.length - i}</span>
                                <span className="font-bold text-sm uppercase text-white">{h.team}</span>
                              </div>
                              <span className={`font-black text-lg ${i === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>₹{h.bid.toLocaleString()}</span>
                            </div>
                          ))
                        )}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CENTER PLAYER CARD */}
        <div className="flex-1 bg-[#0f1b2d] border border-slate-700 rounded-xl overflow-y-auto p-4 md:p-8 flex flex-col justify-between shadow-2xl relative min-w-0 mb-16 md:mb-0">
          {player ? (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              {/* HEADER ROW: responsive — stacks on mobile, row on md+ */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch p-4 md:p-6 bg-slate-910/40 rounded-2xl border border-slate-700/50 shadow-inner">
                {/* 1. PHOTO */}
                <div className="w-full md:w-[35%] flex justify-center items-center">
                  <div className="relative group/photo w-[140px] h-[180px] sm:w-[160px] sm:h-[200px] md:w-[180px] md:h-[220px] rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-800 ring-4 ring-black/20">
                    <Image
                      src={player.image} alt={player.name} fill className={`object-cover ${player.status !== 'available' ? 'grayscale opacity-50' : ''}`} unoptimized={true}
                      onError={(e) => { e.target.src = player.placeholder; }}
                    />
                    
                    {/* Photo Edit Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                      <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-md transition-all flex items-center gap-2 group/btn">
                         <span className="text-[10px] font-black uppercase tracking-widest text-white">Upload New Photo</span>
                         <input 
                           type="file" 
                           className="hidden" 
                           accept="image/*" 
                           onChange={(e) => handleImageUpload(e, (url) => handlePlayerUpdate(player.id, 'imageUrl', url))} 
                         />
                         <span className="group-hover/btn:scale-110 transition-transform">📸</span>
                      </label>
                      <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest italic">Supports JPG, PNG, WEBP</p>
                    </div>

                    {/* STAMP OVERLAY */}
                    {player.status === "sold" && (
                      <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] animate-in zoom-in duration-300">
                        <div className="border-4 border-emerald-500 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                          <span className="text-emerald-500 text-2xl font-black italic">SOLD</span>
                        </div>
                      </div>
                    )}
                    {player.status === "unsold" && (
                      <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] animate-in zoom-in duration-300">
                        <div className="border-4 border-red-600 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                          <span className="text-red-600 text-xl font-black uppercase italic">Unsold</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. PLAYER INFORMATION */}
                <div className="w-full md:w-[45%] flex flex-col justify-center space-y-4 md:px-4 md:border-x md:border-slate-800/50">
                  <div>
                    {player.status === "available" || player.status === "auction" ? (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full w-fit animate-pulse mb-3">
                        <span className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span>
                        <p className="text-red-500 text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase">LIVE AUCTION</p>
                      </div>
                    ) : (
                      <div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full w-fit mb-3">
                        <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase italic">PLAYER STATUS: COMPLETED</p>
                      </div>
                    )}
                    
                    {editingPlayerField === 'name' ? (
                      <div className="flex items-center gap-2 max-w-full overflow-hidden">
                        <input
                          autoFocus
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'name', tempValue)}
                          className="bg-slate-900 border border-emerald-500 rounded-xl px-3 py-1.5 text-xl sm:text-2xl font-black text-white flex-1 min-w-0 uppercase tracking-tighter"
                        />
                        <button onClick={() => handlePlayerUpdate(player.id, 'name', tempValue)} className="shrink-0 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all">✓</button>
                        <button onClick={() => setEditingPlayerField(null)} className="shrink-0 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 group/playername">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none text-white mb-2 drop-shadow-md">{player.name}</h1>
                        <button 
                          onClick={() => { setEditingPlayerField('name'); setTempValue(player.name); }}
                          className="opacity-0 group-hover/playername:opacity-100 text-xl text-emerald-500 hover:text-emerald-400 transition-opacity"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Role */}
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Role</p>
                      {editingPlayerField === 'role' ? (
                        <div className="flex items-center gap-1">
                          <input 
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'role', tempValue)}
                            className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white uppercase w-32"
                          />
                          <button onClick={() => handlePlayerUpdate(player.id, 'role', tempValue)} className="text-emerald-500 text-sm">✓</button>
                          <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/role">
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded bg-slate-800 border border-slate-700 ${getRoleColor(player.role)} shadow-lg`}>{player.role}</span>
                          <button onClick={() => { setEditingPlayerField('role'); setTempValue(player.role); }} className="opacity-0 group-hover/role:opacity-100 text-[10px] text-emerald-500">✎</button>
                        </div>
                      )}
                    </div>

                    {/* Base Price */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Base Price</p>
                      {editingPlayerField === 'basePrice' ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'basePrice', Number(tempValue))}
                            className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white w-20"
                          />
                          <button onClick={() => handlePlayerUpdate(player.id, 'basePrice', Number(tempValue))} className="text-emerald-500 text-sm">✓</button>
                          <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/price">
                          <span className="text-sm text-gray-400 font-black uppercase tracking-widest">₹{player.basePrice}</span>
                          <button onClick={() => { setEditingPlayerField('basePrice'); setTempValue(player.basePrice); }} className="opacity-0 group-hover/price:opacity-100 text-[10px] text-emerald-500">✎</button>
                        </div>
                      )}
                    </div>

                    {/* Town/Village */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Town / Village</p>
                      {editingPlayerField === 'village' ? (
                        <div className="flex items-center gap-1 pr-2">
                          <input 
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'village', tempValue)}
                            className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white flex-1 italic min-w-0"
                          />
                          <button onClick={() => handlePlayerUpdate(player.id, 'village', tempValue)} className="text-emerald-500 text-sm shrink-0">✓</button>
                          <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm shrink-0">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/village">
                          <p className="text-sm text-emerald-400 font-black italic">{player.village}</p>
                          <button onClick={() => { setEditingPlayerField('village'); setTempValue(player.village); }} className="opacity-0 group-hover/village:opacity-100 text-[10px] text-emerald-500">✎</button>
                        </div>
                      )}
                    </div>

                    {/* DOB/Age */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">DOB / Age</p>
                      <div className="flex items-center gap-3">
                        {editingPlayerField === 'dob' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              autoFocus
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'dob', tempValue)}
                              className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white w-24"
                            />
                            <button onClick={() => handlePlayerUpdate(player.id, 'dob', tempValue)} className="text-emerald-500 text-xs">✓</button>
                            <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/dob">
                            <p className="text-sm text-white font-black">{player.dob}</p>
                            <button onClick={() => { setEditingPlayerField('dob'); setTempValue(player.dob); }} className="opacity-0 group-hover/dob:opacity-100 text-[10px] text-emerald-500">✎</button>
                          </div>
                        )}
                        
                        {editingPlayerField === 'age' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              autoFocus
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'age', Number(tempValue))}
                              className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white w-12"
                            />
                            <button onClick={() => handlePlayerUpdate(player.id, 'age', Number(tempValue))} className="text-emerald-500 text-xs">✓</button>
                            <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group/age">
                            <p className="text-xs text-slate-500 font-bold">({player.age} yrs)</p>
                            <button onClick={() => { setEditingPlayerField('age'); setTempValue(player.age); }} className="opacity-0 group-hover/age:opacity-100 text-[10px] text-emerald-500">✎</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Styles */}
                    <div className="col-span-2 space-y-2 mt-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Playing Styles</p>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] text-slate-500 uppercase font-black">Batting</p>
                          {editingPlayerField === 'battingStyle' ? (
                            <div className="flex items-center gap-1">
                              <input 
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'battingStyle', tempValue)}
                                className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white w-32"
                              />
                              <button onClick={() => handlePlayerUpdate(player.id, 'battingStyle', tempValue)} className="text-emerald-500">✓</button>
                              <button onClick={() => setEditingPlayerField(null)} className="text-red-500">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/batstyle">
                              <p className="text-sm text-white font-black">{player.battingStyle}</p>
                              <button onClick={() => { setEditingPlayerField('battingStyle'); setTempValue(player.battingStyle); }} className="opacity-0 group-hover/batstyle:opacity-100 text-[10px] text-emerald-500">✎</button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] text-slate-500 uppercase font-black">Bowling</p>
                          {editingPlayerField === 'bowlingStyle' ? (
                            <div className="flex items-center gap-1">
                              <input 
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'bowlingStyle', tempValue)}
                                className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white w-32"
                              />
                              <button onClick={() => handlePlayerUpdate(player.id, 'bowlingStyle', tempValue)} className="text-emerald-500">✓</button>
                              <button onClick={() => setEditingPlayerField(null)} className="text-red-500">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/bowlstyle">
                              <p className="text-sm text-slate-400 font-bold italic">{player.bowlingStyle}</p>
                              <button onClick={() => { setEditingPlayerField('bowlingStyle'); setTempValue(player.bowlingStyle); }} className="opacity-0 group-hover/bowlstyle:opacity-100 text-[10px] text-emerald-500">✎</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. DYNAMIC STATUS PANEL */}
                <div className="w-full md:w-[20%] bg-slate-900/80 rounded-2xl border border-slate-700/50 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-2xl group">
                  {player.status === "available" || player.status === "auction" ? (
                    <>
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                      <p className="text-emerald-500/60 uppercase tracking-[0.3em] text-[10px] font-black mb-2">Current Highest Bid</p>
                      <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black text-emerald-400 tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] ${bidPulse ? 'bid-animation' : ''}`}>
                        ₹{currentBid.toLocaleString()}
                      </h1>
                      {highestBidder && (
                        <div className="mt-4 flex flex-col items-center">
                          <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg">
                            <div className="w-5 h-5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                               <img src={teams.find(t=>t.id === highestBidder)?.logoUrl} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">{teams.find(t=>t.id === highestBidder)?.name}</span>
                          </div>
                          <button onClick={undoLastBid} className="text-[10px] text-gray-600 hover:text-white mt-3 uppercase underline font-black transition-colors">Undo Last Bid</button>
                        </div>
                      )}
                    </>
                  ) : player.status === "sold" ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-500">
                      <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">FINAL PRICE</p>
                      <h1 className="text-5xl font-black text-white leading-none mb-3 drop-shadow-lg">₹{player.soldPrice?.toLocaleString()}</h1>
                      <div className="bg-emerald-600 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/30">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest italic">SOLD TO {teams.find(t=>t.id === player.team)?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center animate-in fade-in duration-500">
                      <div className="w-12 h-12 bg-red-950/30 rounded-full flex items-center justify-center mb-3 mx-auto border border-red-900/50">
                         <span className="text-2xl">🚫</span>
                      </div>
                      <h1 className="text-4xl font-black text-red-500 leading-none uppercase italic">Unsold</h1>
                      <p className="text-[10px] text-red-400/50 uppercase font-black mt-3 tracking-widest">No Bids Placed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LOWER SECTION: INTERACTIVE CONTROLS */}
              <div className="flex-1 flex flex-col min-h-0">
                {player.status === "available" || player.status === "auction" ? (
                  <div className="flex flex-col h-full gap-3 min-h-0">
                    {/* BID INCREMENT CONTROL */}
                    <div className="flex items-center gap-2 px-2 shrink-0">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bid Rise Amount:</span>
                       <div className="flex items-center gap-1">
                          <span className="text-slate-600 text-[10px] font-black">₹</span>
                          <input 
                            type="number"
                            value={bidIncrement}
                            onChange={(e) => setBidIncrement(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-black text-emerald-400 w-24 focus:border-emerald-500 outline-none transition-all shadow-inner"
                            placeholder="100"
                          />
                          <button onClick={() => setBidIncrement(100)} className="text-[8px] font-black text-slate-500 hover:text-white uppercase ml-1 transition-colors">Reset</button>
                       </div>
                    </div>

                    {/* MAIN ACTIONS (Top Bar) */}
                    <div className="flex flex-col sm:flex-row gap-3 min-h-fit shrink-0">
                      <button 
                        onClick={sellPlayer} 
                        disabled={!highestBidder} 
                        className={`flex-1 group py-4 rounded-xl font-black transition-all active:scale-95 uppercase flex items-center justify-center gap-2 border-2 shadow-lg ${
                          highestBidder 
                            ? "bg-emerald-600 border-emerald-500 shadow-emerald-900/20" 
                            : "bg-slate-800/50 text-slate-600 border-slate-700 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <span className="text-lg md:text-xl">🔨 SELL PLAYER</span>
                        {highestBidder && <span className="text-[10px] font-bold text-emerald-100 opacity-80 bg-black/20 px-2 py-0.5 rounded-full">₹{currentBid.toLocaleString()}</span>}
                      </button>

                      <button 
                        onClick={unsoldPlayer} 
                        className="sm:w-[30%] bg-red-600 hover:bg-red-500 py-3 rounded-xl font-black border-2 border-red-400/30 shadow-lg text-white text-base md:text-lg italic uppercase active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-base opacity-70">🚫</span>
                        <span>UNSOLD</span>
                      </button>
                    </div>

                    {/* TEAM BUTTONS — responsive grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-1">
                      {teams.map(team => (
                        <button 
                          key={team.id} 
                          onClick={() => placeBid(team.id)} 
                          disabled={!canPlaceBid || highestBidder === team.id}
                          className={`relative rounded-xl font-black uppercase transition-all duration-200 border-b-4 border-black/30 flex items-stretch min-h-[65px] overflow-hidden ${team.color} ${highestBidder === team.id ? 'ring-2 ring-emerald-400 scale-[1.05] shadow-2xl z-10' : 'opacity-90 hover:opacity-100'} disabled:opacity-30 disabled:grayscale`}
                        >
                          {/* Logo Half */}
                          <div className="w-1/2 bg-black/10 flex items-center justify-center p-2 border-r border-black/5">
                             <img src={team.logoUrl} className="w-full h-full object-contain drop-shadow-md" />
                          </div>
                          {/* Info Half */}
                          <div className="w-1/2 flex flex-col items-center justify-center p-1 bg-white/5 backdrop-blur-sm">
                             <span className="text-[8px] block truncate w-full leading-tight mb-1 opacity-70 tracking-widest">{team.shortName || team.name}</span>
                             <span className="text-[11px] block font-black leading-none text-white drop-shadow-md">₹{team.remainingBudget.toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-full h-px bg-slate-800"></div>
                    <button 
                      onClick={nextPlayer}
                      className="w-full bg-white text-black hover:bg-emerald-400 hover:text-white py-6 rounded-2xl font-black text-2xl transition-all shadow-2xl hover:scale-[1.01] active:scale-95 uppercase tracking-tighter"
                    >
                      Next Player in Auction →
                    </button>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Review results in analytics panel</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-10 text-5xl border border-slate-700 animate-pulse">🏆</div>
              <h2 className="text-5xl font-black mb-6 tracking-tighter">Auction Concluded</h2>
              <p className="text-gray-500 text-lg max-w-md">The hammer has fallen. All players have been presented for bidding.</p>
              <Link href="/auction" className="mt-12 bg-slate-800 hover:bg-emerald-600 px-10 py-4 rounded-2xl font-bold transition-all border border-slate-700">Back to Dashboard</Link>
            </div>
          )}
        </div>

      </div>
      
      {/* Compact Break Control - Fixed Top Right */}
      <CompactBreakControl 
        socket={socket}
        onBreakStart={(breakData) => {
          console.log('Break started:', breakData)
        }}
        onBreakEnd={() => {
          console.log('Break ended')
        }}
      />
    </div>
  )
}

export default function LiveAuctionPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-6">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="font-black tracking-[0.5em] text-emerald-500 animate-pulse uppercase">Syncing Live Data</p>
       </div>
    }>
      <LiveAuctionContent />
    </Suspense>
  )
}
