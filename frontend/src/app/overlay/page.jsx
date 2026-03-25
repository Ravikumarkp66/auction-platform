"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { io } from "socket.io-client"
import Image from "next/image"
import AuctionOverlayNew from '../../components/AuctionOverlayNew'
import TeamDrawCinematic from './TeamDrawCinematic'
import TeamDrawOverlay from '../../components/TeamDrawOverlay'
import ResultOverlay from '../../components/ResultOverlay'

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
  const [splashUrl, setSplashUrl] = useState('https://auction-platform-kp.s3.ap-south-1.amazonaws.com/backgrounds/auction+bg.jpg')
  const [poolA, setPoolA] = useState([])
  const [poolB, setPoolB] = useState([])
  const [drawEvent, setDrawEvent] = useState(null)
  const [showPoolView, setShowPoolView] = useState(false)
  // Store auction result separately to prevent unmounting during animation
  const [auctionResult, setAuctionResult] = useState(null)

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

  // Clear result when new player starts (but not during ongoing animation)
  useEffect(() => {
    // Only clear if player status changes to 'active' AND we currently have a result showing
    if (auction?.player?.status === 'active' && auctionResult) {
      console.log('🧹 DEBUG: Clearing auctionResult for new active player');
      setAuctionResult(null); // Clear overlay when new player starts
    }
  }, [auction?.player?.status]);



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

  // Redirect logged-in users away from overlay
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/auction"); // Redirect to admin auction page, not public auctions
      return
    }
  }, [status, router])

  // Connect to socket for unauthenticated users
  useEffect(() => {
    // Only connect if user is not authenticated
    if (status === "unauthenticated") {
      console.log('🔌 Attempting socket connection to:', process.env.NEXT_PUBLIC_API_URL);
      
      const s = io(process.env.NEXT_PUBLIC_API_URL, {
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        maxReconnectionAttempts: 10,
        forceNew: true, // Force new connection
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
      })

      s.on('connect_error', (error) => {
        console.error('❌ Socket connection ERROR:', error.message);
        console.error('Connection details:', {
          url: process.env.NEXT_PUBLIC_API_URL,
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
          sessionStorage.setItem('currentBreakState', JSON.stringify(breakData))
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
            sessionStorage.setItem('currentBreakState', JSON.stringify(breakData))
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

  // Show message for authenticated users before redirect
  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Already Logged In</h2>
            <p className="text-slate-400 mb-4">The overlay page is for public viewing only. As an admin, you&apos;re being redirected to the auction management page.</p>
            <p className="text-violet-400 font-medium">Redirecting to auction management...</p>
          </div>
        </div>
      </div>
    )
  }

  // Pool draw takes HIGHEST PRIORITY — admin has explicitly activated it
  if (showPoolView) {
    return (
      <>
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
    
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url('${splashUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Subtle golden glow overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(255,200,0,0.15), transparent 60%)'
          }}
        />
        
        {/* Timer Box - Embedded into logo, positioned below badge */}
        <div 
          className="absolute text-center"
          style={{
            top: '70%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '14px 28px',
            background: 'rgba(30, 15, 0, 0.35)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 200, 0, 0.25)',
            borderRadius: '20px',
            boxShadow: '0 0 40px rgba(255, 180, 0, 0.5), inset 0 0 12px rgba(255, 200, 0, 0.25)',
            animation: 'breathe 2.5s ease-in-out infinite'
          }}
        >
          {/* Outer glow halo */}
          <div 
            className="absolute pointer-events-none"
            style={{
              inset: '-20px',
              background: 'radial-gradient(circle, rgba(255,200,0,0.25), transparent 70%)',
              zIndex: -1,
              filter: 'blur(20px)'
            }}
          />
          {/* Break Type */}
          <p 
            className="text-amber-300 text-xs font-black uppercase tracking-[0.3em] mb-1"
            style={{
              textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)'
            }}
          >
            {breakTypeLabel}
          </p>
          
          {/* Countdown Timer */}
          <div 
            className="font-mono font-black"
            style={{
              fontSize: '72px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: '#fff',
              textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(255,200,0,1), 0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {remainingMinutes.toString().padStart(2, '0')}:{displaySeconds.toString().padStart(2, '0')}
          </div>
          
          {/* We will be back */}
          <p 
            className="text-white text-xs font-black uppercase tracking-[0.2em] mt-1"
            style={{
              textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)'
            }}
          >
            {t.weWillBeBack}
          </p>
        </div>
        
        {/* Breathe animation */}
        <style jsx>{`
          @keyframes breathe {
            0% {
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.04);
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
      </div>
    )
  }

  if (!auction || !auction.player) {
    // Waiting state - same golden background, but now with a PREMIUM BROADCAST STANDBY message
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950"
      >
        <img 
          src={splashUrl || '/splash-screen.png'} 
          className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-1000 rotate-0 scale-100 group-hover:scale-105" 
          alt="Splash" 
        />
        
        {/* Cinematic Overlay to make it feel premium */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)'
          }}
        />

        {/* PREMIUM BROADCAST STANDBY BADGE - CENTERED (Responsive) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full px-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 md:gap-5 bg-black/40 backdrop-blur-3xl px-6 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] border border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-pulse">
            <div className="relative flex h-3 w-3 md:h-4 md:w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 md:h-4 md:w-4 bg-emerald-500"></span>
            </div>
            <span className="text-[12px] md:text-[24px] font-black uppercase tracking-[0.3em] md:tracking-[0.6em] text-white whitespace-nowrap leading-none">Waiting for Broadcast</span>
          </div>
        </div>

        {/* Subtle animated light sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-25deg] animate-[sweep_4s_infinite_ease-in-out]"></div>
        </div>

        <style jsx>{`
          @keyframes sweep {
            0% { left: -100%; }
            50% { left: 150%; }
            100% { left: 150%; }
          }
        `}</style>
      </div>
    )
  }

  const { player, currentBid, highestBidder, highestBidderLogo, tournamentName, teams, roundHistory } = auction

  // Use new premium overlay component
  return (
    <>
      <AuctionOverlayNew
        player={player}
        teams={teams}
        currentBid={currentBid}
        highestBidder={highestBidder}
        highestBidderLogo={highestBidderLogo}
        tournamentName={tournamentName}
        roundHistory={roundHistory}
        auctionResult={auctionResult}
      />
      
      {/* SOLD/UNSOLD ANIMATION - Exact same logic as admin auction */}
      {auctionResult && (
        <ResultOverlay
          type={auctionResult.type}
          playerName={auctionResult.playerName}
          price={auctionResult.price}
          teamName={auctionResult.teamName}
          teamLogo={auctionResult.teamLogo}
          teamColor={auctionResult.teamColor}
          teamShortName={auctionResult.teamShortName}
          playerImage={auctionResult.playerImage}
          onSkip={() => {
            setAuctionResult(null);
          }}
          isPointsSystem={auctionResult.isPointsSystem}
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
      {drawEvent && (
        <TeamDrawCinematic
          event={drawEvent}
          onComplete={() => setDrawEvent(null)}
        />
      )}
      
      {/* BREAK TIME */}
      {breakTime && (
        <div 
          className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
          style={{
            backgroundImage: `url('${splashUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Subtle golden glow overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 60%, rgba(255,200,0,0.15), transparent 60%)'
            }}
          />
          
          {/* Timer Box - Embedded into logo, positioned below badge */}
          <div 
            className="absolute text-center"
            style={{
              top: '70%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '14px 28px',
              background: 'rgba(30, 15, 0, 0.35)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 200, 0, 0.25)',
              borderRadius: '20px',
              boxShadow: '0 0 40px rgba(255, 180, 0, 0.5), inset 0 0 12px rgba(255, 200, 0, 0.25)',
              animation: 'breathe 2.5s ease-in-out infinite'
            }}
          >
            {/* Outer glow halo */}
            <div 
              className="absolute pointer-events-none"
              style={{
                inset: '-20px',
                background: 'radial-gradient(circle, rgba(255,200,0,0.25), transparent 70%)',
                zIndex: -1,
                filter: 'blur(20px)'
              }}
            />
            {/* Break Type */}
            <p 
              className="text-amber-300 text-xs font-black uppercase tracking-[0.3em] mb-1"
              style={{
                textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)'
              }}
            >
              {breakTypeLabel}
            </p>
            
            {/* Countdown Timer */}
            <div 
              className="font-mono font-black"
              style={{
                fontSize: '72px',
                fontWeight: 900,
                letterSpacing: '2px',
                color: '#fff',
                textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(255,200,0,1), 0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {remainingMinutes.toString().padStart(2, '0')}:{displaySeconds.toString().padStart(2, '0')}
            </div>
            
            {/* We will be back */}
            <p 
              className="text-white text-xs font-black uppercase tracking-[0.2em] mt-1"
              style={{
                textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)'
              }}
            >
              {t.weWillBeBack}
            </p>
          </div>
          
          {/* Breathe animation */}
          <style jsx>{`
            @keyframes breathe {
              0% {
                transform: translate(-50%, -50%) scale(1);
              }
              50% {
                transform: translate(-50%, -50%) scale(1.04);
              }
              100% {
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}</style>
        </div>
      )}
      
      {/* WAITING STATE */}
      {!auction || !auction.player && (
        <div 
          className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950"
        >
          <img 
            src={splashUrl || '/splash-screen.png'} 
            className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-1000 rotate-0 scale-100 group-hover:scale-105" 
            alt="Splash" 
          />
          
          {/* Cinematic Overlay to make it feel premium */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)'
            }}
          />

          {/* PREMIUM BROADCAST STANDBY BADGE - CENTERED (Responsive) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full px-4 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 md:gap-5 bg-black/40 backdrop-blur-3xl px-6 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] border border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-pulse">
              <div className="relative flex h-3 w-3 md:h-4 md:w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 md:h-4 md:w-4 bg-emerald-500"></span>
              </div>
              <span className="text-[12px] md:text-[24px] font-black uppercase tracking-[0.3em] md:tracking-[0.6em] text-white whitespace-nowrap leading-none">Waiting for Broadcast</span>
            </div>
          </div>

          {/* Subtle animated light sweep */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-25deg] animate-[sweep_4s_infinite_ease-in-out]"></div>
          </div>

          <style jsx>{`
            @keyframes sweep {
              0% { left: -100%; }
              50% { left: 150%; }
              100% { left: 150%; }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
