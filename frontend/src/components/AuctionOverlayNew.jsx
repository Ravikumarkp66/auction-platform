"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, ClipboardList, Crosshair, X, ChevronRight, TrendingUp, Award } from "lucide-react";
import { API_URL } from "../lib/apiConfig";

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

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

export default function AuctionOverlayNew({ 
  player, 
  nextPlayer,
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
  const [showNextPill, setShowNextPill] = useState(false);

  // Auto-pop Up Next Pill when nextPlayer changes
  useEffect(() => {
    if (nextPlayer?.name) {
      setShowNextPill(true);
      const timer = setTimeout(() => setShowNextPill(false), 7000); // Show for 7 seconds
      return () => clearTimeout(timer);
    }
  }, [nextPlayer?.name]);

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
        const response = await fetch(`${API_URL}/api/teams/${teamId}`);
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

  // Year-based logic removed to restore legacy system

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
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes entryPop {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bidGlow {
          0% { box-shadow: 0 0 0px rgba(0, 212, 163, 0); transform: scale(1); }
          50% { box-shadow: 0 0 30px rgba(0, 212, 163, 0.4); transform: scale(1.05); }
          100% { box-shadow: 0 0 0px rgba(0, 212, 163, 0); transform: scale(1); }
        }
        .broadcast-card {
          animation: entryPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .bid-accent-glow {
          animation: bidGlow 0.4s ease-out;
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
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="broadcast-card w-[480px] p-10 rounded-[40px] flex flex-col items-center text-center relative" 
                  style={{ 
                    background: 'rgba(10, 18, 30, 0.75)',
                    backdropFilter: 'blur(32px)',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 50px rgba(0, 212, 163, 0.25)',
                    border: `1px solid rgba(255,255,255,0.15)`
                  }}
                >
                  {/* 🔴 LIVE Badge */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-1.5 rounded-full animate-pulse z-10">
                    <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                    <p className="text-red-500 text-[10px] font-black tracking-[0.3em] uppercase">LIVE AUCTION</p>
                  </div>

                  {/* 🖼️ Player Image */}
                  <div className="mt-8 mb-8 relative w-[180px] h-[180px] rounded-[32px] overflow-hidden border-2 border-accent/50 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                    <Image
                      src={player?.image || player?.imageUrl || '/players/default.png'}
                      alt={player?.name || 'Player'}
                      fill
                      className="object-cover"
                      unoptimized
                      loading="eager"
                      priority
                    />
                    {hasShownStatus && (isSold || isUnsold) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="px-5 py-2.5 rounded-xl text-2xl font-black uppercase tracking-widest rotate-[-12deg] border-2"
                          style={{ borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}
                        >
                          {isSold ? 'Sold' : 'Unsold'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 🔥 Name */}
                  <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-3 leading-none" style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
                    {player?.name}
                  </h1>

                  {/* 🏷️ Role + Base Price */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
                      {player?.role}
                    </span>
                    <span className="text-amber-400 font-black text-lg tracking-widest">
                      {formatCurrency ? formatCurrency(player?.basePrice) : `₹${player?.basePrice}`}
                    </span>
                  </div>

                  {/* 📍 Meta Info */}
                  <div className="flex items-center gap-6 text-sm font-medium text-slate-400 mb-3">
                    <span className="italic">{player?.village}</span>
                    <span className="opacity-30">•</span>
                    <span>{player?.age} YRS</span>
                  </div>

                  {/* 🏏 Playing Style */}
                  <div className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mb-10 px-6 py-1.5 border-t border-white/5">
                    {player?.battingStyle} {player?.bowlingStyle ? `| ${player.bowlingStyle}` : ''}
                  </div>

                  {/* 💰 Current Bid Section */}
                  <div className={`w-full p-8 rounded-[32px] flex flex-col items-center transition-all ${bidAmount > 0 ? 'bid-accent-glow' : ''}`}
                    style={{ 
                      background: 'radial-gradient(circle at center, #132f3e, #0c2432)',
                      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
                      border: `1px solid ${C.accentBorder}`
                    }}
                  >
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-3">
                      {isSold ? 'Sold At' : 'Current Bid'}
                    </p>
                    <div className="relative">
                    <h2 className="text-7xl font-black text-white tabular-nums tracking-tighter" 
                      style={{ textShadow: `0 0 40px ${C.accent}50` }}>
                      {formatCurrency(displayBid)}
                    </h2>
                      {bidAmount > 0 && <div className="absolute -inset-6 bg-accent/20 blur-[60px] rounded-full -z-10 animate-pulse"></div>}
                    </div>

                    {highestBidder && (
                      <div className="mt-6 flex items-center gap-3 px-4 py-2 bg-accent/10 rounded-2xl border border-accent/20 shadow-lg">
                        {highestBidderLogo && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                            <img src={highestBidderLogo} className="w-full h-full object-cover" alt="" />
                          </div>
                        )}
                        <span className="text-xs font-black text-white uppercase tracking-tight">
                          {isSold ? 'Purchased by' : 'Leading:'} {highestBidderName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ⏭️ Next Player Ticker (Focus Mode) */}
                <div className={`absolute -bottom-8 left-0 right-0 mx-6 bg-[#0a0a1a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1),0_0_40px_rgba(245,158,11,0.2)] flex items-stretch h-20 z-[30] overflow-hidden transition-all duration-1000 ease-in-out ${showNextPill && nextPlayer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                  {nextPlayer && (
                    <>
                      <div className="flex-[1.5] flex flex-col justify-center px-8 border-r border-white/5 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] mb-1">UP NEXT</p>
                        <p className="text-2xl font-black text-white uppercase italic tracking-tight truncate">{nextPlayer.name}</p>
                      </div>
                      <div className="flex-1 bg-amber-500/10 flex flex-col justify-center px-8 border-l border-white/5 relative bg-gradient-to-br from-amber-500/5 to-transparent">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CANDIDATE ROLE</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-amber-500 uppercase">{nextPlayer.role}</p>
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]"></span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="broadcast-card w-[420px] p-8 rounded-[32px] flex flex-col items-center text-center relative" 
                style={{ 
                  background: 'rgba(10, 18, 30, 0.7)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0, 212, 163, 0.2)',
                  border: `1px solid rgba(255,255,255,0.12)`
                }}
              >
                {/* 🔴 LIVE Badge */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full animate-pulse z-10">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  <p className="text-red-500 text-[9px] font-black tracking-[0.2em] uppercase">LIVE AUCTION</p>
                </div>

                {/* 🖼️ Player Image */}
                <div className="mt-6 mb-6 relative w-[140px] h-[140px] rounded-2xl overflow-hidden border-2 border-accent/40 shadow-2xl">
                  <Image
                    src={player?.image || player?.imageUrl || '/players/default.png'}
                    alt={player?.name || 'Player'}
                    fill
                    className="object-cover"
                    unoptimized
                    loading="eager"
                    priority
                  />
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="px-4 py-2 rounded-lg text-lg font-black uppercase tracking-widest rotate-[-12deg] border-2"
                        style={{ borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}
                      >
                        {isSold ? 'Sold' : 'Unsold'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🔥 Name */}
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tight mb-2" style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>
                  {player?.name}
                </h1>

                {/* 🏷️ Role + Base Price */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
                    {player?.role}
                  </span>
                  <span className="text-amber-400 font-black text-sm tracking-widest">
                    BASE: {formatCurrency(player?.basePrice)}
                  </span>
                </div>

                {/* 📍 Meta Info */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-2">
                  <span className="italic">{player?.village || 'Unknown'}</span>
                  <span className="opacity-30">•</span>
                  <span>{player?.age ? `${player.age} YRS` : 'N/A'}</span>
                </div>

                {/* 🏏 Playing Style */}
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 px-4 py-1 border-t border-white/5">
                  {player?.battingStyle} {player?.bowlingStyle ? `| ${player.bowlingStyle}` : ''}
                </div>

                {/* 💰 Current Bid Section */}
                <div className={`w-full p-6 rounded-2xl flex flex-col items-center transition-all ${bidAmount > 0 ? 'bid-accent-glow' : ''}`}
                  style={{ 
                    background: 'radial-gradient(circle at center, #132f3e, #0c2432)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
                    border: `1px solid ${C.accentBorder}`
                  }}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">
                    {isSold ? 'Sold At' : 'Current Bid'}
                  </p>
                  <div className="relative">
                    <h2 className="text-5xl font-black text-white tabular-nums tracking-tighter" 
                      style={{ textShadow: `0 0 30px ${C.accent}40` }}>
                      {formatCurrency(displayBid)}
                    </h2>
                    {bidAmount > 0 && <div className="absolute -inset-4 bg-accent/20 blur-3xl rounded-full -z-10 animate-pulse"></div>}
                  </div>

                  {highestBidder && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-xl border border-accent/20">
                      {highestBidderLogo && (
                        <div className="w-5 h-5 rounded overflow-hidden border border-white/10">
                          <img src={highestBidderLogo} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <span className="text-[10px] font-black text-white uppercase tracking-tight">
                        {isSold ? 'Purchased by' : 'Leading:'} {highestBidderName}
                      </span>
                    </div>
                  )}
                  </div>
                {/* ⏭️ Next Player Ticker (Standard Mode) */}
                <div className={`absolute -bottom-10 left-0 right-0 mx-4 bg-[#0a0a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,1),0_0_30px_rgba(245,158,11,0.2)] flex items-stretch h-16 z-[30] overflow-hidden transition-all duration-800 ease-in-out ${showNextPill && nextPlayer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                  {nextPlayer && (
                    <>
                      <div className="flex-[1.5] flex flex-col justify-center px-5 border-r border-white/5 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.4em] mb-0.5">UP NEXT</p>
                        <p className="text-base font-black text-white uppercase italic tracking-tight truncate">{nextPlayer.name}</p>
                      </div>
                      <div className="flex-1 bg-amber-500/5 flex flex-col justify-center px-5 border-l border-white/5 relative">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">ROLE</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-amber-500 uppercase">{nextPlayer.role}</p>
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                        </div>
                      </div>
                    </>
                  )}
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
