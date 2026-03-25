import React, { useEffect, useState } from 'react';

const ResultOverlay = ({ type, playerName, price, teamName, teamLogo, teamColor, teamShortName, playerImage, onSkip, currency, isPointsSystem = true }) => {
  const [showHammer, setShowHammer] = useState(false);
  const [isImpact, setIsImpact] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showTeamName, setShowTeamName] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(0);
  const [pricePulse, setPricePulse] = useState(false);
  const [priceProgress, setPriceProgress] = useState(0);
  
  // Device detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add keyboard skip + universal tap/click support
  useEffect(() => {
    if (!onSkip) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        onSkip();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  // Universal skip handler
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const isSold = type === 'SOLD';

  useEffect(() => {
    if (isSold) {
      const s1 = setTimeout(() => {
        setShowHammer(true);
      }, 300);
      const s2 = setTimeout(() => {
        setIsImpact(true);
      }, 700);
      const s3 = setTimeout(() => {
        setShowLogo(true);
      }, 750);
      const s4 = setTimeout(() => {
        setShowTeamName(true);
      }, 950);
      const s5 = setTimeout(() => {
        setShowHammer(false);
      }, 2000);

      return () => { 
        clearTimeout(s1); 
        clearTimeout(s2); 
        clearTimeout(s3); 
        clearTimeout(s4); 
        clearTimeout(s5); 
      };
    }
  }, [isSold]);

  // Price count-up animation
  useEffect(() => {
    if (!price || type !== 'SOLD') {
      setDisplayPrice(price || 0);
      setPriceProgress(1);
      return;
    }

    const duration = 1000; // 1 second build up
    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3); // cubic ease out
      const currentValue = Math.floor(easeOut * price);
      
      setDisplayPrice(currentValue);
      setPriceProgress(easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setPricePulse(true);
        setTimeout(() => setPricePulse(false), 200); // Quick completion pulse
      }
    };

    setDisplayPrice(0);
    setPriceProgress(0);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [price, type]);

  return (
    <div 
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 overflow-hidden ${isImpact ? 'animate-shake' : ''}`}
      onClick={handleSkip}
    >
      
      {/* Screen flash on impact */}
      <div 
        className="absolute inset-0 bg-white/80 z-[1002] pointer-events-none mix-blend-overlay"
        style={{
          opacity: isImpact ? 0.3 : 0,
          transition: isImpact ? 'none' : 'opacity 0.8s ease-out',
        }}
      />

      {/* Background Player Image (Dimmed) */}
      {playerImage && (
        <div 
          className={`absolute inset-0 opacity-20 scale-110 transition-transform duration-[3000ms] ease-out ${!isSold ? 'grayscale' : ''}`}
          style={{
            backgroundImage: `url(${playerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            animation: 'zoomIn 3s ease-out forwards'
          }}
        />
      )}

      {/* Content Container */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center text-center px-4"
        style={{ animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
      >
        <p className="text-xl md:text-3xl font-black uppercase tracking-[0.5em] text-white/70 mb-4 drop-shadow-lg">
          {playerName}
        </p>
        
        {isSold ? (
          <>
            <div className="relative group">
              <h1 className={`text-7xl md:text-9xl font-black italic uppercase text-white tracking-tighter mb-2 transition-transform duration-150 ${isImpact ? 'scale-110' : 'scale-100'}`}
                  style={{
                    textShadow: '0 0 20px #10b981, 0 0 40px #059669, 0 0 80px #047857',
                    WebkitTextStroke: '2px #34d399'
                  }}>
                SOLD
              </h1>
              {/* Light sweep effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 mix-blend-overlay w-[200%] -translate-x-[100%]"
                   style={{
                     animation: 'sweep 1.5s ease-in-out infinite'
                   }} />
            </div>
            
            <div className={`mt-6 transition-transform duration-200 ${pricePulse ? 'scale-110' : 'scale-100'}`}>
              <p 
                className="text-5xl md:text-7xl font-black text-[#34d399] tracking-tighter"
                style={{
                  filter: `drop-shadow(0 0 ${15 * priceProgress}px rgba(16,185,129,${0.8 * priceProgress}))`
                }}
              >
                {isPointsSystem ? `${displayPrice} PTS` : `${currency}${displayPrice.toLocaleString()}`}
              </p>
            </div>
            
            <div className="relative flex flex-col items-center justify-start mt-6 min-h-[160px] w-full z-10">
              {/* Exact Landing Zone Mapping */}
              <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">

                {/* Impact Circle Flash precisely inside the landing zone */}
                {isImpact && (
                  <div 
                    className="absolute pointer-events-none rounded-full bg-white/90 z-0 blur-lg"
                    style={{
                      width: '150px',
                      height: '150px',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      animation: 'impactFlash 0.3s ease-out forwards',
                    }}
                  />
                )}

                {/* Cinematic SVG Hammer directly targeting parent wrapper */}
                {showHammer && (
                  <div 
                    className="absolute z-[9999] pointer-events-none"
                    style={{
                      top: '50%', 
                      left: '50%',
                      transform: isImpact 
                        ? 'translate(-50px, -50px) rotate(-20deg) scale(1.2)'  // Perfectly centered on logo, slightly larger
                        : 'translate(200px, -300px) rotate(45deg) scale(1.2)',  // Arrives from top right, larger
                      transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      opacity: 1,
                      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.8))' // Add shadow for visibility
                    }}
                  >
                    <svg width="180" height="180" viewBox="0 0 100 100" className="drop-shadow-2xl">
                      {/* Handle */}
                      <rect x="44" y="25" width="12" height="65" rx="4" fill="url(#woodGrad)" />
                      <rect x="42" y="80" width="16" height="10" rx="3" fill="#3e2723" />
                      
                      {/* Head */}
                      <path d="M20 20 L80 20 A6 6 0 0 1 86 26 L86 34 A6 6 0 0 1 80 40 L20 40 A6 6 0 0 1 14 34 L14 26 A6 6 0 0 1 20 20 Z" fill="url(#metalGrad)" />
                      {/* Ridges */}
                      <rect x="16" y="20" width="8" height="20" fill="#cbd5e1" opacity="0.4"/>
                      <rect x="76" y="20" width="8" height="20" fill="#64748b" opacity="0.4"/>

                      <defs>
                        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f8fafc" />
                          <stop offset="50%" stopColor="#94a3b8" />
                          <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                        <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b4513" />
                          <stop offset="50%" stopColor="#d2691e" />
                          <stop offset="100%" stopColor="#5c4033" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}

                {/* The Logo Appears Exactly Here */}
                {teamLogo && (
                  <div 
                    style={{
                      opacity: showLogo ? 1 : 0,
                      transform: showLogo ? 'scale(1)' : 'scale(0.5)',
                      transition: 'all 0.4s ease-out',
                    }}
                    className="absolute inset-0 group"
                  >
                    <div className={`absolute inset-0 rounded-full bg-[#10b981] opacity-40 blur-xl transition-opacity duration-300 ${showLogo ? 'opacity-40' : 'opacity-0'}`}></div>
                    <img src={teamLogo} alt={teamName} className="relative w-full h-full rounded-full object-cover border-4 border-[#34d399] shadow-[0_0_20px_rgba(16,185,129,0.8)] z-10" />
                  </div>
                )}
              </div>
              
              <div 
                style={{
                  opacity: showTeamName ? 1 : 0,
                  transform: showTeamName ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'all 0.3s ease-out',
                }}
                className="mt-3"
              >
                <p className="text-2xl md:text-4xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  TO <span className="text-[#6ee7b7]">{teamName}</span>
                </p>
              </div>

              {/* TEAM SHORT NAME BADGE */}
              {teamShortName && (
                <div 
                  className="absolute -top-2 -right-2 bg-[#ff6b35] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-20"
                  style={{ backgroundColor: teamColor || '#ff6b35' }}
                >
                  {teamShortName}
                </div>
              )}
            </div>
            
            {/* Confetti / Particle placeholders */}
            <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
               {/* Extremely simple CSS particles just using glow positioning could go here, but omitted to stay lightweight */}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-7xl md:text-9xl font-black italic uppercase text-white tracking-widest mb-4"
                style={{
                  textShadow: '0 0 30px #dc2626, 0 0 60px #991b1b, 0 0 90px #7f1d1d',
                  animation: 'pulseGlowRed 2s infinite alternate'
                }}>
              UNSOLD
            </h1>
            <p className="text-2xl md:text-4xl font-black text-red-500 mt-2 uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
              Will reappear in next round
            </p>
          </>
        )}
      </div>

      {/* Skip instruction */}
      {onSkip && (
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase animate-pulse cursor-pointer hover:text-white/70 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
        >
          {isMobile ? 'Tap to skip' : 'Press Enter or Tap to skip'}
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        @keyframes pulseGlowRed {
          from { text-shadow: 0 0 20px #dc2626, 0 0 40px #991b1b; transform: scale(1); }
          to { text-shadow: 0 0 40px #ef4444, 0 0 80px #dc2626; transform: scale(0.98); }
        }
        @keyframes sweep {
          0% { transform: translateX(-100%) skew(-20deg); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { transform: translateX(100%) skew(-20deg); opacity: 0; }
        }
        @keyframes impactFlash {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-shake {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(2px, 2px); }
          50% { transform: translate(-2px, -2px); }
          75% { transform: translate(2px, -2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
};

export default ResultOverlay;
