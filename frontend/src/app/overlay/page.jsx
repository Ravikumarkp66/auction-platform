"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { io } from "socket.io-client"
import Image from "next/image"
import { API_URL, getMediaUrl } from "../../lib/apiConfig"
import { Instagram, Phone, Gavel, Award, Users, ClipboardList, Zap } from "lucide-react"
import AuctionOverlayNew from '../../components/AuctionOverlayNew'
import TeamDrawCinematic from './TeamDrawCinematic'
import TeamDrawOverlay from '../../components/TeamDrawOverlay'
import SuperRaidOverlay from '../../components/SuperRaidOverlay'
import ResultOverlay from '../../components/ResultOverlay'
import SplashScreen from '../../components/SplashScreen'
import { VoiceChatViewer } from '../../components/VoiceChat'

function getStoredBreakState() {
  if (typeof window === 'undefined') {
    return null
  }

  const keys = ['currentBreakState', 'overlayBreakState']

  for (const key of keys) {
    const storage = key === 'currentBreakState' ? sessionStorage : localStorage
    const raw = storage.getItem(key)
    if (!raw) continue

    try {
      const breakData = JSON.parse(raw)
      if (breakData?.endTime > Date.now()) {
        return breakData
      }
      storage.removeItem(key)
    } catch {
      storage.removeItem(key)
    }
  }

  return null
}

export default function OverlayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [auction, setAuction] = useState(null)
  const [socket, setSocket] = useState(null)
  const [breakTime, setBreakTime] = useState(() => getStoredBreakState())
  const [language, setLanguage] = useState('en')
  const [breakNow, setBreakNow] = useState(() => Date.now())
  const [focusMode, setFocusMode] = useState(false)
  const [splashUrl, setSplashUrl] = useState('https://auction-platform-kp.s3.ap-south-1.amazonaws.com/banners/goravanahalli_bg_1781432915363.png')
  const [poolA, setPoolA] = useState([])
  const [poolB, setPoolB] = useState([])
  const [drawEvent, setDrawEvent] = useState(null)
  const [superRaid, setSuperRaid] = useState(null)
  const [showPoolView, setShowPoolView] = useState(false)
  // Store auction result separately to prevent unmounting during animation
  const [auctionResult, setAuctionResult] = useState(null)
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  const [defaultTournamentName, setDefaultTournamentName] = useState('')

  // Fetch active tournament on mount to load initial assets/logo
  useEffect(() => {
    let isMounted = true
    async function fetchActiveTournament() {
      try {
        const res = await fetch(`${API_URL}/api/tournaments/status/active`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.tournament && isMounted) {
            setDefaultTournamentName(data.tournament.name)
            if (data.tournament.assets?.splashUrl) {
              setSplashUrl(data.tournament.assets.splashUrl)
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch active tournament:", err)
      }
    }
    fetchActiveTournament()
    return () => {
      isMounted = false
    }
  }, [])

  // Track window size for responsive background switching
  useEffect(() => {
    const handleResize = () => setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobileView = windowSize.width < windowSize.height || windowSize.width < 768
  const visibleAuctionResult = auction?.player?.status === 'active' ? null : auctionResult

  // Same id the admin page uses for voice (Mongo tournament _id from auctionUpdate)
  const rawVoiceRoom = auction?._id ?? auction?.tournament?._id ?? null
  const voiceRoomId = rawVoiceRoom != null && rawVoiceRoom !== "" ? String(rawVoiceRoom) : null
  const voiceOverlay =
    socket && voiceRoomId ? (
      <div style={{ position: "fixed", top: 68, right: 12, zIndex: 500000, pointerEvents: "auto" }}>
        <VoiceChatViewer socket={socket} roomId={voiceRoomId} />
      </div>
    ) : null

  // Update auction result ONLY when socket event arrives (not from player status)
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ No socket connection in overlay');
      return;
    }

    console.log('🔌 Setting up socket listeners for playerSold and playerUnsold');

    // Listen for playerSold event from admin
    socket.on('playerSold', (data) => {
      console.log('🔨 SOLD EVENT RECEIVED:', data);
      console.log('📊 Event data validation:', {
        hasPlayerName: !!data.playerName,
        hasPrice: !!data.soldPrice,
        hasTeamName: !!data.teamName,
        hasTeamLogo: !!data.teamLogo,
        playerId: data.playerId,
        teamId: data.teamId
      });

      const resultData = {
        type: 'SOLD',
        playerName: data.playerName,
        price: data.soldPrice,
        teamName: data.teamName,
        teamLogo: data.teamLogo,
        teamColor: data.teamColor || '#a855f7',
        teamShortName: data.teamShortName,
        playerImage: data.playerImage,
        currency: data.currency || (data.isPointsSystem ? "" : "₹"),
        isPointsSystem: data.isPointsSystem ?? false
      };

      console.log('✅ Setting auctionResult:', resultData);
      setAuctionResult(resultData);

      // Auto-clear after animation (3 seconds)
      setTimeout(() => {
        console.log('🕐 Auto-clearing auctionResult after 3 seconds');
        setAuctionResult(null);
      }, 3000);
    });

    // Listen for unsold event
    socket.on('playerUnsold', (data) => {
      console.log('❌ UNSOLD EVENT RECEIVED:', data);

      const resultData = {
        type: 'UNSOLD',
        playerName: data.playerName,
        playerImage: data.playerImage,
        currency: data.currency || (data.isPointsSystem ? "" : "₹"),
        isPointsSystem: data.isPointsSystem ?? false
      };

      setAuctionResult(resultData);

      // Auto-clear after animation
      setTimeout(() => {
        setAuctionResult(null);
      }, 3000);
    });

    // Connection status monitoring
    socket.on('connect', () => {
      console.log('✅ Overlay socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Overlay socket disconnected:', reason);
    });

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('playerSold');
      socket.off('playerUnsold');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);

  // Note: Breaks are now driven only by socket events from the admin panel,
  // not by URL query parameters, to avoid accidental unsynchronised breaks.

  // Save break state to both storage methods when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (breakTime) {
        localStorage.setItem('overlayBreakState', JSON.stringify(breakTime))
        sessionStorage.setItem('currentBreakState', JSON.stringify(breakTime))
      } else {
        localStorage.removeItem('overlayBreakState')
        sessionStorage.removeItem('currentBreakState')
      }
    }
  }, [breakTime])

  // Check for expired breaks periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (breakTime && breakTime.endTime <= Date.now()) {
        setBreakTime(null)
        localStorage.removeItem('overlayBreakState')
        sessionStorage.removeItem('currentBreakState')
      }
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [breakTime])

  // Language switching effect for break display
  useEffect(() => {
    if (breakTime) {
      // smooth 1-second ticking for countdown
      const tick = setInterval(() => {
        setBreakNow(Date.now())
      }, 1000)

      const interval = setInterval(() => {
        setLanguage(prev => prev === 'en' ? 'kn' : 'en')
      }, 3000) // Switch every 3 seconds

      return () => {
        clearInterval(interval)
        clearInterval(tick)
      }
    }
  }, [breakTime])

  // Redirect standard authenticated users (if any) away from overlay, but ALLOW ADMINS
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role?.toLowerCase() !== "admin") {
      router.push("/auction");
    }
  }, [status, session, router])

  // Connect to socket for all users (Public and Admins watching live)
  useEffect(() => {
    // Now we connect regardless of authentication status so admins can also "Watch Live"
    if (status !== "loading") {
      console.log('🔌 Attempting socket connection to:', API_URL);

      const s = io(API_URL, {
        transports: ['websocket', 'polling'], // Prefer websocket for stability
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 20,
        forceNew: true,
        autoConnect: true
      })

      const timeoutId = setTimeout(() => {
        setSocket(s)
      }, 0)

      // Connection events
      s.on('connect', () => {
        console.log('✅ Overlay socket connected successfully:', s.id);
        console.log('📡 Socket transport:', s.io.opts.transports);
        s.emit('getBreakStatus') // Request current break status
        s.emit('getAuctionState') // Request current auction state (for voice room ID)
      })

      s.on('connect_error', (error) => {
        console.error('❌ Socket connection ERROR:', error.message);
        console.error('Connection details:', {
          url: API_URL,
          transports: s.io.opts.transports,
          readyState: s.readyState
        });
        console.log('🔄 Will retry connection...');
      })

      s.on('reconnect', (attemptNumber) => {
        console.log('🔁 Reconnected after', attemptNumber, 'attempts');
      })

      s.on('reconnect_error', (error) => {
        console.warn('⚠️ Reconnection error:', error.message);
      })

      s.on('disconnect', (reason) => {
        console.warn('⚠️ Overlay socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, reconnect manually
          s.connect()
        }
      })

      s.on('connect_error', () => {
        setTimeout(() => {
          s.connect()
        }, 2000)
      })

      s.on("auctionUpdate", (data) => {
        setAuction(data)
        // Use tournament splash URL if available, otherwise keep default
        if (data.tournament?.assets?.splashUrl) {
          setSplashUrl(data.tournament.assets.splashUrl);
        }
        if (data.tournament?.pools) {
          const teamsList = data.teams || [];
          setPoolA((data.tournament.pools.poolA || []).map(id => teamsList.find(t => t._id === id || t.id === id)).filter(Boolean));
          setPoolB((data.tournament.pools.poolB || []).map(id => teamsList.find(t => t._id === id || t.id === id)).filter(Boolean));
        }
      })

      s.on("teamDrawEvent", (data) => {
        // Immediately update the pool lists so the board fills in real time
        if (data.team && data.pool) {
          const teamObj = data.team; // { id, name, logoUrl }
          if (data.pool === 'poolA') {
            setPoolA(prev => {
              const already = prev.some(t => (t.id || t._id) === (teamObj.id || teamObj._id));
              return already ? prev : [...prev, teamObj];
            });
          } else if (data.pool === 'poolB') {
            setPoolB(prev => {
              const already = prev.some(t => (t.id || t._id) === (teamObj.id || teamObj._id));
              return already ? prev : [...prev, teamObj];
            });
          }
        }
        setDrawEvent(data);
        setTimeout(() => setDrawEvent(null), 11000);
      })

      // Cinematic in-game events (e.g. Super Raid)
      s.on("superRaid", (data) => {
        // Expecting { title, iconUrl, teamColor, scoreFrom, scoreTo }
        setSuperRaid(data);
        // auto clear after animation length
        setTimeout(() => setSuperRaid(null), 4200);
      })

      s.on("togglePoolView", (data) => {
        setShowPoolView(data.show);
      })

      s.on("resetPoolsDraw", () => {
        setPoolA([]);
        setPoolB([]);
      })

      // Listen for break time events from backend (driven by admin panel)
      s.on("breakTime", (data) => {
        const breakData = {
          type: data.type,
          duration: data.duration,
          endTime: data.endTime,
          customReason: data.customReason,
          startTime: data.startTime
        }
        setBreakTime(breakData)

        // Save to both storage methods
        if (typeof window !== 'undefined') {
          localStorage.setItem('overlayBreakState', JSON.stringify(breakData))
          sessionStorage.setItem('currentBreakState', JSON.stringify(breakTime))
        }
      })

      // Listen for break status updates (for users joining late)
      s.on("breakStatus", (data) => {
        if (data.isActive && data.endTime) {
          const breakData = {
            type: data.type,
            duration: data.duration,
            endTime: data.endTime,
            customReason: data.customReason,
            startTime: data.startTime
          }
          setBreakTime(breakData)

          // Save to both storage methods
          if (typeof window !== 'undefined') {
            localStorage.setItem('overlayBreakState', JSON.stringify(breakData))
            sessionStorage.setItem('currentBreakState', JSON.stringify(breakTime))
          }
        }
      })

      s.on("breakTimeEnd", () => {
        setBreakTime(null)
        // Clear both storage methods when break ends
        if (typeof window !== 'undefined') {
          localStorage.removeItem('overlayBreakState')
          sessionStorage.removeItem('currentBreakState')
        }
      })

      return () => {
        clearTimeout(timeoutId)
        s.disconnect()
      }
    }
  }, [status])

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 border-8 border-slate-800 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black animate-pulse text-4xl uppercase tracking-[0.5em]">
            LOADING
          </p>
        </div>
      </div>
    )
  }

  // Removed 'Already Logged In' blockade to allow admins to watch live feed.


  // Pool draw takes HIGHEST PRIORITY — admin has explicitly activated it
  if (showPoolView) {
    return (
      <>
        {voiceOverlay}
        <TeamDrawOverlay poolA={poolA} poolB={poolB} drawEvent={drawEvent} />
        {drawEvent && (
          <TeamDrawCinematic event={drawEvent} onComplete={() => setDrawEvent(null)} />
        )}
      </>
    )
  }

  // Show break time if active (takes priority over everything)
  if (breakTime) {
    // Remaining time in seconds, derived from shared endTime and ticking reference
    const remainingSeconds = Math.max(0, Math.floor((breakTime.endTime - breakNow) / 1000))
    const remainingMinutes = Math.floor(remainingSeconds / 60)
    const displaySeconds = remainingSeconds % 60

    const translations = {
      en: {
        breakTime: 'BREAK TIME',
        lunchBreak: 'Lunch Break',
        teaBreak: 'Tea Break',
        shortBreak: 'Short Break',
        technicalBreak: 'Technical Break',
        customBreak: 'Custom Break',
        weWillBeBack: 'We will be back in',
        minutes: 'minutes'
      },
      kn: {
        breakTime: 'ವಿರಾಮದ ಸಮಯ',
        lunchBreak: 'ಊಟದ ವಿರಾಮ',
        teaBreak: 'ಚಹಾ ವಿರಾಮ',
        shortBreak: 'ಅಲ್ಪ ವಿರಾಮ',
        technicalBreak: 'ತಾಂತ್ರಿಕ ವಿರಾಮ',
        customBreak: 'ವಿಶೇಷ ವಿರಾಮ',
        weWillBeBack: 'ನಾವು ಇಷ್ಟರಲ್ಲೇ ಹಿಂತಿರುಗುತ್ತೇವೆ',
        minutes: 'ನಿಮಿಷಗಳಲ್ಲಿ'
      }
    }

    const t = translations[language]
    const breakTypeMap = {
      'lunch': t.lunchBreak,
      'tea': t.teaBreak,
      'short': t.shortBreak,
      'technical': t.technicalBreak,
      'custom': breakTime.customReason || t.customBreak
    }
    const breakTypeLabel = breakTypeMap[breakTime.type] || t.customBreak
    const tourLogo = auction?.tournamentLogo || auction?.tournament?.assets?.logoUrl || auction?.tournament?.organizerLogo;

    return (
      <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center overflow-hidden font-sans">
        {voiceOverlay}
        {/* Aspect-Ratio Poster Stage */}
        <div
          className="relative flex flex-col items-center overflow-hidden"
          style={{
            width: isMobileView ? '100vw' : '100vw',
            height: isMobileView ? '100vh' : '100vh',
            maxWidth: isMobileView ? '100vw' : '177.78vh',
            maxHeight: isMobileView ? '177.78vw' : '100vh',
            aspectRatio: isMobileView ? '9 / 16' : '16 / 9',
            backgroundImage: `url(${getMediaUrl(isMobileView
              ? 'https://auction-platform-kp.s3.ap-south-1.amazonaws.com/backgrounds/auction-timer-mobile.png'
              : 'https://auction-platform-kp.s3.ap-south-1.amazonaws.com/backgrounds/auction-timer.png')})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#000'
          }}
        >


          {/* 2. SECONDARY SIDE ELEMENTS - Minimized on mobile to focus on timer */}
          <div className="absolute inset-0 z-10 pointer-events-none px-[4%] py-[10%] flex justify-between items-center">
            {/* Left Sidebar - Extremely compact on mobile */}
            <div className={`flex flex-col gap-1.5 transition-all duration-700 ${isMobileView ? 'opacity-20 scale-[0.6] origin-left mt-[20%]' : 'opacity-100'}`}>
              {[
                { icon: <Gavel size={12} />, label: 'AUCTION' },
                { icon: <Users size={12} />, label: 'REGISTRY' },
                { icon: <Award size={12} />, label: 'SQUADS' }
              ].map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm border-l-2 border-amber-500/30 rounded-r-md">
                  <span className="text-amber-400">{s.icon}</span>
                  <span className="text-white text-[8px] font-black tracking-widest uppercase">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Right Sidebar - Extremely compact on mobile */}
            <div className={`flex flex-col items-end transition-all duration-700 ${isMobileView ? 'opacity-20 scale-[0.6] origin-right mt-[20%]' : 'opacity-100'}`}>
              <div className="bg-black/40 backdrop-blur-md p-3 border-r-2 border-amber-500/30 rounded-l-lg text-right" style={{ maxWidth: '110px' }}>
                <p className="text-white text-[9px] font-black leading-tight tracking-tighter uppercase italic">
                  YOUR EVENT,<br />OUR MANAGEMENT
                </p>
              </div>
            </div>
          </div>

          {/* 3. CENTER TIMER FRAME - THE MAIN FOCUS */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center z-20 pointer-events-none"
            style={{
              top: isMobileView ? '37.5%' : '40%',
              width: isMobileView ? '85%' : '65%',
              height: isMobileView ? '22%' : '30%',
              gap: isMobileView ? '6px' : '12px',
              padding: isMobileView ? '12px' : '32px'
            }}
          >
            {/* Break Title */}
            <p
              className="text-amber-400 font-black uppercase italic tracking-[0.3em] leading-none"
              style={{
                fontSize: isMobileView ? 'clamp(0.7rem, 3vw, 1.1rem)' : 'clamp(1rem, 2.2vw, 2rem)',
                textShadow: '0 0 20px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {breakTypeLabel}
            </p>

            {/* Countdown Timer - Premium Typography */}
            <div
              className="font-black leading-none text-white flex items-center justify-center tracking-tighter"
              style={{
                fontSize: isMobileView ? 'clamp(3.2rem, 14vw, 5.5rem)' : 'clamp(5.5rem, 16vw, 10rem)',
                fontFamily: "'Inter', sans-serif", // Ensure premium sans-serif
                textShadow: `
                  0 0 40px rgba(255,255,255,0.2), 
                  0 10px 40px rgba(0,0,0,0.5),
                  0 0 80px rgba(251, 191, 36, 0.15)
                `,
                filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.1))',
                animation: 'timerSubtleGlow 3s ease-in-out infinite'
              }}
            >
              {remainingMinutes.toString().padStart(2, '0')}<span className="opacity-40 mx-[-0.05em]">:</span>{displaySeconds.toString().padStart(2, '0')}
            </div>

            {/* Subtitle */}
            <p
              className="text-white/60 font-black uppercase tracking-[0.2em] leading-none"
              style={{
                fontSize: isMobileView ? 'clamp(0.55rem, 2vw, 0.8rem)' : 'clamp(0.8rem, 1.5vw, 1.2rem)',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                letterSpacing: '0.25em'
              }}
            >
              {t.weWillBeBack}
            </p>
          </div>

          {/* 4. FOOTER SECTION - Simplified & Fixed */}
          <div
            className="absolute left-0 right-0 px-6 flex flex-wrap items-center justify-center gap-3 sm:gap-10 z-30"
            style={{
              bottom: 'max(4%, env(safe-area-inset-bottom, 20px))',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            {/* Phone */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full shadow-xl">
              <Phone size={11} className="text-amber-400" />
              <span className="text-white font-bold tracking-tighter" style={{ fontSize: 'clamp(9px, 1.2vw, 14px)' }}>
                +91 81470 89330
              </span>
            </div>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/lakshmish_virat/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full shadow-xl"
            >
              <Instagram size={11} className="text-amber-400" />
              <span className="text-white font-bold tracking-tighter" style={{ fontSize: 'clamp(9px, 1.2vw, 14px)' }}>
                @lakshmish_virat
              </span>
            </a>
          </div>
        </div>

        <style jsx>{`
          @keyframes timerSubtleGlow {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.95; filter: brightness(1.05); }
          }
        `}</style>
      </div>
    )
  }

  if (!auction || !auction.player) {
    const splashTitle = auction?.tournamentName
      ? (auction.tournamentName.toUpperCase().includes('SEASON') ? auction.tournamentName : `${auction.tournamentName} - SEASON 01`)
      : (defaultTournamentName
          ? (defaultTournamentName.toUpperCase().includes('SEASON') ? defaultTournamentName : `${defaultTournamentName} - SEASON 01`)
          : 'GORAVANAHALLI PREMIERE LEAGUE - SEASON 01');
    return (
      <>
        {voiceOverlay}
        <SplashScreen src={getMediaUrl(splashUrl)} title={splashTitle} />
      </>
    )
  }

  const { player, currentBid, highestBidder, highestBidderLogo, tournamentName, teams, roundHistory } = auction

  // Use new premium overlay component
  return (
    <>
      {voiceOverlay}
      <AuctionOverlayNew
        player={player}
        nextPlayer={auction.nextPlayer}
        teams={teams}
        currentBid={currentBid}
        highestBidder={highestBidder}
        highestBidderLogo={highestBidderLogo}
        tournamentName={tournamentName}
        tournamentLogo={auction.tournamentLogo || auction.tournament?.assets?.logoUrl || auction.tournament?.organizerLogo}
        roundHistory={roundHistory}
        auctionResult={visibleAuctionResult}
        currencyUnit={auction.tournament?.currencyUnit || (auction.tournament?.auctionMode === "points" ? "CR" : "₹")}
        iconsPerTeam={auction.tournament?.iconsPerTeam || 0}
        maxSlots={auction.tournament?.squad?.maxPlayers || auction.tournament?.squadSize || 15}
      />

      {/* SOLD/UNSOLD ANIMATION - Exact same logic as admin auction */}
      {visibleAuctionResult && (
        <ResultOverlay
          type={visibleAuctionResult.type}
          playerName={visibleAuctionResult.playerName}
          price={visibleAuctionResult.price}
          teamName={visibleAuctionResult.teamName}
          teamLogo={visibleAuctionResult.teamLogo}
          teamColor={visibleAuctionResult.teamColor}
          teamShortName={visibleAuctionResult.teamShortName}
          playerImage={visibleAuctionResult.playerImage}
          onSkip={() => {
            setAuctionResult(null);
          }}
          currency={visibleAuctionResult.currency}
          isPointsSystem={visibleAuctionResult.isPointsSystem}
        />
      )}

      {/* EXPLICIT POOL DRAW VIEW (ADMIN CONTROLLED) */}
      {showPoolView && (
        <TeamDrawOverlay
          poolA={poolA}
          poolB={poolB}
          drawEvent={drawEvent}
        />
      )}

      {/* INDEPENDENT CINEMATIC TRIGGER (Overlay) */}
      {superRaid && (
        <SuperRaidOverlay event={superRaid} onComplete={() => setSuperRaid(null)} />
      )}
      {drawEvent && (
        <TeamDrawCinematic
          event={drawEvent}
          onComplete={() => setDrawEvent(null)}
        />
      )}

    </>
  )
}
