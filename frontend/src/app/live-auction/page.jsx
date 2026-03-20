"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { io } from "socket.io-client"
import BreakControlPanel from '../../components/BreakControlPanel'
import CompactBreakControl from '../../components/CompactBreakControl'
import SplashScreen from '../../components/SplashScreen'
import ImageCropperModal from '../../components/ImageCropperModal'
import { uploadToS3 } from "../../lib/uploadToS3"

// Module-level socket instance to persist across React re-renders in development
let globalSocket = null

function LiveAuctionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const tournamentId = searchParams.get("id")
  const playerParam = searchParams.get("player")
  const initialPlayerIndex = playerParam ? parseInt(playerParam) - 1 : 0 // Convert 1-based to 0-based

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [auctionBg, setAuctionBg] = useState('/backgrounds/auction-bg.jpg')

  useEffect(() => {
    const fetchBg = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backgrounds/auction_bg`)
        if (res.ok) {
          const data = await res.json()
          if (data.imageUrl) setAuctionBg(data.imageUrl)
          // else: no custom background set, use default silently
        }
        // 404 = no custom background configured, skip silently
      } catch (_) {
        // Network error, skip silently — default bg will be used
      }
    }
    fetchBg()
  }, [])
  const [currentTournamentId, setCurrentTournamentId] = useState(tournamentId)
  const [activeAssets, setActiveAssets] = useState({
    splashUrl: "",
    backgroundUrl: "/backgrounds/auction-bg.jpg",
    badges: { leftBadge: "", rightBadge: "" }
  });

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
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [showRoundTransition, setShowRoundTransition] = useState(null) // { label, subtitle }

  // Edge Case 1: Debounce / Cooldown
  const BID_COOLDOWN = 600;

  // ALL useEffect HOOKS MUST ALSO BE CALLED BEFORE CONDITIONAL RETURNS
  // Redirect non-admin users (only once session is resolved)
  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user?.role !== "admin") {
      router.push("/auctions")
    }
  }, [session, status, router])

  // Safety timeout — if data never loads, stop spinning after 12s
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 12000)
    return () => clearTimeout(t)
  }, [])

  // Socket connection setup - uses global socket to survive React Strict Mode
  useEffect(() => {
    // Only connect if API_URL is available and not already connected globally
    if (!process.env.NEXT_PUBLIC_API_URL || globalSocket) {
      if (globalSocket) setSocket(globalSocket)
      return
    }

    const s = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    globalSocket = s
    setSocket(s)

    // Connection events
    s.on('connect', () => {
      console.log('✅ Socket connected')
    })

    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    s.on('playerUpdate', (data) => {
      console.log('Player update received via socket:', data.id);
      setPlayers(prev => prev.map(p => {
        if (p._id === data.id || p.id === data.id) {
          return { ...p, ...data, photo: data.photo, imageUrl: data.imageUrl };
        }
        return p;
      }));
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    // No cleanup - socket persists for the lifetime of the page
  }, [])

  // Tournament validation
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        let targetTournamentId = tournamentId

        const controller = new AbortController()
        const abortTimer = setTimeout(() => controller.abort(), 30000)

        let data = null

        // If a tournament ID is in the URL, try it first
        if (targetTournamentId) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${targetTournamentId}`, { signal: controller.signal })
          if (res.ok) {
            const json = await res.json()
            if (json && json.tournament) {
              data = json
              setCurrentTournamentId(targetTournamentId)
            }
          } else {
            console.warn(`Tournament ID "${targetTournamentId}" not found (${res.status}), falling back to active tournament...`)
          }
        }

        // Fallback: fetch active tournament if URL id was missing or invalid
        if (!data) {
          const activeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/status/active`, { signal: controller.signal })
          if (activeRes.ok) {
            const activeData = await activeRes.json()
            if (activeData && activeData.tournament) {
              data = activeData
              targetTournamentId = activeData.tournament._id
              setCurrentTournamentId(targetTournamentId)
              console.log('Loaded active tournament:', targetTournamentId)
            }
          }
        }

        clearTimeout(abortTimer)

        if (!data || !data.tournament) throw new Error("No active tournament found")

        const tournament = data.tournament;
        setConfig({
          name: tournament.name,
          baseBudget: tournament.baseBudget,
          totalTeams: tournament.numTeams
        })

        // Apply Dynamic Assets if they exist
        if (tournament.assets) {
           setActiveAssets(prev => ({
              ...prev,
              splashUrl: tournament.assets.splashUrl || "",
              backgroundUrl: tournament.assets.backgroundUrl || "/backgrounds/auction-bg.jpg",
              badges: tournament.assets.badges || { leftBadge: "", rightBadge: "" }
           }));
           if (tournament.assets.backgroundUrl) setAuctionBg(tournament.assets.backgroundUrl);
        }

        // Load teams and players
        setTeams(data.teams.map(t => ({
          id: t._id,
          name: t.name,
          shortName: t.shortName || t.name,
          logoUrl: t.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`,
          totalBudget: data.tournament.baseBudget,
          remainingBudget: t.remainingBudget,
          players: data.players.filter(p => p.team === t._id),
          color: t.color || "bg-blue-600"
        })))

        // Filter: Keep non-icon players (auction players only)
        const auctionPlayers = data.players.filter(p => !p.isIcon)

        // Create auction-only Application IDs (01-150 for auction players only)

        // Inject ROUND 02 marker between regular players and unsold players
        const regularAppIds = auctionPlayers
          .filter(p => p.status !== 'unsold')
          .map(p => p.applicationId || 0);
        const maxRegularAppId = regularAppIds.length > 0 ? Math.max(...regularAppIds) : 0;
        const hasUnsoldInSecondRound = auctionPlayers.some(p => p.status === 'unsold' && (p.applicationId || 0) > maxRegularAppId);

        let enrichedPlayers = auctionPlayers.map(p => ({
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
          status: p.status || "available",
          battingStyle: p.battingStyle || "Right Hand",
          bowlingStyle: p.bowlingStyle || "-",
          isIcon: p.isIcon || false,
          applicationId: p.applicationId ? p.applicationId.toString().padStart(2, '0') : "-",
          _rawAppId: p.applicationId || 0
        }));

        // Find the splice point: first player whose applicationId > maxRegularAppId
        if (hasUnsoldInSecondRound) {
          const spliceIdx = enrichedPlayers.findIndex(p => (p._rawAppId || 0) > maxRegularAppId && p.status === 'unsold');
          if (spliceIdx !== -1) {
            enrichedPlayers.splice(spliceIdx, 0, {
              type: 'ROUND',
              label: 'ROUND 02',
              subtitle: 'UNSOLD PLAYERS',
              id: '__round_02__'
            });
          }
        }

        setPlayers(enrichedPlayers);

        // Use player param to find by Application ID. Skip ROUND markers when searching.
        let targetIdx = 0
        if (playerParam) {
          const appId = playerParam.toString().padStart(2, '0')
          const foundIdx = enrichedPlayers.findIndex(p => !p.type && (p.applicationId || "").toString().padStart(2, '0') === appId)
          if (foundIdx !== -1) targetIdx = foundIdx
        } else {
          // Find first item that is NOT sold (skip ROUND markers)
          const nextIdx = enrichedPlayers.findIndex(p => !p.type && p.status !== "sold")
          targetIdx = nextIdx !== -1 ? nextIdx : 0
        }
        setCurrentPlayerIndex(targetIdx)
        setCurrentBid(0)

        const sold = auctionPlayers.filter(p => p.status === "sold")
        setResults(sold.map(p => ({
          player: p.name,
          team: data.teams.find(t => t._id === p.team)?.name || "-",
          price: p.soldPrice,
          status: "SOLD",
          color: "text-violet-400 bg-violet-500/10"
        })))

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch tournament:', err)
        setError('Failed to load tournament')
        setLoading(false)
      }
    }

    fetchTournament()
  }, [tournamentId, router])

  // Listen for real-time updates from other devices via Socket.io
  useEffect(() => {
    if (!socket) return

    // Listen for auction updates from other devices
    socket.on('auctionUpdate', (data) => {
      console.log('📡 Received auction update:', data)

      // Get current player from state (using functional update to access latest state)
      setPlayers(currentPlayers => {
        const currentPlayer = currentPlayers[currentPlayerIndex]

        if (data.type === 'bid' && data.playerId === currentPlayer?.id) {
          // Update bid if it's for the current player
          setCurrentBid(data.bidAmount)
          setHighestBidder(data.teamId)
          setRoundHistory(prev => [{ team: data.teamName, teamId: data.teamId, bid: data.bidAmount }, ...prev])
        } else if (data.type === 'sold' && data.playerId === currentPlayer?.id) {
          // Update sold status - return updated players array
          return currentPlayers.map(p =>
            p.id === data.playerId
              ? { ...p, status: 'sold', soldPrice: data.soldPrice, team: data.teamId }
              : p
          )
        }

        return currentPlayers
      })
    })

    return () => {
      socket.off('auctionUpdate')
    }
  }, [socket, currentPlayerIndex])

  const player = players[currentPlayerIndex];
  const isRoundMarker = player?.type === 'ROUND';

  // Reset bidding state when player changes
  useEffect(() => {
    setCurrentBid(0)
    setHighestBidder(null)
    setRoundHistory([])
    if (player) setBidIncrement(player.basePrice || 100)
  }, [currentPlayerIndex])

  // Keep overlay synced with latest player/state (including player navigation with no bids yet)
  useEffect(() => {
    if (!socket) return

    const activePlayer = players[currentPlayerIndex]
    if (!activePlayer) return

    const topTeam = teams.find(t => t.id === highestBidder)
    const overlayTeams = teams.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logoUrl: t.logoUrl,
      remainingBudget: t.remainingBudget,
      playersCount: t.players?.length || 0,
      maxPlayers: config.squadSize || 15
    }))

    socket.emit("auctionUpdate", {
      player: activePlayer,
      currentBid: currentBid,
      highestBidder: topTeam?.name || null,
      highestBidderLogo: topTeam?.logoUrl || null,
      tournamentName: config.name,
      teams: overlayTeams,
      roundHistory: roundHistory.slice(0, 5),
      timestamp: Date.now()
    })
  }, [socket, players, currentPlayerIndex, currentBid, highestBidder, teams, config.name, config.squadSize, roundHistory])

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
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            View Live Auctions
          </Link>
        </div>
      </div>
    )
  }

  // Rest of component logic starts here

  // Edge Case 7: Only allow bid if player is available or was previously unsold
  const canPlaceBid = player && !isRoundMarker && (player.status === "available" || player.status === "auction" || player.status === "unsold");

  const placeBid = (teamId) => {
    // Edge Case 1: Double-click prevention
    const now = Date.now()
    if (now - lastBidTime < BID_COOLDOWN) return
    if (!canPlaceBid) return

    const riseAmount = Number(bidIncrement) || 0
    
    // Validation 1: No negative or zero bids
    if (riseAmount <= 0) {
      alert("Please enter a valid positive bid amount.")
      return
    }

    // Validation 2: Ensure it follows base price or current bid rules
    let newBid = riseAmount
    if (currentBid === 0) {
      // First bid must be at least the base price
      if (riseAmount < player.basePrice) {
        alert(`The first bid must be at least the base price (₹${player.basePrice.toLocaleString()}).`)
        return
      }
    } else {
      // Subsequent bids must be higher than current
      if (riseAmount <= currentBid) {
        alert(`New bid (₹${riseAmount.toLocaleString()}) must be strictly higher than current bid (₹${currentBid.toLocaleString()}).`)
        return
      }
    }
    
    // Check if team has enough budget
    const biddingTeam = teams.find(t => t.id === teamId)
    if (biddingTeam.remainingBudget < newBid) {
      alert(`${biddingTeam.name} has insufficient budget!`)
      return
    }

    setLastBidTime(now)
    const bidAmount = newBid 
    setCurrentBid(bidAmount)
    setHighestBidder(teamId)
    setBidPulse(true)
    setTimeout(() => setBidPulse(false), 400)

    setRoundHistory([{ team: biddingTeam.name, teamId: teamId, bid: bidAmount }, ...roundHistory])

    // Broadcast bid to all connected devices via socket
    if (socket) {
      // Auto-stop break if any bid is placed
      socket.emit('breakTimeEnd');
      
      socket.emit('auctionUpdate', {
        player: player,
        currentBid: bidAmount,
        highestBidder: teamId,
        highestBidderLogo: biddingTeam.logoUrl,
        tournamentName: config.name,
        teams: teams,
        roundHistory: [{ team: biddingTeam.name, teamId: teamId, bid: bidAmount }, ...roundHistory],
        timestamp: Date.now()
      })
    }

    // Auto-prepare next bid price (Current + 100)
    setBidIncrement(bidAmount + 100)

    // Reset increment to default 100 after bid
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
      if (player) setBidIncrement(player.basePrice)
    } else {
      const prevBid = newHistory[0].bid
      setCurrentBid(prevBid)
      setHighestBidder(newHistory[0].teamId)
      setBidIncrement(prevBid + 100)
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

    // Prevent selling for 0 or negative amount
    if (currentBid <= 0) {
      alert("Cannot sell player for ₹0 or less. Please place a bid first.")
      return
    }

    if (!confirm(`Sell ${player.name} to ${teams.find(t => t.id === highestBidder)?.name} for ₹${currentBid}?`)) return

    // Edge Case 6: SOLD clicked twice prevention (local check)
    if (player.status === "sold") return

    // Get current team and calculate correct new budget
    const winningTeam = teams.find(t => t.id === highestBidder)
    const currentBudget = winningTeam?.remainingBudget || 0
    const maxBudget = config.baseBudget || 10000

    // Ensure budget doesn't go below 0
    const newBudget = Math.max(currentBudget - currentBid, 0)

    // Update locally immediately
    const updatedTeams = teams.map((team) =>
      team.id === highestBidder
        ? {
          ...team,
          remainingBudget: newBudget,
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
      color: "text-violet-400 bg-violet-500/10"
    }, ...results])

    // Save to backend - Update BOTH player and team budget together
    try {
      // Save both in parallel for reliability
      const [playerRes, teamRes] = await Promise.all([
        // Update player with team assignment
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${player.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "sold",
            soldPrice: currentBid,
            team: highestBidder
          })
        }),
        // Update team remaining budget
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${highestBidder}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remainingBudget: newBudget
          })
        })
      ])

      if (playerRes.ok && teamRes.ok) {
        console.log(`✅ SAVED: ${player.name} sold to ${winningTeam?.name} for ₹${currentBid}, Team budget: ₹${newBudget}`)

        // Broadcast sale to all connected devices via socket
        if (socket) {
          // Auto-stop break on any sale
          socket.emit('breakTimeEnd');
          
          const soldPlayer = { ...player, status: 'sold', soldPrice: currentBid, team: highestBidder }
          socket.emit('auctionUpdate', {
            player: soldPlayer,
            currentBid: currentBid,
            highestBidder: highestBidder,
            highestBidderLogo: winningTeam?.logoUrl,
            tournamentName: config.name,
            teams: updatedTeams,
            roundHistory: roundHistory,
            timestamp: Date.now()
          })
        }
      } else {
        console.error("❌ Failed to save sale data:",
          !playerRes.ok ? "Player update failed" : "",
          !teamRes.ok ? "Team budget update failed" : ""
        )
      }
    } catch (err) {
      console.error("Error saving sale data:", err)
    }

    // Stay on player to show banner
  }

  const unsoldPlayer = async () => {
    if (!player) return
    if (player.status === "sold" || player.status === "unsold") return

    const updatedPlayers = [...players]
    const unsoldPlayerData = { ...player, status: "unsold", soldPrice: 0, team: null }
    updatedPlayers[currentPlayerIndex] = unsoldPlayerData;
    setPlayers(updatedPlayers);
    
    setResults([{
      player: player.name,
      team: "-",
      price: "-",
      status: "UNSOLD",
      color: "text-red-400 bg-red-500/10"
    }, ...results])

    // Broadcast unsold state to overlay
    if (socket) {
      socket.emit('breakTimeEnd');
      socket.emit('auctionUpdate', {
        player: unsoldPlayerData,
        currentBid: 0,
        highestBidder: null,
        highestBidderLogo: null,
        tournamentName: config.name,
        teams: teams,
        roundHistory: roundHistory,
        timestamp: Date.now()
      })
    }

    // Persist unsold status + move to end on backend
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "unsold",
          soldPrice: 0,
          team: null
        })
      })

      if (res.ok) {
        const data = await res.json();
        if (data && data.applicationId) {
           const newAppId = data.applicationId;
           // Update local applicationId and inject ROUND marker if needed
           setPlayers(prev => {
              const updated = prev.map(p => 
                p.id === player.id 
                  ? { ...p, applicationId: newAppId.toString().padStart(2, '0'), _rawAppId: newAppId } 
                  : p
              );

              // Check if ROUND marker already exists
              const hasRoundMarker = updated.some(p => p.type === 'ROUND');
              if (hasRoundMarker) return updated;

              // Find where the unsold "2nd round" starts (first item with appId > original count)
              const regularMax = Math.max(...updated.filter(p => !p.type && p.status !== 'unsold').map(p => p._rawAppId || 0), 0);
              const insertIdx = updated.findIndex(p => !p.type && (p._rawAppId || 0) > regularMax);

              if (insertIdx !== -1) {
                const withMarker = [...updated];
                withMarker.splice(insertIdx, 0, {
                  type: 'ROUND',
                  label: 'ROUND 02',
                  subtitle: 'UNSOLD PLAYERS',
                  id: '__round_02__'
                });
                return withMarker;
              }
              return updated;
           });
        }
      } else {
        console.error("❌ Failed to save UNSOLD status for player:", player.name)
      }
    } catch (err) {
      console.error("Error saving UNSOLD status:", err)
    }
  }

  // Revert a sold player - put back to auction and refund team
  const revertSale = async () => {
    if (!player) return
    if (player.status !== "sold" || player.isIcon) return

    const soldPrice = player.soldPrice
    const originalTeamId = player.team

    if (!confirm(`Revert sale of ${player.name}?\n\nThis will:\n- Remove player from ${teams.find(t => t.id === originalTeamId)?.name}\n- Refund ₹${soldPrice?.toLocaleString()} to the team\n- Put player back in auction\n\nContinue?`)) return

    // Get the original team and calculate correct refund
    const originalTeam = teams.find(t => t.id === originalTeamId)
    const currentBudget = originalTeam?.remainingBudget || 0
    const maxBudget = config.baseBudget || 10000

    // Calculate new budget (ensure it doesn't exceed max)
    const newBudget = Math.min(currentBudget + soldPrice, maxBudget)

    // Update locally
    const updatedTeams = teams.map((team) =>
      team.id === originalTeamId
        ? {
          ...team,
          remainingBudget: newBudget,
          players: team.players.filter(p => p.id !== player.id)
        }
        : team
    )

    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = {
      ...player,
      soldPrice: 0,
      team: null,
      status: "available"
    }

    setTeams(updatedTeams)
    setPlayers(updatedPlayers)

    // Update backend - Reset BOTH player and refund team budget together
    try {
      const originalTeam = updatedTeams.find(t => t.id === originalTeamId)
      const refundedBudget = originalTeam?.remainingBudget

      // Save both in parallel for reliability
      const [playerRes, teamRes] = await Promise.all([
        // Reset player to available
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${player.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "available",
            soldPrice: 0,
            team: null
          })
        }),
        // Refund team budget
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${originalTeamId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remainingBudget: newBudget
          })
        })
      ])

      if (playerRes.ok && teamRes.ok) {
        console.log(`✅ REVERTED: ${player.name} back to auction, ${originalTeam?.name} budget refunded to ₹${refundedBudget}`)

        // Refresh teams data to ensure player is removed from team squad
        try {
          const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${currentTournamentId}`)
          if (teamsRes.ok) {
            const data = await teamsRes.json()
            setTeams(data.teams?.map(t => ({
              id: t._id,
              name: t.name,
              shortName: t.shortName || t.name,
              logoUrl: t.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`,
              totalBudget: data.tournament.baseBudget,
              remainingBudget: t.remainingBudget,
              players: data.players?.filter(p => p.team === t._id) || [],
              color: t.color || "bg-blue-600"
            })))
          }
        } catch (refreshErr) {
          console.error("Failed to refresh teams:", refreshErr)
        }
      } else {
        console.error("❌ Failed to revert sale:",
          !playerRes.ok ? "Player revert failed" : "",
          !teamRes.ok ? "Team refund failed" : ""
        )
      }
    } catch (err) {
      console.error("Error reverting sale:", err)
    }

    // Reset bidding state
    setCurrentBid(0)
    setHighestBidder(null)
  }

  const nextPlayer = () => {
    // Confirmation before accidental move if BID IS ACTIVE
    if (!isRoundMarker && currentPlayerIndex < players.length - 1 && currentPlayerIndex !== -1) {
      if (currentBid > 0 && player?.status === "available" && !confirm("Auction in progress. Discard bids and move to next player?")) return
    }

    if (socket) socket.emit('breakTimeEnd');

    const nextIdx = currentPlayerIndex + 1;
    if (nextIdx < players.length) {
      const nextItem = players[nextIdx];

      // If the next item is a ROUND marker, show the transition overlay
      if (nextItem?.type === 'ROUND') {
        setCurrentPlayerIndex(nextIdx);
        setCurrentBid(0);
        setHighestBidder(null);
        setRoundHistory([]);
        setShowRoundTransition({ label: nextItem.label, subtitle: nextItem.subtitle });
        // Auto-advance past the round marker after 3 seconds
        setTimeout(() => {
          setShowRoundTransition(null);
          setCurrentPlayerIndex(nextIdx + 1 < players.length ? nextIdx + 1 : nextIdx);
        }, 3500);
        return;
      }

      setCurrentPlayerIndex(nextIdx)
      setCurrentBid(0)
      setHighestBidder(null)
      setRoundHistory([])
      // Update URL with Application ID
      if (currentTournamentId && nextItem?.applicationId) {
        router.push(`/live-auction?id=${currentTournamentId}&player=${nextItem.applicationId}`, undefined, { shallow: true })
      }
    } else {
      setCurrentPlayerIndex(-1)
    }
  }

  const prevPlayer = () => {
    if (currentPlayerIndex > 0) {
      if (currentBid > 0 && !confirm("Auction in progress. Discard bids and move to previous player?")) return

      if (socket) socket.emit('breakTimeEnd');

      const prevIdx = currentPlayerIndex - 1
      const prevPlayer = players[prevIdx]
      setCurrentPlayerIndex(prevIdx)
      setCurrentBid(0)
      setHighestBidder(null)
      setRoundHistory([])
      // Update URL with Application ID
      if (currentTournamentId && prevPlayer?.applicationId) {
        router.push(`/live-auction?id=${currentTournamentId}&player=${prevPlayer.applicationId}`, undefined, { shallow: true })
      }
    }
  }

  const handleImageUpload = async (e, callback, folder = "players") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await uploadToS3(file, folder);
      callback(url);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
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

  const handleImageSave = async (newUrl) => {
    if (!player) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: newUrl })
      })
      if (res.ok) {
        // Update local state immediately
        setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, image: newUrl, imageUrl: newUrl, photo: { ...p.photo, s3: newUrl } } : p))
        
        // Broadcast to other devices
        if (socket) {
          socket.emit('auctionUpdate', {
            player: { ...player, image: newUrl, imageUrl: newUrl, photo: { ...player.photo, s3: newUrl } },
            currentBid,
            highestBidder,
            tournamentName: config.name,
            teams,
            roundHistory,
            timestamp: Date.now()
          })
        }
        console.log("✅ Player photo updated and synchronized")
      }
    } catch (err) {
      console.error("Failed to save cropped image:", err)
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
      <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      <p className="font-black tracking-[0.5em] text-violet-500 animate-pulse uppercase">Syncing Live Data</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
      <p className="text-4xl mb-6">🏏</p>
      <p className="text-xl font-bold mb-4">{error}</p>
      <div className="flex gap-4">
        <Link href="/auctions" className="bg-violet-600 hover:bg-violet-500 px-8 py-3 rounded-xl font-bold shadow-lg transition-colors">
          View Auctions
        </Link>
        {session?.user?.role === "admin" && (
          <Link href="/auction" className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-xl font-bold shadow-lg transition-colors">
            Create Tournament
          </Link>
        )}
      </div>
    </div>
  )

  const soldPlayers = players.filter(p => !p.type && p.status === "sold")
  const unsoldPlayers = players.filter(p => !p.type && p.status === "unsold")
  const mostExpensive = [...soldPlayers].sort((a, b) => b.soldPrice - a.soldPrice)[0]

  return (
    <div className="min-h-screen font-sans text-white overflow-hidden relative">

      {/* =========================================================
          ROUND TRANSITION OVERLAY (Full-Screen Cinematic)
      ========================================================= */}
      {showRoundTransition && (
        <div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, #1a0533 0%, #0a0015 60%, #000 100%)',
            animation: 'fadeInOut 3.5s ease forwards'
          }}
        >
          <style>{`
            @keyframes fadeInOut {
              0%   { opacity: 0; transform: scale(0.95); }
              15%  { opacity: 1; transform: scale(1); }
              80%  { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(1.02); }
            }
            @keyframes glowPulse {
              0%, 100% { text-shadow: 0 0 40px #a855f7, 0 0 80px #7c3aed; }
              50% { text-shadow: 0 0 80px #c084fc, 0 0 160px #a855f7, 0 0 240px #7c3aed; }
            }
            @keyframes slideUp {
              0% { opacity: 0; transform: translateY(30px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes countdownShrink {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: 188; }
            }
          `}</style>

          {/* Floating orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a855f7, transparent)', filter: 'blur(60px)', animation: 'glowPulse 2s ease infinite' }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(60px)', animation: 'glowPulse 2s ease infinite 1s' }} />

          {/* Countdown ring */}
          <div className="absolute top-8 right-8">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="4" />
              <circle
                cx="30" cy="30" r="26"
                fill="none" stroke="#a855f7" strokeWidth="4"
                strokeDasharray="163"
                strokeLinecap="round"
                strokeDashoffset="0"
                transform="rotate(-90 30 30)"
                style={{ animation: 'countdownShrink 3.5s linear forwards' }}
              />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center px-8" style={{ animation: 'slideUp 0.5s ease forwards' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-purple-400 mb-4">Auction Continues</p>
            <h1
              className="text-6xl sm:text-8xl font-black uppercase tracking-wider text-white mb-4"
              style={{ animation: 'glowPulse 1.5s ease infinite', fontStyle: 'italic' }}
            >
              {showRoundTransition.label}
            </h1>
            <div className="flex items-center gap-3 justify-center">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-purple-500"></div>
              <p className="text-xl font-black uppercase tracking-[0.4em] text-purple-300">
                {showRoundTransition.subtitle}
              </p>
              <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-purple-500"></div>
            </div>
            <p className="text-[10px] text-purple-500/60 font-black uppercase tracking-widest mt-6 animate-pulse">Starting shortly...</p>
          </div>
        </div>
      )}

      {/* Content Layer - Main UI stays here, untouched */}
      <div className="relative z-20 min-h-screen p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-6 flex flex-col overflow-hidden">
        {/* HEADER - Responsive Layout */}
        <div className="mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <Link href="/auctions" className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-violet-500 whitespace-nowrap backdrop-blur-md min-h-[40px] flex items-center shadow-lg">
              ← Back to Auctions
            </Link>

            <div className="flex items-center gap-2">
              <CompactBreakControl 
                socket={socket} 
                onViewSquads={() => router.push(`/teams?tournament=${currentTournamentId}`)}
              />

              {/* Navigation Arrows */}
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

          <div className="flex items-center gap-4 lg:gap-8 grow justify-center">
            {activeAssets.badges?.leftBadge && (
              <div className="hidden sm:block w-12 h-12 lg:w-20 lg:h-20 relative">
                <img src={activeAssets.badges.leftBadge} className="w-full h-full object-contain drop-shadow-2xl" alt="L-Badge" />
              </div>
            )}
            
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-violet-500 font-black tracking-[0.4em] mb-0.5 opacity-60 uppercase animate-pulse">Live Broadcast</p>
              <h1 className="text-lg sm:text-2xl lg:text-4xl font-black tracking-tighter uppercase drop-shadow-2xl leading-tight">
                {config.name} <span className="text-violet-500 italic font-medium">AUCTION</span>
              </h1>
            </div>

            {activeAssets.badges?.rightBadge && (
              <div className="hidden sm:block w-12 h-12 lg:w-20 lg:h-20 relative">
                <img src={activeAssets.badges.rightBadge} className="w-full h-full object-contain drop-shadow-2xl" alt="R-Badge" />
              </div>
            )}
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
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'stats' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              title="Market Insights"
            >
              <span className="text-xl">📊</span>
            </button>
          </div>

          {/* MOBILE SIDEBAR PANEL (Bottom Bar Style) */}
          {!activeSidebar && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/40 backdrop-blur-xl border-t border-slate-700/50 flex justify-around items-center h-16 z-50 pb-[env(safe-area-inset-bottom)]">
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
              <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
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
                      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebar === 'stats' ? 'bg-violet-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
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
                              className={`border-b border-slate-800/50 transition-all hover:bg-white/10 cursor-pointer ${highestBidder === team.id ? 'bg-blue-600/10' : ''}`}
                              onClick={() => router.push(`/team/${team.id}${currentTournamentId ? `?tournament=${currentTournamentId}` : ''}`)}
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
                                <span className="text-sm font-black text-violet-400">₹{team.remainingBudget.toLocaleString()}</span>
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
                              <div className="w-14 h-14 bg-violet-500/20 rounded-2xl border border-violet-500/30 flex items-center justify-center text-3xl">🥇</div>
                              <div>
                                <p className="text-xl font-black text-white">{mostExpensive.name}</p>
                                <p className="text-2xl font-black text-violet-400">₹{mostExpensive.soldPrice.toLocaleString()}</p>
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
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
                          Transaction History
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {roundHistory.length === 0 ? (
                            <div className="py-12 text-center opacity-20 italic font-black uppercase tracking-widest text-xs">Waiting for opening bid</div>
                          ) : (
                            roundHistory.map((h, i) => (
                              <div key={i} className={`flex justify-between items-center p-4 rounded-xl transition-all ${i === 0 ? 'bg-violet-500/10 border border-violet-500/20 shadow-lg' : 'opacity-40 border border-transparent'}`}>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600 font-black text-xs">#{roundHistory.length - i}</span>
                                  <span className="font-bold text-sm uppercase text-white">{h.team}</span>
                                </div>
                                <span className={`font-black text-lg ${i === 0 ? 'text-violet-400' : 'text-slate-500'}`}>₹{h.bid.toLocaleString()}</span>
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
          <div className="flex-1 card auction-main overflow-y-auto p-4 md:p-8 flex flex-col justify-between relative min-w-0 mb-16 md:mb-0">
            {isRoundMarker ? (
              /* ---- ROUND MARKER VIEW ---- */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-6">
                <div className="w-24 h-24 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center text-5xl animate-pulse">🏏</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-purple-400 mb-2">Auction Continues</p>
                  <h2 className="text-5xl font-black uppercase italic text-white" style={{ textShadow: '0 0 40px #a855f7' }}>{player?.label}</h2>
                  <p className="text-lg font-black uppercase tracking-widest text-purple-300 mt-2">{player?.subtitle}</p>
                </div>
                <p className="text-xs text-slate-500 italic">Transition in progress — auto-advancing to unsold players...</p>
                <button
                  onClick={() => {
                    setShowRoundTransition(null);
                    const nextIdx = currentPlayerIndex + 1;
                    if (nextIdx < players.length) setCurrentPlayerIndex(nextIdx);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest px-8 py-3 rounded-xl transition-all text-sm"
                >
                  Skip → Start Round 02
                </button>
              </div>
            ) : player && players.filter(p => !p.type).length > 0 && (soldPlayers.length + unsoldPlayers.length) < players.filter(p => !p.type).length ? (
              <div className="h-full flex flex-col gap-4 overflow-hidden">
                {/* HEADER ROW: responsive — stacks on mobile, row on md+ */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch p-4 md:p-6 bg-slate-900/20 rounded-2xl border border-white/5 shadow-inner">
                  {/* 1. PHOTO */}
                  <div className="w-full md:w-[35%] flex justify-center items-center">
                    <div className="relative group/photo w-[140px] h-[180px] sm:w-[160px] sm:h-[200px] md:w-[180px] md:h-[220px] rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-800 ring-4 ring-black/20">
                      <Image
                        src={player.photo?.s3 || player.photo?.drive || player.imageUrl || player.image} 
                        alt={player.name} fill className={`object-cover ${player.status !== 'available' ? 'grayscale opacity-50' : ''}`} unoptimized={true}
                        onError={(e) => { e.target.src = player.placeholder; }}
                      />

                      {player.photo?.status === "pending" && (
                        <div className="absolute top-2 right-2 bg-violet-600/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/20 animate-pulse">
                          Processing Image…
                        </div>
                      )}

                        {/* Photo Edit Overlay */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/photo:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-4 text-center gap-3">
                          <button 
                            onClick={() => setShowImageEditor(true)}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl backdrop-blur-md transition-all flex items-center justify-center gap-2 group/btn shadow-lg"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">View & Crop</span>
                            <span className="group-hover/btn:scale-125 transition-transform text-xs">✂️</span>
                          </button>
                          
                          <label className="w-full cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-xl backdrop-blur-md transition-all flex items-center justify-center gap-2 group/btn">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Upload New</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, (url) => handlePlayerUpdate(player.id, 'imageUrl', url))}
                            />
                            <span className="group-hover/btn:rotate-12 transition-transform text-xs">📸</span>
                          </label>
                        </div>

                      {/* STAMP OVERLAY */}
                      {player.status === "sold" && (
                        <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] animate-in zoom-in duration-300">
                          <div className="border-4 border-violet-500 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                            <span className="text-violet-500 text-2xl font-black italic">SOLD</span>
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

                      {/* Application ID */}
                      <div className="bg-blue-600/20 border border-blue-500/30 px-3 py-1 rounded-full w-fit mb-2">
                        <p className="text-blue-400 text-[10px] font-black tracking-widest uppercase">Application ID: {player.applicationId || (currentPlayerIndex + 1).toString().padStart(2, '0')}</p>
                      </div>

                      {editingPlayerField === 'name' ? (
                        <div className="flex items-center gap-2 max-w-full overflow-hidden">
                          <input
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePlayerUpdate(player.id, 'name', tempValue)}
                            className="bg-slate-900 border border-violet-500 rounded-xl px-3 py-1.5 text-xl sm:text-2xl font-black text-white flex-1 min-w-0 uppercase tracking-tighter"
                          />
                          <button onClick={() => handlePlayerUpdate(player.id, 'name', tempValue)} className="shrink-0 bg-violet-500/20 hover:bg-violet-500/40 text-violet-400 border border-violet-500/30 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all">✓</button>
                          <button onClick={() => setEditingPlayerField(null)} className="shrink-0 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 group/playername">
                          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none text-white mb-2 drop-shadow-md">{player.name}</h1>
                          <button
                            onClick={() => { setEditingPlayerField('name'); setTempValue(player.name); }}
                            className="opacity-0 group-hover/playername:opacity-100 text-xl text-violet-500 hover:text-violet-400 transition-opacity"
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
                              className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white uppercase w-32"
                            />
                            <button onClick={() => handlePlayerUpdate(player.id, 'role', tempValue)} className="text-violet-500 text-sm">✓</button>
                            <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/role">
                            <span className={`text-xs font-black uppercase px-3 py-1 rounded bg-slate-800 border border-slate-700 ${getRoleColor(player.role)} shadow-lg`}>{player.role}</span>
                            <button onClick={() => { setEditingPlayerField('role'); setTempValue(player.role); }} className="opacity-0 group-hover/role:opacity-100 text-[10px] text-violet-500">✎</button>
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
                              className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white w-20"
                            />
                            <button onClick={() => handlePlayerUpdate(player.id, 'basePrice', Number(tempValue))} className="text-violet-500 text-sm">✓</button>
                            <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/price">
                            <span className="text-sm text-gray-400 font-black uppercase tracking-widest">₹{player.basePrice}</span>
                            <button onClick={() => { setEditingPlayerField('basePrice'); setTempValue(player.basePrice); }} className="opacity-0 group-hover/price:opacity-100 text-[10px] text-violet-500">✎</button>
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
                              className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white flex-1 italic min-w-0"
                            />
                            <button onClick={() => handlePlayerUpdate(player.id, 'village', tempValue)} className="text-violet-500 text-sm shrink-0">✓</button>
                            <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-sm shrink-0">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/village">
                            <p className="text-sm text-violet-400 font-black italic">{player.village}</p>
                            <button onClick={() => { setEditingPlayerField('village'); setTempValue(player.village); }} className="opacity-0 group-hover/village:opacity-100 text-[10px] text-violet-500">✎</button>
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
                                className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white w-24"
                              />
                              <button onClick={() => handlePlayerUpdate(player.id, 'dob', tempValue)} className="text-violet-500 text-xs">✓</button>
                              <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-xs">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/dob">
                              <p className="text-sm text-white font-black">{player.dob}</p>
                              <button onClick={() => { setEditingPlayerField('dob'); setTempValue(player.dob); }} className="opacity-0 group-hover/dob:opacity-100 text-[10px] text-violet-500">✎</button>
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
                                className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white w-12"
                              />
                              <button onClick={() => handlePlayerUpdate(player.id, 'age', Number(tempValue))} className="text-violet-500 text-xs">✓</button>
                              <button onClick={() => setEditingPlayerField(null)} className="text-red-500 text-xs">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/age">
                              <p className="text-xs text-slate-500 font-bold">({player.age} yrs)</p>
                              <button onClick={() => { setEditingPlayerField('age'); setTempValue(player.age); }} className="opacity-0 group-hover/age:opacity-100 text-[10px] text-violet-500">✎</button>
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
                                  className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white w-32"
                                />
                                <button onClick={() => handlePlayerUpdate(player.id, 'battingStyle', tempValue)} className="text-violet-500">✓</button>
                                <button onClick={() => setEditingPlayerField(null)} className="text-red-500">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/batstyle">
                                <p className="text-sm text-white font-black">{player.battingStyle}</p>
                                <button onClick={() => { setEditingPlayerField('battingStyle'); setTempValue(player.battingStyle); }} className="opacity-0 group-hover/batstyle:opacity-100 text-[10px] text-violet-500">✎</button>
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
                                  className="bg-slate-900 border border-violet-500 rounded px-2 py-0.5 text-xs text-white w-32"
                                />
                                <button onClick={() => handlePlayerUpdate(player.id, 'bowlingStyle', tempValue)} className="text-violet-500">✓</button>
                                <button onClick={() => setEditingPlayerField(null)} className="text-red-500">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/bowlstyle">
                                <p className="text-sm text-slate-400 font-bold italic">{player.bowlingStyle}</p>
                                <button onClick={() => { setEditingPlayerField('bowlingStyle'); setTempValue(player.bowlingStyle); }} className="opacity-0 group-hover/bowlstyle:opacity-100 text-[10px] text-violet-500">✎</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. DYNAMIC STATUS PANEL */}
                  <div className="w-full md:w-[20%] auction-card rounded-2xl border border-slate-700/30 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                    {player.status === "available" || player.status === "auction" ? (
                      <>
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
                        <p className="text-violet-500/60 uppercase tracking-[0.3em] text-[10px] font-black mb-2">Current Highest Bid</p>
                        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black text-violet-400 tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] ${bidPulse ? 'bid-animation' : ''}`}>
                          ₹{currentBid.toLocaleString()}
                        </h1>
                        {highestBidder && (
                          <div className="mt-4 flex flex-col items-center">
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-lg">
                              <div className="w-5 h-5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                <img src={teams.find(t => t.id === highestBidder)?.logoUrl} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">{teams.find(t => t.id === highestBidder)?.name}</span>
                            </div>
                            <button onClick={undoLastBid} className="text-[10px] text-gray-600 hover:text-white mt-3 uppercase underline font-black transition-colors">Undo Last Bid</button>
                          </div>
                        )}
                      </>
                    ) : player.status === "sold" ? (
                      <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        {player.isIcon ? (
                          <>
                            <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mb-1">RETAINED PLAYER</p>
                            <h1 className="text-4xl font-black text-amber-400 leading-none mb-3 drop-shadow-lg">⭐ ICON</h1>
                            <div className="bg-amber-600 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] border border-amber-400/30">
                              <span className="text-[10px] font-black text-white uppercase tracking-widest italic">RETAINED BY {teams.find(t => t.id === player.team)?.name}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-violet-400 font-black text-[10px] uppercase tracking-widest mb-1">FINAL PRICE</p>
                            <h1 className="text-5xl font-black text-white leading-none mb-3 drop-shadow-lg">₹{player.soldPrice?.toLocaleString()}</h1>
                            <div className="bg-violet-600 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-violet-400/30">
                              <span className="text-[10px] font-black text-white uppercase tracking-widest italic">SOLD TO {teams.find(t => t.id === player.team)?.name}</span>
                            </div>
                            {/* Revert Sale Button */}
                            <button
                              onClick={revertSale}
                              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                              <span>↩️</span> Revert Sale
                            </button>
                          </>
                        )}
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
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Set Next Bid Price:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 text-[10px] font-black">₹</span>
                          <input
                            type="number"
                            value={bidIncrement}
                            onChange={(e) => setBidIncrement(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-black text-violet-400 w-24 focus:border-violet-500 outline-none transition-all shadow-inner"
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
                          className={`flex-1 group py-4 rounded-xl font-black transition-all active:scale-95 uppercase flex items-center justify-center gap-2 border-2 shadow-lg ${highestBidder
                            ? "bg-violet-600 border-violet-500 shadow-violet-900/20"
                            : "bg-slate-800/50 text-slate-600 border-slate-700 opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <span className="text-lg md:text-xl">🔨 SELL PLAYER</span>
                          {highestBidder && <span className="text-[10px] font-bold text-violet-100 opacity-80 bg-black/20 px-2 py-0.5 rounded-full">₹{currentBid.toLocaleString()}</span>}
                        </button>

                        <button
                          onClick={unsoldPlayer}
                          disabled={currentBid > 0}
                          className={`sm:w-[30%] py-3 rounded-xl font-black border-2 shadow-lg text-white text-base md:text-lg italic uppercase active:scale-95 transition-all flex items-center justify-center gap-2 ${currentBid > 0
                            ? "bg-slate-800/50 text-slate-600 border-slate-700 opacity-50 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-500 border-red-400/30"
                            }`}
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
                            className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 transition-all duration-200 ${highestBidder === team.id ? 'ring-2 ring-violet-400 rounded-lg scale-[1.08] z-10' : ''} disabled:opacity-40 disabled:grayscale hover:opacity-100`}
                          >
                            {/* Circular Logo */}
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800/40 border-2 border-slate-600 flex items-center justify-center shadow-md flex-shrink-0">
                              <img src={team.logoUrl} alt={`${team.name} logo`} className="w-20 h-20 object-cover" />
                            </div>

                            {/* Team Name + Available Purse */}
                            <span className="text-[9px] block truncate w-full leading-tight text-slate-300 tracking-[0.1em] text-center font-semibold">{team.name}</span>
                            <span className="text-[10px] block font-black leading-none text-violet-400">₹{team.remainingBudget.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-full h-px bg-slate-800"></div>
                      <button
                        onClick={nextPlayer}
                        className="w-full bg-white text-black hover:bg-violet-400 hover:text-white py-6 rounded-2xl font-black text-2xl transition-all shadow-2xl hover:scale-[1.01] active:scale-95 uppercase tracking-tighter"
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
                <Link href="/auction" className="mt-12 bg-slate-800 hover:bg-violet-600 px-10 py-4 rounded-2xl font-bold transition-all border border-slate-700">Back to Dashboard</Link>
              </div>
            )}
          </div>

        </div>

      </div>
      {/* Image Editor Modal */}
      {showImageEditor && player && (
        <ImageCropperModal
          imageUrl={player.photo?.drive || player.photo?.s3 || player.imageUrl || player.image}
          onSave={handleImageSave}
          onClose={() => setShowImageEditor(false)}
          folder="players"
        />
      )}
    </div>
  )
}

function LiveAuctionWithSplash({ tournamentId }) {
  const [showSplash, setShowSplash] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [tournament, setTournament] = useState(null)

  useEffect(() => {
    const fetchMinimalTournament = async () => {
      if (!tournamentId) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}`);
        if (res.ok) {
          const data = await res.json();
          setTournament(data.tournament || data);
        }
      } catch (err) { console.error(err); }
    };
    fetchMinimalTournament();
  }, [tournamentId]);

  useEffect(() => {
    // Start fade out after 2 seconds (allow time for custom assets to load)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2500)

    // Remove splash after 3 seconds
    const removeTimer = setTimeout(() => {
      setShowSplash(false)
    }, 3200)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  return (
    <>
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] transition-all duration-700 ${fadeOut ? 'opacity-0 scale-110 blur-md' : 'opacity-100 scale-100'}`}>
          <SplashScreen 
            src={tournament?.assets?.splashUrl} 
            title={tournament?.name} 
          />
        </div>
      )}

      <div className={`transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <LiveAuctionContent initialTournament={tournament} />
      </div>
    </>
  )
}

export default function LiveAuctionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-6">
        <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="font-black tracking-[0.5em] text-violet-500 animate-pulse uppercase">Syncing Live Data</p>
      </div>
    }>
      <LiveAuctionPageContent />
    </Suspense>
  )
}

function LiveAuctionPageContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get("id")

  return <LiveAuctionWithSplash tournamentId={tournamentId} />
}
