"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, ClipboardList, Crosshair, X, ChevronRight, TrendingUp, Award } from "lucide-react";

// Design tokens
const C = {
  bgMain:   '#071821',
  bgCard:   '#0c2432',
  bgNav:    '#081c26',
  accent:   '#00d4a3',
  accentSoft: 'rgba(0, 212, 163, 0.15)',
  accentBorder: 'rgba(0, 212, 163, 0.25)',
  textPrimary: '#ffffff',
  textSecondary: '#9fb3c8',
  border: 'rgba(255,255,255,0.08)',
};

export default function AuctionOverlayNew({ 
  player, 
  teams, 
  currentBid, 
  highestBidder, 
  highestBidderLogo, 
  tournamentName, 
  roundHistory,
  auctionResult
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [squadModal, setSquadModal] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState(null);
  const [lastShownPlayerId, setLastShownPlayerId] = useState(null);
  const [hasShownStatus, setHasShownStatus] = useState(false);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch team players when squad modal opens
  useEffect(() => {
    const teamId = squadModal?._id || squadModal?.id;
    if (!squadModal || !teamId) return;
    
    const fetchTeamPlayers = async () => {
      console.log('🔍 Starting fetch for team:', squadModal.name);
      setIsLoadingSquad(true);
      try {
        console.log('📦 Fetching squad for team:', squadModal.name, 'ID:', teamId);
        // Fetch complete team data with players
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${teamId}`);
        console.log('📡 Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Received squad data:', data);
          console.log('👥 Players count:', data.squad?.length || data.players?.length || 0);
          // Update squad modal with players (API returns 'squad' array)
          setSquadModal(prev => ({
            ...prev,
            players: data.squad || data.players || data.team?.players || []
          }));
        } else {
          console.error('❌ Failed to fetch squad:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch team players:', error);
      } finally {
        setIsLoadingSquad(false);
      }
    };
    
    // Only fetch if players array doesn't exist or is empty
    if (!squadModal.players || squadModal.players.length === 0) {
      fetchTeamPlayers();
    }
  }, [squadModal]);

  // Predefined year limits (MINIMUM required)
  const YEAR_LIMITS = {
    1: 2,
    2: 2,
    3: 2,
    4: 2
  };

  // Normalize year from various formats ("year1", "year2", "year3", "year4", "1st", "2nd", etc.)
  const normalizeYear = (player) => {
    // Check category field first (your DB uses this)
    const raw = player.category ?? player.yearCategory ?? player.year;

    if (!raw) return null;

    const str = String(raw).toLowerCase().trim();

    // Handle "year1", "year2", "year3", "year4" format (from your DB)
    if (str.includes("year1")) return 1;
    if (str.includes("year2")) return 2;
    if (str.includes("year3")) return 3;
    if (str.includes("year4")) return 4;

    // Handle generic formats: "1st", "2nd", "3rd", "4th", "1", "2", etc.
    if (str.includes("1")) return 1;
    if (str.includes("2")) return 2;
    if (str.includes("3")) return 3;
    if (str.includes("4")) return 4;

    return null;
  };

  // Calculate year distribution from players
  const calculateYearDistribution = (players) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    players.forEach(player => {
      const year = normalizeYear(player);
      if (year) {
        distribution[year]++;
      }
    });
    return distribution;
  };

  // Get year badge color
  const getYearBadgeColor = (year) => {
    switch(year) {
      case 1: return '#10b981'; // green
      case 2: return '#3b82f6'; // blue
      case 3: return '#f59e0b'; // amber
      case 4: return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  // Check if year limit exceeded
  const isLimitExceeded = (year, count) => {
    const limit = YEAR_LIMITS[year];
    return limit && count > limit;
  };

  const isMobile = windowWidth < 768;

  // Calculate player status
  const normalizedStatus = (player?.status || "").toString().trim().toLowerCase();
  const isSold = normalizedStatus === "sold";
  const isUnsold = normalizedStatus === "unsold";
  const bidAmount = Number(currentBid || 0);
  const baseAmount = Number(player?.basePrice || 0);
  const soldAmount = Number((player?.soldPrice ?? currentBid) || 0);
  const displayBid = isSold ? soldAmount : bidAmount > 0 ? bidAmount : baseAmount;

  // Trigger animation ONLY ONCE per player - reset on player change
  useEffect(() => {
    if (!player) return;

    const playerId = player._id || player.name;

    // Reset when player changes
    if (playerId !== lastShownPlayerId) {
      setLastShownPlayerId(playerId);
      setHasShownStatus(false);
    }

    // Trigger ONLY ONCE when auctionResult arrives
    if (auctionResult && !hasShownStatus) {
      setHasShownStatus(true);

      // Auto-hide after animation (3 seconds)
      const timer = setTimeout(() => {
        setHasShownStatus(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [player, auctionResult, lastShownPlayerId, hasShownStatus]);

  const highestBidderTeam = teams?.find(t => t._id === highestBidder || t.id === highestBidder);
  const highestBidderName = highestBidderTeam?.name || highestBidderTeam?.shortName || highestBidder;

  const handleBottomTab = (tab) => setActiveBottomTab(prev => prev === tab ? null : tab);

  // ─── Enhanced Squad Detail Modal (Using Admin-Generated Assets) ───────────────────────────────────────────
  const SquadModal = () => !squadModal ? null : (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={() => setSquadModal(null)}
    >
      <div
        className="relative w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
        style={{ 
          background: C.bgCard, 
          border: `2px solid ${C.accentBorder}`, 
          maxHeight: '90vh',
          animation: 'modalSlideUp 0.3s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button - REMOVED (now integrated in header actions) */}

        {/* Header Section */}
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg">
                {squadModal.logoUrl
                  ? <img src={squadModal.logoUrl} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><Users size={24} color={C.textSecondary} /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black truncate" style={{ color: C.textPrimary }}>{squadModal.name || squadModal.shortName}</h2>
                <p className="text-sm mt-0.5" style={{ color: C.accent }}>Budget: {(squadModal.remainingBudget ?? squadModal.budget ?? 10000).toLocaleString()} PTS</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{squadModal.players?.length || 0} Players</p>
              </div>
            </div>
            
            {/* Action Buttons - Close Only */}
            <div className="flex items-center gap-2">
              {/* Close Button */}
              <button 
                onClick={() => setSquadModal(null)}
                className="p-2 rounded-lg transition-all hover:bg-black/60"
                style={{ background: 'rgba(0,0,0,0.4)', color: C.textSecondary }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Squad Image (Admin-Generated) */}
          {squadModal.squadImageUrl && (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: '3/4', maxWidth: '400px', margin: '0 auto' }}>
                <img 
                  src={squadModal.squadImageUrl} 
                  alt={`${squadModal.name} Squad`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Fallback: Show Team's Sold Players if no squad image */}
          {!squadModal.squadImageUrl && (
            <div>
              {/* Action Bar with Year Distribution and PDF Buttons */}
              {squadModal.players && squadModal.players.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: C.textSecondary }}>Year Distribution</h3>
                    <div className="flex items-center gap-2">
                      {/* View PDF Button */}
                      {(squadModal.squadPdfUrl || squadModal.pdfUrl) && (
                        <button
                          onClick={() => window.open(squadModal.squadPdfUrl || squadModal.pdfUrl, '_blank')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                          style={{ 
                            background: C.accentSoft, 
                            border: `1px solid ${C.accentBorder}`,
                            color: C.accent
                          }}
                          title="View Squad PDF"
                        >
                          👁 View
                        </button>
                      )}
                      {/* Download PDF Button */}
                      {(squadModal.squadPdfUrl || squadModal.pdfUrl) && (
                        <a
                          href={squadModal.squadPdfUrl || squadModal.pdfUrl}
                          download
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                          style={{ 
                            background: C.accentSoft, 
                            border: `1px solid ${C.accentBorder}`,
                            color: C.accent
                          }}
                          title="Download Squad PDF"
                        >
                          ⬇ Download
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((year) => {
                      const count = squadModal.players.filter(p => normalizeYear(p) === year).length;
                      const limit = YEAR_LIMITS[year];
                      const exceeded = count < limit; // Highlight when BELOW minimum
                      
                      return (
                        <div
                          key={year}
                          className="rounded-xl p-3 text-center relative overflow-hidden transition-all"
                          style={{ 
                            background: C.bgMain, 
                            border: `1px solid ${exceeded ? '#ef4444' : C.border}`,
                            boxShadow: exceeded ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 4px 6px rgba(0,0,0,0.3)',
                            borderColor: exceeded ? '#ef4444' : undefined
                          }}
                        >
                          <p className="text-[10px] font-medium mb-1" style={{ color: getYearBadgeColor(year) }}>
                            {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                          </p>
                          <p 
                            className="text-2xl font-black"
                            style={{ 
                              color: exceeded ? '#ef4444' : C.accent,
                              textShadow: exceeded ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
                            }}
                          >
                            {count} <span style={{ fontSize: '12px', opacity: 0.6 }}>/{limit}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-black uppercase tracking-widest mb-4 text-center" style={{ color: C.textSecondary }}>
                Squad Players ({squadModal.players?.length || 0})
              </h3>
              
              {isLoadingSquad ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.accent, borderTopColor: 'transparent' }}></div>
                  <p className="text-sm mt-4" style={{ color: C.textSecondary }}>Loading squad...</p>
                </div>
              ) : squadModal.players && squadModal.players.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {squadModal.players.map((player, idx) => {
                    const playerPrice = player.soldPrice || player.basePrice || 0;
                    // Use normalized year (no fallback - will be null if unknown)
                    const yearCategory = normalizeYear(player);
                    
                    // Check for icon role badges
                    const isCaptain = player.iconRole === 'captain';
                    const isViceCaptain = player.iconRole === 'viceCaptain';
                    const isRetained = player.iconRole === 'retained';
                    const hasRoleBadge = isCaptain || isViceCaptain || isRetained;
                    
                    // Determine role badge display
                    let roleBadgeText = '';
                    let roleBadgeColor = '';
                    if (isCaptain) {
                      roleBadgeText = 'C';
                      roleBadgeColor = '#f59e0b'; // Amber for Captain
                    } else if (isViceCaptain) {
                      roleBadgeText = 'VC';
                      roleBadgeColor = '#3b82f6'; // Blue for Vice Captain
                    } else if (isRetained) {
                      roleBadgeText = 'R';
                      roleBadgeColor = '#10b981'; // Emerald for Retained
                    }
                    
                    return (
                      <div
                        key={player._id || player.id || idx}
                        className="rounded-xl p-3 text-center relative overflow-hidden group transition-all hover:scale-[1.02]"
                        style={{ 
                          background: C.bgMain, 
                          border: `1px solid ${C.border}`,
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                      >
                        {/* Role Badge (C/VC/R) - Priority over Year Badge */}
                        {hasRoleBadge && (
                          <div 
                            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black z-20 shadow-lg"
                            style={{ 
                              background: roleBadgeColor,
                              color: '#fff',
                              boxShadow: `0 0 10px ${roleBadgeColor}80`,
                              minWidth: '24px',
                              textAlign: 'center'
                            }}
                          >
                            {roleBadgeText}
                          </div>
                        )}
                        
                        {/* Year Badge - Show on right side if role badge exists */}
                        {yearCategory && (
                          <div 
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black z-10"
                            style={{ 
                              background: getYearBadgeColor(yearCategory),
                              color: '#000',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              ...(hasRoleBadge ? { right: '2px', fontSize: '8px' } : { left: '2px' })
                            }}
                          >
                            {yearCategory}{yearCategory === 1 ? 'st' : yearCategory === 2 ? 'nd' : yearCategory === 3 ? 'rd' : 'th'}
                          </div>
                        )}
                        
                        {/* Player Image */}
                        <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 border-2 mt-4" style={{ borderColor: C.accent }}>
                          <img 
                            src={player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`} 
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Player Name */}
                        <p className="text-xs font-bold truncate mb-1" style={{ color: C.textPrimary }}>{player.name}</p>
                        
                        {/* Player Role */}
                        <p className="text-[10px] font-medium mb-1" style={{ color: C.textSecondary }}>{player.role}</p>
                        
                        {/* Player Price */}
                        <p className="text-sm font-black" style={{ color: C.accent }}>
                          {playerPrice} PTS
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: C.textSecondary }}>No players in squad yet</p>
                </div>
              )}
            </div>
          )}

          {/* Fallback: Show players list if no image */}
          {!squadModal.squadImageUrl && (!squadModal.players || squadModal.players.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: C.textSecondary }}>No squad data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes modalSlideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  // ─── Team card (shared between sidebar + bottom sheet) ────────────────────
  const TeamCard = ({ team, index, onClick }) => {
    const isBidding = team._id === highestBidder || team.id === highestBidder;
    const teamName = team.name || team.shortName || ('Team ' + (index + 1));
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
        style={{
          background: isBidding ? C.accentSoft : C.bgMain,
          border: `1px solid ${isBidding ? C.accentBorder : C.border}`
        }}
        onClick={onClick}
      >
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#0f2a3a' }}>
          {team.logoUrl
            ? <img src={team.logoUrl} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center"><Users size={14} color={C.textSecondary} /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: C.textPrimary }}>{teamName}</p>
          <p className="text-xs font-bold" style={{ color: C.accent }}>{(team.remainingBudget ?? team.budget ?? 10000).toLocaleString()} PTS</p>
        </div>
        <ChevronRight size={14} color={C.textSecondary} />
      </div>
    );
  };

  // ─── Bottom Sheet Backdrop ────────────────────────────────────────────────
  const BottomSheetBackdrop = () => (
    <div
      className="fixed inset-0 z-30"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => setActiveBottomTab(null)}
    />
  );

  return (
    <div className="h-screen w-screen text-white overflow-hidden relative flex flex-col" style={{ background: C.bgMain, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,163,0.06) 0%, transparent 60%)' }} />

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 md:px-6"
        style={{ height: '56px', background: C.bgNav, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#ef4444' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#ef4444' }}></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ef4444' }}>Live</span>
        </div>

        <h1 className="text-sm md:text-lg font-semibold truncate px-3" style={{ color: C.textPrimary }}>
          {tournamentName || 'Parmeshwar Cup 2026'}
        </h1>

        {/* Hide focus button on mobile — it's in bottom nav */}
        {!isMobile && (
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: focusMode ? C.accentSoft : 'rgba(255,255,255,0.05)',
              border: `1px solid ${focusMode ? C.accentBorder : C.border}`,
              color: focusMode ? C.accent : C.textSecondary
            }}
          >
            <Crosshair size={13} />
            {focusMode ? 'Exit Focus' : 'Focus Mode'}
          </button>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: '60px' }}>
          {!focusMode ? (
            <>
              <div className="flex-1 overflow-y-auto p-4">

            {/* Player Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        
              {/* Image */}
              <div className="relative w-full" style={{ height: '52vw', maxHeight: '300px' }}>
                <Image
                  src={player?.image || player?.imageUrl || '/players/default.png'}
                  alt={player?.name || 'Player'}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="eager"
                  priority
                />
                {/* Show badge ONLY when hasShownStatus is true (one-time trigger) */}
                {hasShownStatus && (isSold || isUnsold) && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div
                      className="px-5 py-2 rounded-xl text-xl font-bold uppercase tracking-widest rotate-[-10deg]"
                      style={{
                        background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)',
                        border: `2px solid ${isSold ? C.accent : '#ef4444'}`,
                        color: isSold ? C.accent : '#ef4444'
                      }}
                    >{isSold ? 'Sold' : 'Unsold'}</div>
                  </div>
                )}
              </div>
        
              {/* Card body */}
              <div className="p-4">
                <p className="text-xl font-semibold" style={{ color: C.textPrimary }}>{player?.name}</p>
                <p className="text-sm mt-0.5 mb-4" style={{ color: C.textSecondary }}>{player?.role}</p>
        
                {/* Bid box */}
                <div className="rounded-xl p-4 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                  <p className="text-xs font-medium mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                  <p className="text-3xl font-bold" style={{ color: C.accent }}>{displayBid.toLocaleString()} PTS</p>
                </div>
        
                {/* Leading team */}
                {highestBidder && (
                  <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: C.bgMain, border: `1px solid ${C.border}` }}>
                    {highestBidderLogo && <img src={highestBidderLogo} className="w-8 h-8 rounded-full object-cover" alt="" />}
                    <div>
                      <p className="text-xs" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p>
                      <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
            </>
          ) : (
            /* Focus Mode - Simplified View */
          <div className="flex-1 overflow-y-auto p-4">
            {/* Player Card - Focus Mode */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              {/* Image */}
              <div className="relative w-full" style={{ height: '60vw', maxHeight: '400px' }}>
                <Image
                  src={player?.image || player?.imageUrl || '/players/default.png'}
                  alt={player?.name || 'Player'}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="eager"
                  priority
                />
                {/* Show badge ONLY when hasShownStatus is true (one-time trigger) */}
                {hasShownStatus && (isSold || isUnsold) && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div
                      className="px-6 py-3 rounded-xl text-2xl font-bold uppercase tracking-widest rotate-[-10deg]"
                      style={{
                        background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)',
                        border: `2px solid ${isSold ? C.accent : '#ef4444'}`,
                        color: isSold ? C.accent : '#ef4444'
                      }}
                    >{isSold ? 'Sold' : 'Unsold'}</div>
                  </div>
                )}
              </div>
        
              {/* Card body */}
              <div className="p-4">
                <p className="text-2xl font-semibold" style={{ color: C.textPrimary }}>{player?.name}</p>
                <p className="text-sm mt-0.5 mb-4" style={{ color: C.textSecondary }}>{player?.role}</p>
        
                {/* Bid box */}
                <div className="rounded-xl p-4 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                  <p className="text-xs font-medium mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                  <p className="text-4xl font-bold" style={{ color: C.accent }}>{displayBid.toLocaleString()} PTS</p>
                </div>
        
                {/* Leading team */}
                {highestBidder && (
                  <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: C.bgMain, border: `1px solid ${C.border}` }}>
                    {highestBidderLogo && <img src={highestBidderLogo} className="w-10 h-10 rounded-full object-cover" alt="" />}
                    <div>
                      <p className="text-xs" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p>
                      <p className="text-base font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* ── Squads Bottom Sheet ───────────────────────────────────── */}
          {!focusMode && activeBottomTab === 'squads' && (
            <>
              <BottomSheetBackdrop />
              <div
                className="fixed left-0 right-0 z-40 flex flex-col"
                style={{ bottom: '60px', height: '70vh', background: C.bgCard, borderRadius: '20px 20px 0 0', borderTop: `1px solid ${C.accentBorder}` }}
              >
                <div className="flex justify-center pt-3"><div className="w-8 h-1 rounded-full" style={{ background: C.border }}></div></div>
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>Squads</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {teams?.map((team, i) => (
                    <TeamCard key={team._id || i} team={team} index={i} onClick={() => { setSquadModal(team); setActiveBottomTab(null); }} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── History Bottom Sheet ──────────────────────────────────── */}
          {!focusMode && activeBottomTab === 'history' && (
            <>
              <BottomSheetBackdrop />
              <div
                className="fixed left-0 right-0 z-40 flex flex-col"
                style={{ bottom: '60px', height: '60vh', background: C.bgCard, borderRadius: '20px 20px 0 0', borderTop: `1px solid ${C.accentBorder}` }}
              >
                <div className="flex justify-center pt-3"><div className="w-8 h-1 rounded-full" style={{ background: C.border }}></div></div>
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>Bid History</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(!roundHistory || roundHistory.length === 0)
                    ? <p className="text-center py-10 text-sm" style={{ color: C.textSecondary }}>No bids yet</p>
                    : roundHistory.slice(0, 12).map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: i === 0 ? C.accentSoft : C.bgMain, border: `1px solid ${i === 0 ? C.accentBorder : C.border}` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: C.textSecondary }}>#{roundHistory.length - i}</span>
                          <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{h.team}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: C.accent }}>{h.bid.toLocaleString()} PTS</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          )}

          {/* ── Bottom Navigation ─────────────────────────────────────── */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
            style={{ height: '60px', background: C.bgNav, borderTop: `1px solid ${C.border}` }}
          >
            {[
              { id: 'squads', label: 'Squads', icon: <Users size={18} /> },
              { id: 'history', label: 'History', icon: <ClipboardList size={18} /> },
              { id: 'focus', label: focusMode ? 'Exit' : 'Focus', icon: <Crosshair size={18} /> },
            ].map(item => {
              const isActive = item.id === 'focus' ? focusMode : activeBottomTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'focus' ? setFocusMode(f => !f) : handleBottomTab(item.id)}
                  className="flex flex-col items-center gap-1 flex-1 py-2 relative"
                  style={{ color: isActive ? C.accent : C.textSecondary }}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: C.accent }} />
                  )}
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      ) : (
      /* ══════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════ */
        <div
          className="relative z-10 grid flex-1 overflow-hidden"
          style={{
            gridTemplateColumns: focusMode ? '1fr' : windowWidth < 1024 ? '200px 1fr 220px' : '260px 1fr 280px',
            gap: '16px',
            padding: '16px',
            height: 'calc(100vh - 56px)'
          }}
        >
          {/* Left — Squads */}
          {!focusMode && (
            <aside className="flex flex-col overflow-hidden rounded-2xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                <Users size={14} color={C.textSecondary} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Squads</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {teams?.map((team, i) => (
                  <TeamCard key={team._id || i} team={team} index={i} onClick={() => setSquadModal(team)} />
                ))}
              </div>
            </aside>
          )}

          {/* Center — Player */}
          <main className="flex items-center justify-center">
            {focusMode ? (
              <div className="flex w-full max-w-5xl gap-10 items-center px-6">
                {/* Image */}
                <div className="flex-1 relative overflow-hidden rounded-2xl" style={{ height: '70vh', border: `1px solid ${C.border}` }}>
                  <Image
                    src={player?.image || player?.imageUrl || '/players/default.png'}
                    alt={player?.name || 'Player'}
                    fill
                    className="object-cover"
                    unoptimized
                    loading="eager"
                    priority
                  />
                  {/* Show badge ONLY when hasShownStatus is true (one-time trigger) */}
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="px-8 py-3 rounded-xl text-4xl font-bold uppercase tracking-widest rotate-[-10deg]"
                        style={{ background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)', border: `2px solid ${isSold ? C.accent : '#ef4444'}`, color: isSold ? C.accent : '#ef4444' }}
                      >{isSold ? 'Sold' : 'Unsold'}</div>
                    </div>
                  )}
                </div>
                {/* Bid info */}
                <div className="w-72 flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-semibold" style={{ color: C.textPrimary }}>{player?.name}</p>
                    <p className="text-sm mt-1" style={{ color: C.textSecondary }}>{player?.role}</p>
                  </div>
                  <div className="rounded-2xl p-6 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                    <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                    <p className="text-5xl font-bold" style={{ color: C.accent }}>{displayBid.toLocaleString()} PTS</p>
                  </div>
                  {highestBidder && (
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                      {highestBidderLogo && <img src={highestBidderLogo} className="w-10 h-10 rounded-full object-cover" alt="" />}
                      <div>
                        <p className="text-xs" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p>
                        <p className="text-base font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-[380px] flex flex-col gap-0">
                {/* Player image */}
                <div className="relative overflow-hidden rounded-t-2xl" style={{ height: '420px', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
                  <Image
                    src={player?.image || player?.imageUrl || '/players/default.png'}
                    alt={player?.name || 'Player'}
                    fill
                    className="object-cover"
                    unoptimized
                    loading="eager"
                    priority
                  />
                  {/* Show badge ONLY when hasShownStatus is true (one-time trigger) */}
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="px-6 py-2 rounded-xl text-3xl font-bold uppercase tracking-widest rotate-[-10deg]"
                        style={{ background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)', border: `2px solid ${isSold ? C.accent : '#ef4444'}`, color: isSold ? C.accent : '#ef4444' }}
                      >{isSold ? 'Sold' : 'Unsold'}</div>
                    </div>
                  )}
                </div>
                {/* Name + role */}
                <div className="px-5 py-4 rounded-b-2xl" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: 'none' }}>
                  <p className="text-xl font-semibold" style={{ color: C.textPrimary }}>{player?.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>{player?.role}</p>
                </div>
              </div>
            )}
          </main>

          {/* Right — Bid panel */}
          {!focusMode && (
            <aside className="flex flex-col gap-3 overflow-hidden">
              {/* Bid box */}
              <div className="rounded-2xl p-5 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                <p className="text-5xl font-bold" style={{ color: C.accent }}>{displayBid.toLocaleString()} PTS</p>
              </div>

              {/* Leading */}
              {highestBidder && (
                <div className="rounded-2xl p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={13} color={C.textSecondary} />
                    <p className="text-xs font-medium" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {highestBidderLogo && <img src={highestBidderLogo} className="w-9 h-9 rounded-full object-cover" alt="" />}
                    <p className="text-base font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p>
                  </div>
                </div>
              )}

              {/* Bid history */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <ClipboardList size={13} color={C.textSecondary} />
                  <p className="text-xs font-medium" style={{ color: C.textSecondary }}>Bid History</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {roundHistory?.slice(0, 10).map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: i === 0 ? C.accentSoft : C.bgMain, border: `1px solid ${i === 0 ? C.accentBorder : C.border}` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: C.textSecondary }}>#{roundHistory.length - i}</span>
                        <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{h.team}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: C.accent }}>{h.bid.toLocaleString()} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Squad detail modal */}
      <SquadModal />
    </div>
  );
}
