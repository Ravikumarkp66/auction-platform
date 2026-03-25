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
import ResultOverlay from '../../components/ResultOverlay'
import jsPDF from 'jspdf'

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
  const [auctionBg, setAuctionBg] = useState('/splash-screen.png')

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
  const [poolA, setPoolA] = useState([])
  const [poolB, setPoolB] = useState([])
  const [lastAssignment, setLastAssignment] = useState(null)
  const [showPoolView, setShowPoolView] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState(null)

  const [activeSidebar, setActiveSidebar] = useState(null) // 'teams' or 'stats'
  const [editingPlayerField, setEditingPlayerField] = useState(null) // field name like 'name', 'role', etc.
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editingShortId, setEditingShortId] = useState(null)
  const [tempValue, setTempValue] = useState("")
  const [tempShort, setTempShort] = useState("")
  const [bidIncrement, setBidIncrement] = useState(2) // Start with base price logic
  const [socket, setSocket] = useState(null)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [showRoundTransition, setShowRoundTransition] = useState(null) // { label, subtitle }
  const [result, setResult] = useState(null) // Result Overlay State

  // Smart bid increment logic for Credits system
  const getBidIncrement = (currentBid) => {
    if (currentBid < 10) return 1;
    if (currentBid < 20) return 2;
    if (currentBid < 50) return 5;
    return 10;
  };

  // Base price logic for Credits system
  const getBasePrice = (role) => {
    if (role?.toLowerCase().includes('all')) return 4;
    return 2;
  };

  // Squad size rules
  const getSquadLimits = () => {
    return {
      minPlayers: 11,
      maxPlayers: 15
    };
  };

  // Check if team can bid (budget + squad size + year distribution)
  const canTeamBid = (team) => {
    const limits = getSquadLimits();
    const currentSquadSize = team.players?.length || 0;
    const hasBudgetSpace = team.remainingBudget >= (player?.basePrice || 2);
    const hasSquadSpace = currentSquadSize < limits.maxPlayers;
    
    return hasBudgetSpace && hasSquadSpace;
  };

  // Check year distribution requirements
  const getYearDistribution = (team) => {
    const players = team.players || [];
    const distribution = {
      '1st year': 0,
      '2nd year': 0,
      '3rd year': 0,
      '4th year': 0
    };
    
    players.forEach(player => {
      const normalizedYear = normalizeYearCategory(player);
      distribution[normalizedYear]++;
    });
    
    return distribution;
  };

  // Normalize year category - CRITICAL FIX
  const normalizeYearCategory = (player) => {
    // Try Application ID range-based year detection first (most reliable)
    if (player.applicationId) {
      const appYear = getYearFromApplicationId(player.applicationId);
      if (appYear) {
        return appYear;
      }
    }
    
    // Try multiple possible fields for year information
    const yearFields = [
      player.category,
      player.year,
      player.yearCategory,
      player.batch,
      player.classYear,
      player.academicYear
    ].filter(Boolean);
    
    // If no year field found, default to 1st year
    if (yearFields.length === 0) {
      return '1st year';
    }
    
    const yearValue = yearFields[0].toString().toLowerCase().trim();
    
    // Strict year mapping
    if (yearValue.includes('4th') || yearValue.includes('fourth') || yearValue === '4' || yearValue.includes('4 year')) {
      return '4th year';
    }
    if (yearValue.includes('3rd') || yearValue.includes('third') || yearValue === '3' || yearValue.includes('3 year')) {
      return '3rd year';
    }
    if (yearValue.includes('2nd') || yearValue.includes('second') || yearValue === '2' || yearValue.includes('2 year')) {
      return '2nd year';
    }
    if (yearValue.includes('1st') || yearValue.includes('first') || yearValue === '1' || yearValue.includes('1 year')) {
      return '1st year';
    }
    
    // Number-based detection
    if (yearValue.includes('4')) {
      return '4th year';
    }
    if (yearValue.includes('3')) {
      return '3rd year';
    }
    if (yearValue.includes('2')) {
      return '2nd year';
    }
    if (yearValue.includes('1')) {
      return '1st year';
    }
    
    // Default fallback
    return '1st year';
  };

  // Extract year from Application ID range
  const getYearFromApplicationId = (applicationId) => {
    if (!applicationId) return null;
    
    const appId = parseInt(applicationId.toString().trim());
    
    // Year mapping based on application ID ranges
    if (appId >= 1 && appId <= 22) {
      return '4th year';
    } else if (appId >= 23 && appId <= 58) {
      return '3rd year';
    } else if (appId >= 59 && appId <= 82) {
      return '2nd year';
    } else {
      return '1st year';
    }
  };

  // Validate year distribution requirements
  const getYearDistributionIssues = (team) => {
    const distribution = getYearDistribution(team);
    const totalPlayers = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const issues = [];
    
    if (totalPlayers >= 11) {
      // Minimum requirements: exactly 2 from each year
      Object.entries(distribution).forEach(([year, count]) => {
        if (count < 2) {
          issues.push(`Need exactly 2 ${year} players (have ${count})`);
        }
      });
    }
    
    return issues;
  };

  // Check max year distribution limits
  const getYearDistributionLimits = () => {
    return {
      '1st year': { min: 2, max: 3 },
      '2nd year': { min: 2, max: 4 },
      '3rd year': { min: 2, max: 4 },
      '4th year': { min: 2, max: 2 }
    };
  };

  // Check if team can bid based on year limits
  const canBidForPlayerYear = (team, player) => {
    const distribution = getYearDistribution(team);
    const limits = getYearDistributionLimits();
    const normalizedYear = normalizeYearCategory(player);
    
    const currentCount = distribution[normalizedYear] || 0;
    const maxAllowed = limits[normalizedYear]?.max || 4;
    
    return currentCount < maxAllowed;
  };

  // Get year restriction reason
  const getYearRestrictionReason = (team, player) => {
    const distribution = getYearDistribution(team);
    const limits = getYearDistributionLimits();
    const normalizedYear = normalizeYearCategory(player);
    
    const currentCount = distribution[normalizedYear] || 0;
    const maxAllowed = limits[normalizedYear]?.max || 4;
    
    if (currentCount >= maxAllowed) {
      return `Max ${normalizedYear} players reached (${currentCount}/${maxAllowed})`;
    }
    return null;
  };

  // Get bid restriction reason
  const getBidRestrictionReason = (team) => {
    const limits = getSquadLimits();
    const currentSquadSize = team.players?.length || 0;
    
    if (currentSquadSize >= limits.maxPlayers) {
      return `Squad full (${currentSquadSize}/${limits.maxPlayers})`;
    }
    const minBid = isPointsSystem() ? (player?.basePrice || 2) : 100;
    if (team.remainingBudget < minBid) {
      return `Insufficient ${isPointsSystem() ? 'credits' : 'funds'} (${formatCurrency(team.remainingBudget)})`;
    }
    return null;
  };

  // Categorize team players by role
  const categorizeTeamPlayers = (team) => {
    const players = team.players || [];
    return {
      captain: players.find(p => p.iconRole === 'captain'),
      viceCaptain: players.find(p => p.iconRole === 'viceCaptain'), 
      retained: players.filter(p => p.iconRole === 'retained'),
      auctioned: players.filter(p => !p.iconRole || p.iconRole === 'auction')
    };
  };

  // Get player role display with badge
  const getPlayerRoleBadge = (player) => {
    if (player.iconRole === 'captain') {
      return <span className="px-2 py-0.5 bg-amber-500 text-black text-[8px] font-black rounded-full">C</span>;
    }
    if (player.iconRole === 'viceCaptain') {
      return <span className="px-2 py-0.5 bg-slate-400 text-black text-[8px] font-black rounded-full">VC</span>;
    }
    if (player.iconRole === 'retained') {
      return <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full">R</span>;
    }
    return null;
  };

  // Detect auction type based on base budget
  const isPointsSystem = () => {
    const result = config.baseBudget <= 1000; // Points systems have small budgets (200 CR), regular auctions have large budgets (10000+)
    return result;
  };

  // Get currency symbol and format based on auction type
  const formatCurrency = (amount, options = {}) => {
    const { showSymbol = true, abbreviate = false } = options;
    
    if (isPointsSystem()) {
      // Points System: Use Credits (CR)
      return showSymbol ? `${amount} CR` : `${amount}`;
    } else {
      // Regular Auction: Use Rupees (₹)
      const formattedAmount = abbreviate && amount >= 1000 
        ? `${(amount / 1000).toFixed(1)}K` 
        : amount.toLocaleString();
      return showSymbol ? `₹${formattedAmount}` : formattedAmount;
    }
  };

  // Get base price based on auction type
  const getBasePriceByAuctionType = (role) => {
    if (isPointsSystem()) {
      // Points System: Role-based pricing (2/4 CR)
      return getBasePrice(role);
    } else {
      // Regular Auction: Use existing basePrice or default 100
      return 100; // Default for regular auctions
    }
  };

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

  const handleSendToPool = async (team, pool) => {
    const isPoolA = pool === 'poolA';
    const poolList = isPoolA ? poolA : poolB;
    if (poolList.length >= 5) {
      alert(`Pool ${isPoolA ? 'A' : 'B'} is already full! (Max 5 teams)`);
      return;
    }

    // OPTIMISTIC UPDATE: Update local state and broadcast IMMEDIATELY for snappy feel
    const teamId = team.id || team._id;
    const previousPoolA = [...poolA];
    const previousPoolB = [...poolB];
    const updatedPoolA = isPoolA ? [...poolA, teamId] : poolA;
    const updatedPoolB = !isPoolA ? [...poolB, teamId] : poolB;

    // 1. Update local state immediately
    if (isPoolA) setPoolA(updatedPoolA);
    else setPoolB(updatedPoolB);
    setLastAssignment({ teamId: teamId, pool: isPoolA ? 'poolA' : 'poolB' });

    // 2. Broadcast immediately so overlay starts animating without waiting for DB
    if (socket) {
      socket.emit('teamDrawEvent', {
        team: { id: teamId, name: team.name, logoUrl: team.logoUrl },
        pool: isPoolA ? 'poolA' : 'poolB'
      });
    }

    // 3. Perform background DB update
    try {
      const tournamentIdToUpdate = selectedAuction?._id || currentTournamentId;
      if (!tournamentIdToUpdate) throw new Error("No active tournament ID found");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentIdToUpdate}/pools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolA: updatedPoolA, poolB: updatedPoolB })
      });

      if (!res.ok) throw new Error("Update failed");
    } catch (err) {
      // Rollback on failure
      console.error("Pool assignment error:", err);
      setPoolA(previousPoolA);
      setPoolB(previousPoolB);
      setLastAssignment(null);
      alert(`Pool assignment failed: ${err.message}. Please retry.`);
    }
  };

  const handleUndoPoolAssignment = async () => {
    if (!lastAssignment) return;
    if (!confirm("Undo last pool assignment?")) return;
    try {
      const { teamId, pool } = lastAssignment;
      const updatedPoolA = pool === 'poolA' ? poolA.filter(id => id !== teamId) : poolA;
      const updatedPoolB = pool === 'poolB' ? poolB.filter(id => id !== teamId) : poolB;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${selectedAuction?._id || currentTournamentId}/pools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolA: updatedPoolA, poolB: updatedPoolB })
      });
      if (res.ok) {
        setPoolA(updatedPoolA);
        setPoolB(updatedPoolB);
        setLastAssignment(null);
        if (socket) socket.emit('auctionUpdate', { type: 'system_refresh', auctionId: selectedAuction?._id || currentTournamentId });
      }
    } catch (err) { alert("Undo failed"); }
  };

  const handleResetPools = async () => {
    if (!confirm("Reset ALL pool assignments? This cannot be undone.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${selectedAuction?._id || currentTournamentId}/pools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolA: [], poolB: [] })
      });
      if (res.ok) {
        setPoolA([]);
        setPoolB([]);
        setLastAssignment(null);
        if (socket) socket.emit('resetPoolsDraw', {});
      }
    } catch (err) { alert("Reset failed"); }
  };

  const togglePoolView = () => {
    const newState = !showPoolView;
    setShowPoolView(newState);
    if (socket) socket.emit('togglePoolView', { show: newState });
  };

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
            badges: tournament.assets.badges || { leftBadge: "", rightBadge: "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/public/ChatGPT+Image+Mar+18%2C+2026%2C+12_45_23+PM.png" }
          }));
          if (tournament.assets.backgroundUrl) setAuctionBg(tournament.assets.backgroundUrl);
        }

        // Load teams and players with actual remaining budgets
        setTeams(data.teams.map(t => ({
          id: t._id,
          name: t.name,
          shortName: t.shortName || t.name,
          logoUrl: t.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`,
          totalBudget: data.tournament.baseBudget, // This should be 200 CR
          remainingBudget: t.remainingBudget, // This will be less if players retained
          players: data.players.filter(p => p.team === t._id),
          color: t.color || "bg-blue-600"
        })))

        // DEBUG: Log player data
        console.log('🔍 DEBUG - Total players from API:', data.players.length)
        console.log('🔍 DEBUG - Players with isIcon=true:', data.players.filter(p => p.isIcon).length)
        console.log('🔍 DEBUG - Players with isIcon=false:', data.players.filter(p => !p.isIcon).length)
        console.log('🔍 DEBUG - Sample player data:', data.players.slice(0, 3))

        // Filter: Keep non-icon players (auction players only) - FIXED for points system
        let auctionPlayers = data.players.filter(p => !p.isIcon)
        
        // If no players after filtering, try including all players (points system fix)
        if (auctionPlayers.length === 0) {
          auctionPlayers = data.players
        }

        console.log('🎯 FINAL - Auction players count:', auctionPlayers.length)

        // Create auction-only Application IDs
        const baseEnriched = auctionPlayers.map(p => {
          // DEBUG: Log each player's base price and category
          const creditsBasePrice = getBasePrice(p.role);
          
          return {
          id: p._id,
          name: p.name,
          role: p.role || "All-Rounder",
          village: p.village || "-",
          dob: p.dob || "-",
          category: p.category, // CRITICAL: Include category field!
          year: p.year, // Include year field if available
          age: p.age || 20,
          town: p.town,
          image: p.imageUrl || p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
          placeholder: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
          basePrice: p.basePrice || creditsBasePrice,
          soldPrice: p.soldPrice,
          team: p.team || null,
          status: p.status || "available",
          battingStyle: p.battingStyle || "Right Hand",
          bowlingStyle: p.bowlingStyle || "-",
          isIcon: p.isIcon || false,
          photo: p.photo || { s3: p.imageUrl || p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random` },
          applicationId: p.applicationId ? p.applicationId.toString().padStart(2, '0') : "-",
          _rawAppId: p.applicationId || 0
        }});

        // Round 02: Append UNSOLD players to the end of the list after a marker
        // Their Application IDs STAY THE SAME.
        const round1 = [...baseEnriched];
        const round2 = baseEnriched.filter(p => p.status === 'unsold');

        let enrichedPlayers = [...round1];
        if (round1.every(p => p.status !== 'available' && p.status !== 'auction') && round2.length > 0) {
          enrichedPlayers.push({
            type: 'ROUND',
            label: 'ROUND 02',
            subtitle: 'UNSOLD RE-AUCTION',
            id: '__round_02__'
          });
          enrichedPlayers = enrichedPlayers.concat(
             round2.map(p => ({ ...p, status: 'available', applicationId: `R2-${p.applicationId}` }))
          );
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
        // DON'T set results on page load - only show results for LIVE sales during auction
        // setResults(sold.map(p => ({
        //   player: p.name,
        //   team: data.teams.find(t => t._id === p.team)?.name || "-",
        //   price: p.soldPrice,
        //   status: "SOLD",
        //   color: "text-violet-400 bg-violet-500/10"
        // })))

        if (data.tournament.pools) {
          setPoolA(data.tournament.pools.poolA || []);
          setPoolB(data.tournament.pools.poolB || []);
        }

        setSelectedAuction(data.tournament);
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

    // Listen for auction updates from other devices (bids only)
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
        }

        return currentPlayers
      })
    })

    return () => {
      socket.off('auctionUpdate')
    }
  }, [socket, currentPlayerIndex])

  // DYNAMIC ROUND 2 TRANSITION:
  // When all regular players have been processed, automatically append the ROUND 02 marker and unsold players.
  useEffect(() => {
    if (players.length === 0) return;
    const hasMarker = players.some(p => p.type === 'ROUND');
    if (hasMarker) return;

    const originalPlayers = players.filter(p => !p.type);
    const allProcessed = originalPlayers.every(p => p.status !== 'available' && p.status !== 'auction');
    
    if (allProcessed) {
      const round2Pool = originalPlayers.filter(p => p.status === 'unsold');
      if (round2Pool.length > 0) {
        console.log("🔄 Round 1 Complete. Injecting Round 2 re-auction...");
        setPlayers(prev => {
           const nextList = [
              ...prev,
              { type: 'ROUND', label: 'ROUND 02', subtitle: 'UNSOLD RE-AUCTION', id: '__round_02__' },
              ...round2Pool.map(p => ({ ...p, status: 'available', applicationId: `R2-${p.applicationId}` }))
           ];
           return nextList;
        });
      }
    }
  }, [players]);

  const player = players[currentPlayerIndex];
  const isRoundMarker = player?.type === 'ROUND';
  const roundMarkerIndex = players.findIndex(p => p.type === 'ROUND');
  const isRoundTwo = roundMarkerIndex !== -1 && currentPlayerIndex >= roundMarkerIndex;

  // Reset bidding state when player changes
  useEffect(() => {
    setCurrentBid(0)
    setHighestBidder(null)
    setRoundHistory([])
    if (player) {
      // Start with base price as initial bid amount based on auction type
      setBidIncrement(player.basePrice || getBasePriceByAuctionType(player.role || "Batsman"))
    }
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
      maxPlayers: config.squadSize || 15,
      squadImageUrl: t.squadImageUrl || null,
      squadPdfUrl: t.squadPdfUrl || null,
      yearDistribution: t.yearDistribution || null
    }))

    socket.emit("auctionUpdate", {
      player: activePlayer,
      currentBid: currentBid,
      highestBidder: topTeam?.name || null,
      highestBidderLogo: topTeam?.logoUrl || null,
      tournamentName: config.name,
      teams: overlayTeams,
      roundHistory: roundHistory.slice(0, 5),
      result: result, // CRITICAL: Include result in overlay data
      timestamp: Date.now()
    })
  }, [socket, players, currentPlayerIndex, currentBid, highestBidder, teams, config, result, roundHistory])

  // Auto-advance after result animation
  useEffect(() => {
    if (result) {
      // DISABLED: Auto-clear and auto-next-player
      // Admin should manually control when to move to next player
      // const timer = setTimeout(() => {
      //   setResult(null);
      //   // Using it safely inside async callback (defined later in component but executed after render)
      //   nextPlayer();
      // }, 2500);
      // return () => clearTimeout(timer);
    }
  }, [result]);


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
  const canPlaceBid = player && !isRoundMarker && !result && (player.status === "available" || player.status === "auction" || player.status === "unsold");

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
    const minBid = isPointsSystem() ? (player.basePrice || getBasePrice(player.role)) : 100;
    
    if (currentBid === 0) {
      // First bid must be at least the base price
      if (riseAmount < minBid) {
        alert(`The first bid must be at least the base price (${formatCurrency(minBid)}).`)
        return
      }
    } else {
      // Subsequent bids must be higher than current
      if (riseAmount <= currentBid) {
        alert(`Bid must be higher than current bid (${formatCurrency(currentBid)}).`)
        return
      }
    }

    // Check if team has enough budget and squad space
    const biddingTeam = teams.find(t => t.id === teamId)
    if (!canTeamBid(biddingTeam)) {
      const reason = getBidRestrictionReason(biddingTeam);
      alert(`${biddingTeam.name} cannot bid: ${reason}`);
      return
    }

    // Check year distribution limits (only for points system)
    if (isPointsSystem() && !canBidForPlayerYear(biddingTeam, player)) {
      const yearReason = getYearRestrictionReason(biddingTeam, player);
      alert(`${biddingTeam.name} cannot bid: ${yearReason}`);
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

    // Auto-prepare next bid price using dynamic Credits increment
    setBidIncrement(bidAmount + getBidIncrement(bidAmount))

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
      if (player) setBidIncrement(getBidIncrement(player.basePrice || 2))
    } else {
      const prevBid = newHistory[0].bid
      setCurrentBid(prevBid)
      setHighestBidder(newHistory[0].teamId)
      setBidIncrement(prevBid + getBidIncrement(prevBid))
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
      alert("Cannot sell player for 0 CR or less. Please place a bid first.")
      return
    }

    if (!confirm(`Sell ${player.name} to ${teams.find(t => t.id === highestBidder)?.name} for ${currentBid} CR?`)) return

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
    
    // DEBUG: Log year distribution after sale
    const updatedWinningTeam = updatedTeams.find(t => t.id === highestBidder);
    const newDistribution = getYearDistribution(updatedWinningTeam);
    console.log(`🏏 PLAYER SOLD: ${player.name} (${normalizeYearCategory(player)}) to ${updatedWinningTeam.name}`);
    console.log(`📊 New Year Distribution for ${updatedWinningTeam.name}:`, newDistribution);
    console.log(`📋 All players in ${updatedWinningTeam.name}:`, updatedWinningTeam.players.map(p => `${p.name} (${normalizeYearCategory(p)})`));
    
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
        console.log(`✅ SAVED: ${player.name} sold to ${winningTeam?.name} for ${currentBid} CR, Team budget: ${newBudget} CR`)

        // Broadcast sale to all connected devices via socket
        if (socket) {
          // Auto-stop break on any sale
          socket.emit('breakTimeEnd');
          
          console.log('🚀 EMITTING SOLD EVENT:', {
            playerId: player.id,
            playerName: player.name,
            soldPrice: currentBid,
            teamId: highestBidder,
            teamName: winningTeam?.name
          });

          const soldPlayer = { ...player, status: 'sold', soldPrice: currentBid, team: highestBidder }
          
          // Emit COMPLETE sale data for overlay (not just basic info)
          socket.emit('playerSold', {
            playerId: player.id,
            playerName: player.name,
            soldPrice: currentBid,
            teamId: highestBidder,
            teamName: winningTeam?.name,
            teamShortName: winningTeam?.shortName,
            teamLogo: winningTeam?.logoUrl,
            teamColor: winningTeam?.color,
            playerImage: player.photo?.s3 || player.photo?.drive || player.imageUrl || player.image,
            isPointsSystem: isPointsSystem()
          });
        }

        setResult({
          type: "SOLD",
          price: currentBid,
          teamName: winningTeam?.name,
          teamLogo: winningTeam?.logoUrl,
          playerName: player.name,
          playerImage: player.photo?.s3 || player.photo?.drive || player.imageUrl || player.image,
          currency: isPointsSystem() ? "" : "₹",
          isPointsSystem: isPointsSystem()
        });

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
      status: "RE-AUCTION (R2)",
      color: "text-amber-400 bg-amber-500/10"
    }, ...results])

    // Broadcast unsold state to overlay
    if (socket) {
      socket.emit('breakTimeEnd');
      
      // Emit unsold event for overlay
      socket.emit('playerUnsold', {
        playerId: player.id,
        playerName: player.name,
        playerImage: player.photo?.s3 || player.photo?.drive || player.imageUrl || player.image,
        isPointsSystem: isPointsSystem()
      });
    }

    // Persist unsold status on backend
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
        setResult({
          type: "UNSOLD",
          playerName: player.name,
          playerImage: player.photo?.s3 || player.photo?.drive || player.imageUrl || player.image,
          currency: isPointsSystem() ? "" : "₹",
          isPointsSystem: isPointsSystem()
        });
        console.log(`✅ MARKED UNSOLD: ${player.name} (Round 1)`);
      } else {
        console.error("❌ Failed to save UNSOLD status for player:", player.name)
      }
    } catch (err) {
      console.error("Error saving UNSOLD status:", err)
    }
  }

  // Revert a sold/unsold player - put back to auction and adjust budgets
  const revertSale = async () => {
    if (!player) return;
    if (player.isIcon) return;
    if (player.status !== "sold" && player.status !== "unsold") return;

    if (player.status === "unsold") {
      if (!confirm(`Revert UNSOLD status for ${player.name}?\n\nThis will put the player back into the active auction.\n\nContinue?`)) return;

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...player,
        status: "available"
      };
      setPlayers(updatedPlayers);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${player.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "available"
          })
        });
        if (res.ok) {
          console.log(`✅ REVERTED: ${player.name} back to auction from UNSOLD`);
          setCurrentBid(0);
          setHighestBidder(null);
          if (socket) {
            socket.emit('auctionUpdate', {
              player: updatedPlayers[currentPlayerIndex],
              currentBid: 0,
              highestBidder: null,
              highestBidderLogo: null,
              tournamentName: config.name,
              teams: teams,
              roundHistory: roundHistory,
              timestamp: Date.now()
            });
          }
        }
      } catch (err) {
        console.error("Error reverting unsold:", err);
      }
      return;
    }

    // --- SOLD LOGIC ---
    const soldPrice = player.soldPrice
    const originalTeamId = player.team

    if (!confirm(`Revert sale of ${player.name}?\n\nThis will remove the player from ${teams.find(t => t.id === originalTeamId)?.name} and refund ${formatCurrency(soldPrice)}.\n\nClick OK to proceed.`)) return

    const startFromLastBid = confirm(`Do you want to retain the final bid of ${formatCurrency(soldPrice)} by ${teams.find(t => t.id === originalTeamId)?.name}?\n\nClick OK to keep the bid.\nClick Cancel to completely restart from ${formatCurrency(0)}.`);

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

        // Broadcast to other devices (overlay integration + active bid occupation)
        if (socket) {
          socket.emit('auctionUpdate', {
            player: updatedPlayers[currentPlayerIndex],
            currentBid: startFromLastBid ? soldPrice : 0,
            highestBidder: startFromLastBid ? originalTeamId : null,
            highestBidderLogo: startFromLastBid ? originalTeam?.logoUrl : null,
            tournamentName: config.name,
            teams: updatedTeams,
            roundHistory: roundHistory,
            timestamp: Date.now()
          })
        }

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

    // Reset bidding state based on admin choice
    if (startFromLastBid) {
      setCurrentBid(soldPrice);
      setHighestBidder(originalTeamId);
      setBidIncrement(soldPrice + getBidIncrement(soldPrice));
    } else {
      setCurrentBid(0)
      setHighestBidder(null)
      if (player) setBidIncrement(getBidIncrement(player.basePrice || 2));
    }
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
      {/* Background Layer - Fixed & Clear */}
      <div className="fixed inset-0 z-0">
        <img
          src={activeAssets.backgroundUrl || '/splash-screen.png'}
          className="w-full h-full object-cover scale-100"
          alt=""
          style={{ filter: 'none' }}
        />
        {/* Subtle gradient overlay - NOT heavy dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/30" />
      </div>


      {/* =========================================================
          ROUND TRANSITION OVERLAY (Full-Screen Cinematic)
      ========================================================= */}
      {result && (
        <ResultOverlay
          type={result.type}
          playerName={result.playerName}
          price={result.price}
          teamName={result.teamName}
          teamLogo={result.teamLogo}
          playerImage={result.playerImage}
          onSkip={() => {
            setResult(null);
            nextPlayer();
          }}
        />
      )}

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
              <div className="flex justify-center mb-1">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isRoundTwo ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                   Round {isRoundTwo ? '02' : '01'}
                </span>
              </div>
              {socket?.connected && currentPlayerIndex >= 0 && (
                <p className="text-[9px] sm:text-[10px] text-violet-500 font-black tracking-[0.4em] mb-0.5 opacity-60 uppercase animate-pulse">Live Broadcast</p>
              )}
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
            <button
              onClick={() => setActiveSidebar('pools')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'pools' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              title="Team Pool Draw"
            >
              <span className="text-xl">🗳️</span>
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
              <button onClick={() => setActiveSidebar('pools')} className="flex flex-col items-center gap-1">
                <span className="text-xl">🗳️</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Pools</span>
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
                    <button
                      onClick={() => setActiveSidebar('pools')}
                      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebar === 'pools' ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                    >
                      Pools
                    </button>
                  </div>
                  <button onClick={() => setActiveSidebar(null)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500 hover:text-white rounded-full transition-all text-xl">✕</button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {activeSidebar === 'teams' ? (
                    <div className="space-y-4">
                      {[...teams].sort((a, b) => a.remainingBudget - b.remainingBudget).map((team, idx) => {
                        const squad = categorizeTeamPlayers(team);
                        const limits = getSquadLimits();
                        const yearDistribution = getYearDistribution(team);
                        const yearIssues = getYearDistributionIssues(team);
                        const currentSquadSize = team.players?.length || 0;
                        const isCompleteSquad = currentSquadSize >= limits.minPlayers;
                        
                        return (
                          <div key={team.id} className={`bg-slate-900/40 border rounded-2xl p-4 shadow-2xl hover:bg-slate-800/40 transition-all ${
                            yearIssues.length > 0 ? 'border-amber-500/30' : 'border-slate-700/50'
                          }`}>
                            {/* Team Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-600">
                                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{team.name}</h3>
                                  <p className="text-xs text-slate-400">{team.shortName}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-violet-400">{formatCurrency(team.remainingBudget)}</p>
                                <p className={`text-xs ${currentSquadSize < limits.minPlayers ? 'text-red-400' : currentSquadSize >= limits.maxPlayers ? 'text-amber-400' : 'text-green-400'}`}>
                                  {currentSquadSize}/{limits.maxPlayers} players
                                </p>
                              </div>
                            </div>

                            {/* Year Distribution */}
                            <div className="mb-3">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">Year Distribution</p>
                              <div className="grid grid-cols-4 gap-1">
                                {Object.entries(yearDistribution).map(([year, count]) => (
                                  <div key={year} className="text-center p-1 bg-slate-800/50 rounded border border-slate-700/30">
                                    <p className="text-[8px] text-slate-400">{year}</p>
                                    <p className={`text-sm font-black ${count >= 2 ? 'text-green-400' : count > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                      {count}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              {yearIssues.length > 0 && (
                                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider">⚠️ Requirements</p>
                                  {yearIssues.map((issue, i) => (
                                    <p key={i} className="text-[8px] text-amber-300 mt-1">• {issue}</p>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Special Players */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                              {/* Captain */}
                              {squad.captain && (
                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[8px] font-black rounded-full">C</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white truncate">{squad.captain.name}</p>
                                    <p className="text-[8px] text-slate-400">{squad.captain.role} • {normalizeYearCategory(squad.captain)} • {formatCurrency(squad.captain.soldPrice || squad.captain.basePrice)}</p>
                                  </div>
                                </div>
                              )}

                              {/* Vice Captain */}
                              {squad.viceCaptain && (
                                <div className="flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 rounded-lg p-2">
                                  <span className="px-1.5 py-0.5 bg-slate-400 text-black text-[8px] font-black rounded-full">VC</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white truncate">{squad.viceCaptain.name}</p>
                                    <p className="text-[8px] text-slate-400">{squad.viceCaptain.role} • {normalizeYearCategory(squad.viceCaptain)} • {formatCurrency(squad.viceCaptain.soldPrice || squad.viceCaptain.basePrice)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Retained Players */}
                            {squad.retained.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-wider mb-1">Retained Players</p>
                                <div className="space-y-1">
                                  {squad.retained.map((player, i) => (
                                    <div key={player._id || player.id || i} className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-1.5">
                                      <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full">R</span>
                                      <p className="text-xs font-black text-white truncate flex-1">{player.name}</p>
                                      <p className="text-[8px] text-slate-400">{normalizeYearCategory(player)} • {formatCurrency(player.soldPrice || player.basePrice)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Squad Status */}
                            <div className="flex items-center justify-between text-xs p-2 bg-slate-800/30 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Squad:</span>
                                <span className={`font-black ${isCompleteSquad ? 'text-green-400' : 'text-red-400'}`}>
                                  {currentSquadSize}/{limits.minPlayers} min
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className={`font-black ${currentSquadSize >= limits.maxPlayers ? 'text-red-400' : 'text-slate-400'}`}>
                                  {currentSquadSize}/{limits.maxPlayers} max
                                </span>
                              </div>
                              {!isCompleteSquad && (
                                <span className="text-[8px] text-red-400 font-black animate-pulse">
                                  NEED {limits.minPlayers - currentSquadSize} MORE
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : activeSidebar === 'stats' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 shadow-xl shadow-amber-900/10">
                        <div>
                          <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Pool Draw Ceremony</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Select A/B groups for teams</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={togglePoolView}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${showPoolView ? 'bg-green-600 text-white shadow-lg shadow-green-900/40 border border-green-500/50' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
                          >
                            {showPoolView ? "🟢 ON OVERLAY" : "⚪ SHOW ON OVERLAY"}
                          </button>
                          <button
                            disabled={!lastAssignment}
                            onClick={handleUndoPoolAssignment}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:text-white disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"
                          >
                            ⤺ Undo Last
                          </button>

                          <button
                            onClick={handleResetPools}
                            disabled={poolA.length === 0 && poolB.length === 0}
                            className="px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-xl text-[10px] font-black uppercase tracking-tighter text-red-400 hover:text-white hover:bg-red-700/50 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"
                          >
                            Reset All
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-800/80 border-b border-slate-700">
                              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Logo</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Name</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Assignment</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teams.map((team, i) => {
                              const isAssignedA = poolA.includes(team.id || team._id);
                              const isAssignedB = poolB.includes(team.id || team._id);
                              const isAssigned = isAssignedA || isAssignedB;

                              return (
                                <tr key={team.id || team._id || i} className="border-b border-slate-800/50 hover:bg-white/5 transition-all">
                                  <td className="px-4 py-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700">
                                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-black text-white uppercase">{team.name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2 justify-center">
                                      <button
                                        disabled={isAssigned || poolA.length >= 5}
                                        onClick={() => handleSendToPool(team, 'poolA')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAssignedA ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white'}`}
                                      >
                                        {isAssignedA ? "In Pool A" : "Send to A"}
                                      </button>
                                      <button
                                        disabled={isAssigned || poolB.length >= 5}
                                        onClick={() => handleSendToPool(team, 'poolB')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAssignedB ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-600 hover:text-white'}`}
                                      >
                                        {isAssignedB ? "In Pool B" : "Send to B"}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isAssigned ? (
                                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${isAssignedA ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {isAssignedA ? 'Pool A' : 'Pool B'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-slate-800 text-slate-500">Unassigned</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
                                <p className="text-2xl font-black text-violet-400">{formatCurrency(mostExpensive.soldPrice)}</p>
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
                                <span className={`font-black text-lg ${i === 0 ? 'text-violet-400' : 'text-slate-500'}`}>{formatCurrency(h.bid)}</span>
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
                {/* HEADER ROW - Glassmorphism Card */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch p-4 md:p-6 bg-black/45 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_10px_rgba(0,255,200,0.2)] transition-all duration-300 ease hover:-translate-y-1 hover:scale-[1.02]">
                  {/* 1. PHOTO - Glass Panel */}
                  <div className="relative group/photo w-[140px] h-[180px] sm:w-[160px] sm:h-[200px] md:w-[180px] md:h-[220px] rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_15px_rgba(0,255,200,0.3)] bg-black/50 backdrop-blur-sm ring-4 ring-black/40 transition-all duration-300 ease hover:shadow-[0_12px_40px_rgba(0,255,200,0.4)]">
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

                  {/* 2. PLAYER INFORMATION - Floating Glass */}
                  <div className="w-full md:w-[45%] flex flex-col justify-center space-y-4 md:px-4 md:border-x md:border-cyan-500/15">
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
                            <span className="text-sm text-gray-400 font-black uppercase tracking-widest">{formatCurrency(player.basePrice)}</span>
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

                  {/* 3. DYNAMIC STATUS PANEL - Glass Effect */}
                  <div className="w-full md:w-[20%] auction-card rounded-2xl border border-cyan-500/25 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden group bg-black/45 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_10px_rgba(0,255,200,0.2)] transition-all duration-300 ease hover:-translate-y-1 hover:scale-105">
                    {player.status === "available" || player.status === "auction" ? (
                      <>
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
                        <p className="text-violet-500/60 uppercase tracking-[0.3em] text-[10px] font-black mb-2">Current Highest Bid</p>
                        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black text-violet-400 tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] ${bidPulse ? 'bid-animation' : ''}`}>
                          {formatCurrency(currentBid)}
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
                            <h1 className="text-5xl font-black text-white leading-none mb-3 drop-shadow-lg">{formatCurrency(player.soldPrice)}</h1>
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
                        {/* Revert Unsold Button */}
                        <button
                          onClick={revertSale}
                          className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 mx-auto"
                        >
                          <span>↩️</span> Revert Unsold
                        </button>
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
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next Bid:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 text-[10px] font-black">{isPointsSystem() ? 'PTS' : '₹'}</span>
                          <input
                            type="number"
                            value={bidIncrement}
                            onChange={(e) => setBidIncrement(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-black text-violet-400 w-24 focus:border-violet-500 outline-none transition-all shadow-inner"
                            placeholder={isPointsSystem() ? getBidIncrement(currentBid || 2) : 100}
                          />
                          <button onClick={() => setBidIncrement(isPointsSystem() ? ((currentBid || 2) + getBidIncrement(currentBid || 2)) : (currentBid + 100))} className="text-[8px] font-black text-violet-500 hover:text-white uppercase ml-1 transition-colors">Auto</button>
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
                          {highestBidder && <span className="text-[10px] font-bold text-violet-100 opacity-80 bg-black/20 px-2 py-0.5 rounded-full">{formatCurrency(currentBid)}</span>}
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
                        {teams.map(team => {
                          const limits = getSquadLimits();
                          const currentSquadSize = team.players?.length || 0;
                          const canBid = canPlaceBid && highestBidder !== team.id && canTeamBid(team);
                          const canBidYear = isPointsSystem() ? canBidForPlayerYear(team, player) : true;
                          const finalCanBid = canBid && canBidYear;
                          const restrictionReason = getBidRestrictionReason(team);
                          const yearRestrictionReason = isPointsSystem() ? getYearRestrictionReason(team, player) : null;
                          const finalReason = !finalCanBid ? (yearRestrictionReason || restrictionReason) : null;
                          
                          return (
                          <button
                            key={team.id}
                            onClick={() => placeBid(team.id)}
                            disabled={!finalCanBid}
                            className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 transition-all duration-200 ${highestBidder === team.id ? 'ring-2 ring-violet-400 rounded-lg scale-[1.08] z-10' : ''} ${!finalCanBid ? 'disabled:opacity-40 disabled:grayscale' : 'hover:opacity-100'} relative group`}
                            title={!finalCanBid ? finalReason : `Click to bid`}
                          >
                            {/* Circular Logo */}
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800/40 border-2 border-slate-600 flex items-center justify-center shadow-md flex-shrink-0">
                              <img src={team.logoUrl} alt={`${team.name} logo`} className="w-20 h-20 object-cover" />
                            </div>

                            {/* Team Name + Squad Info */}
                            <span className="text-[9px] block truncate w-full leading-tight text-slate-300 tracking-[0.1em] text-center font-semibold">{team.name}</span>
                            <span className="text-[10px] block font-black leading-none text-violet-400">{formatCurrency(team.remainingBudget)}</span>
                            <span className="text-[8px] block font-medium leading-none text-slate-500">{currentSquadSize}/{limits.maxPlayers}</span>
                            
                            {/* Squad completion warning */}
                            {currentSquadSize >= limits.maxPlayers && (
                              <span className="text-[7px] block font-black leading-none text-red-400 animate-pulse">SQUAD FULL</span>
                            )}
                            {currentSquadSize < limits.minPlayers && (
                              <span className="text-[7px] block font-black leading-none text-amber-400">NEED {limits.minPlayers - currentSquadSize}</span>
                            )}
                            
                            {/* Year restriction warning */}
                            {isPointsSystem() && !canBidYear && (
                              <span className="text-[7px] block font-black leading-none text-orange-400">YEAR LIMIT</span>
                            )}
                            
                            {/* Restriction tooltip */}
                            {!finalCanBid && finalReason && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-[8px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                {finalReason}
                              </div>
                            )}
                          </button>
                        )})}
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
              <div className="h-full flex flex-col overflow-hidden">
                {/* Final Report Header */}
                <div className="shrink-0 flex items-center justify-between p-6 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-3xl">🏆</span>
                      <h2 className="text-2xl font-black tracking-tight text-white">Auction Concluded</h2>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Final Results — {config.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <p className="text-xs text-slate-500 font-bold uppercase">Sold</p>
                      <p className="text-2xl font-black text-violet-400">{players.filter(p => !p.type && p.status === 'sold').length}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-xs text-slate-500 font-bold uppercase">Unsold</p>
                      <p className="text-2xl font-black text-red-400">{players.filter(p => !p.type && p.status === 'unsold').length}</p>
                    </div>
                    <button
                      onClick={() => {
                        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                        const sold = players.filter(p => !p.type && p.status === 'sold').sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
                        const unsold = players.filter(p => !p.type && p.status === 'unsold');

                        // Header
                        doc.setFillColor(15, 15, 30);
                        doc.rect(0, 0, 210, 297, 'F');
                        doc.setFontSize(20);
                        doc.setTextColor(200, 170, 255);
                        doc.setFont('helvetica', 'bold');
                        doc.text('AUCTION FINAL REPORT', 105, 18, { align: 'center' });
                        doc.setFontSize(10);
                        doc.setTextColor(150, 150, 180);
                        doc.text(config.name.toUpperCase(), 105, 26, { align: 'center' });
                        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

                        // Summary bar
                        doc.setFillColor(30, 20, 60);
                        doc.roundedRect(10, 38, 190, 14, 3, 3, 'F');
                        doc.setFontSize(9);
                        doc.setTextColor(200, 170, 255);
                        doc.text(`SOLD: ${sold.length} players`, 20, 47);
                        doc.text(`UNSOLD: ${unsold.length} players`, 80, 47);
                        const totalSpend = sold.reduce((s, p) => s + (p.soldPrice || 0), 0);
                        doc.text(`TOTAL SPEND: ${totalSpend} CR`, 140, 47);

                        // Table header
                        let y = 60;
                        doc.setFillColor(80, 50, 150);
                        doc.rect(10, y, 190, 8, 'F');
                        doc.setFontSize(8);
                        doc.setTextColor(255, 255, 255);
                        doc.text('#', 14, y + 5.5);
                        doc.text('App ID', 22, y + 5.5);
                        doc.text('Player Name', 42, y + 5.5);
                        doc.text('Role', 110, y + 5.5);
                        doc.text('Team', 135, y + 5.5);
                        doc.text('Price', 175, y + 5.5);
                        y += 10;

                        // SOLD players
                        sold.forEach((p, i) => {
                          if (y > 270) { doc.addPage(); y = 15; doc.setFillColor(15, 15, 30); doc.rect(0, 0, 210, 297, 'F'); }
                          doc.setFillColor(i % 2 === 0 ? 20 : 25, i % 2 === 0 ? 15 : 20, i % 2 === 0 ? 40 : 50);
                          doc.rect(10, y, 190, 7, 'F');
                          doc.setFontSize(7.5);
                          doc.setTextColor(220, 220, 240);
                          doc.text(`${i + 1}`, 14, y + 5);
                          doc.text(`${p.applicationId || '-'}`, 22, y + 5);
                          doc.text(`${(p.name || '').substring(0, 27)}`, 42, y + 5);
                          doc.text(`${(p.role || '-').substring(0, 14)}`, 110, y + 5);
                          const teamName = teams.find(t => t.id === p.team || t._id === p.team)?.name || '-';
                          doc.text(`${teamName.substring(0, 18)}`, 135, y + 5);
                          doc.setTextColor(180, 150, 255);
                          doc.text(`${(p.soldPrice || 0)} CR`, 175, y + 5);
                          y += 7;
                        });

                        // UNSOLD separator
                        if (unsold.length > 0) {
                          y += 4;
                          doc.setFillColor(120, 40, 40);
                          doc.rect(10, y, 190, 8, 'F');
                          doc.setFontSize(8);
                          doc.setTextColor(255, 200, 200);
                          doc.text('UNSOLD PLAYERS', 105, y + 5.5, { align: 'center' });
                          y += 10;
                          unsold.forEach((p, i) => {
                            if (y > 270) { doc.addPage(); y = 15; doc.setFillColor(15, 15, 30); doc.rect(0, 0, 210, 297, 'F'); }
                            doc.setFillColor(40, 15, 15);
                            doc.rect(10, y, 190, 7, 'F');
                            doc.setFontSize(7.5);
                            doc.setTextColor(200, 150, 150);
                            doc.text(`${sold.length + i + 1}`, 14, y + 5);
                            doc.text(`${p.applicationId || '-'}`, 22, y + 5);
                            doc.text(`${(p.name || '').substring(0, 27)}`, 42, y + 5);
                            doc.text(`${(p.role || '-').substring(0, 14)}`, 110, y + 5);
                            doc.text('-', 135, y + 5);
                            doc.setTextColor(150, 100, 100);
                            doc.text('UNSOLD', 175, y + 5);
                            y += 7;
                          });
                        }

                        // Footer
                        doc.setFontSize(7);
                        doc.setTextColor(80, 80, 100);
                        doc.text('Designed by Ravikumar K P', 105, 292, { align: 'center' });

                        doc.save(`${config.name.replace(/\s+/g, '_')}_auction_report.pdf`);
                      }}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-5 py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-violet-900/40 border border-violet-500/50 active:scale-95"
                    >
                      ⬇ Download Final Report
                    </button>
                    <Link href="/auction" className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-bold transition-all border border-slate-700 text-sm">
                      ← Dashboard
                    </Link>
                  </div>
                </div>

                {/* Final Report Table - responsive scrollable wrapper */}
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-8">#</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">App ID</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* SOLD PLAYERS — sorted highest to lowest */}
                      {[...players.filter(p => !p.type && p.status === 'sold')]
                        .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
                        .map((p, i) => {
                          const team = teams.find(t => t.id === p.team || t._id === p.team);
                          return (
                            <tr key={p._id || p.id || i} className={`border-b border-slate-800/50 transition-all hover:bg-violet-500/5 ${i === 0 ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-4 py-3 text-xs font-black text-slate-600">{i + 1}</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{p.applicationId}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
                                    <img src={p.photo?.s3 || p.photo?.drive || p.image} className="w-full h-full object-cover" alt="" onError={e => e.target.style.display = 'none'} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">{p.name}</p>
                                    <p className="text-[10px] text-slate-500 italic">{p.village}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">{p.role}</span>
                              </td>
                              <td className="px-4 py-3">
                                {team ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded overflow-hidden border border-slate-700 shrink-0">
                                      <img src={team.logoUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase truncate max-w-[120px]">{team.name}</span>
                                  </div>
                                ) : <span className="text-slate-600 italic text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-base font-black text-violet-400">{(p.soldPrice || 0).toLocaleString()} PTS</span>
                                  {i === 0 && <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Top Sale 🥇</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {/* UNSOLD SEPARATOR */}
                      {players.some(p => !p.type && p.status === 'unsold') && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 bg-red-900/20 border-t-2 border-red-800/50 border-b border-red-900/30">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                              ✕ Unsold Players ({players.filter(p => !p.type && p.status === 'unsold').length})
                            </p>
                          </td>
                        </tr>
                      )}

                      {/* UNSOLD PLAYERS */}
                      {players.filter(p => !p.type && p.status === 'unsold').map((p, i) => (
                        <tr key={p._id || p.id || i} className="border-b border-slate-800/30 opacity-60 transition-all hover:opacity-90">
                          <td className="px-4 py-3 text-xs font-black text-slate-700">{players.filter(q => !q.type && q.status === 'sold').length + i + 1}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-black text-slate-600 bg-slate-800 px-2 py-0.5 rounded">{p.applicationId}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 grayscale">
                                <img src={p.photo?.s3 || p.photo?.drive || p.image} className="w-full h-full object-cover" alt="" onError={e => e.target.style.display = 'none'} />
                              </div>
                              <p className="text-sm font-black text-slate-500 uppercase tracking-tight">{p.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-900 px-2 py-0.5 rounded">{p.role}</span>
                          </td>
                          <td className="px-4 py-3"><span className="text-slate-700 italic text-xs">Not Sold</span></td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-black text-red-600 uppercase">UNSOLD</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

function LiveAuctionWithSplash({ tournamentId, role }) {
  const searchParams = useSearchParams()
  const isAdmin = role === 'admin'
  const [showSplash, setShowSplash] = useState(!isAdmin)
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
    if (isAdmin) return;
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
  }, [isAdmin])

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

      <div className={`${!isAdmin ? `transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}` : ''}`}>
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
  const role = searchParams.get("role")
  const tournamentId = searchParams.get("id")

  return <LiveAuctionWithSplash tournamentId={tournamentId} role={role} />
}
