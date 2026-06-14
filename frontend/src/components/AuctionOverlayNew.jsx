"use client";

import { useState, useEffect } from "react";
import { Users, ClipboardList, Crosshair, X, ChevronRight, TrendingUp, Award, IndianRupee, User } from "lucide-react";
import { API_URL, getMediaUrl, DEFAULT_ASSETS, calculateAge } from "../lib/apiConfig";
import CurrencySymbol from "./CurrencySymbol";

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

const getImgUrl = (p) => {
  if (!p) return DEFAULT_ASSETS.DEFAULT_PLAYER;
  const url = p.imageUrl || p.image || p.photo?.s3 || p.photo?.drive;
  if (!url) return getMediaUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff`);
  return getMediaUrl(url, DEFAULT_ASSETS.DEFAULT_PLAYER);
};

const formatCurrency = (val, unit = '₹') => {
  if (val === undefined || val === null) val = 0;
  const formattedAmount = Number(val).toLocaleString('en-IN');
  
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {unit === '₹' && <IndianRupee className="w-[0.8em] h-[0.8em] stroke-[3px]" />}
      <span>{formattedAmount}</span>
      {unit !== '₹' && <CurrencySymbol unit={unit} className="scale-90 origin-left" />}
    </span>
  );
};

export default function AuctionOverlayNew({ 
  player, 
  nextPlayer,
  teams, 
  currentBid, 
  highestBidder, 
  highestBidderLogo, 
  tournamentName, 
  tournamentLogo,
  roundHistory,
  auctionResult,
  currencyUnit = '₹',
  iconsPerTeam = 2,
  maxSlots = 15
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [squadModal, setSquadModal] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState(null);
  const [lastShownPlayerId, setLastShownPlayerId] = useState(null);
  const [hasShownStatus, setHasShownStatus] = useState(false);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);
  const [showNextPill, setShowNextPill] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [isLoadingAllPlayers, setIsLoadingAllPlayers] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [animatingPlayerCard, setAnimatingPlayerCard] = useState(null);

  const [lastShownNextName, setLastShownNextName] = useState(null);

  // Auto-pop Up Next Pill when nextPlayer changes
  useEffect(() => {
    if (nextPlayer?.name && nextPlayer.name !== lastShownNextName) {
      setShowNextPill(true);
      setLastShownNextName(nextPlayer.name);
      const timer = setTimeout(() => setShowNextPill(false), 7000); 
      return () => clearTimeout(timer);
    }
    
    if (!nextPlayer?.name && lastShownNextName) {
      setLastShownNextName(null);
    }
  }, [nextPlayer?.name, lastShownNextName]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeBottomTab === 'players' && allPlayers.length === 0) {
      const fetchAllPlayers = async () => {
        setIsLoadingAllPlayers(true);
        try {
          const response = await fetch(`${API_URL}/api/tournaments/status/active`);
          if (response.ok) {
            const data = await response.json();
            if (data.players) {
              setAllPlayers(data.players);
            }
          }
        } catch (error) {
          console.error('Failed to fetch all players:', error);
        } finally {
          setIsLoadingAllPlayers(false);
        }
      };
      fetchAllPlayers();
    }
  }, [activeBottomTab, allPlayers.length]);

  useEffect(() => {
    const teamId = squadModal?._id || squadModal?.id;
    if (!squadModal || !teamId) return;
    
    const fetchTeamPlayers = async () => {
      setIsLoadingSquad(true);
      try {
        const response = await fetch(`${API_URL}/api/teams/${teamId}`);
        if (response.ok) {
          const data = await response.json();
          const rawPlayers = data.squad || data.players || data.team?.players || [];
          const uniquePlayers = [];
          const seenIds = new Set();
          
          rawPlayers.forEach(p => {
            const id = p._id || p.id;
            const nameKey = p.name?.toLowerCase().trim();
            if (!seenIds.has(id) && !seenIds.has(nameKey)) {
              if (id) seenIds.add(id);
              if (nameKey) seenIds.add(nameKey);
              uniquePlayers.push(p);
            }
          });

          setSquadModal(prev => ({
            ...prev,
            players: uniquePlayers
          }));
        }
      } catch (error) {
        console.error('Failed to fetch team players:', error);
      } finally {
        setIsLoadingSquad(false);
      }
    };
    
    if (!squadModal.players || squadModal.players.length === 0) {
      fetchTeamPlayers();
    }
  }, [squadModal]);

  const isMobile = windowWidth < 768;

  const normalizedStatus = (player?.status || "").toString().trim().toLowerCase();
  const isSold = normalizedStatus === "sold";
  const isUnsold = normalizedStatus === "unsold";
  const bidAmount = Number(currentBid || 0);
  const baseAmount = Number(player?.basePrice || 0);
  const soldAmount = Number((player?.soldPrice ?? currentBid) || 0);
  const displayBid = isSold ? soldAmount : bidAmount > 0 ? bidAmount : baseAmount;

  useEffect(() => {
    if (!player) return;
    const playerId = player._id || player.name;
    if (playerId !== lastShownPlayerId) {
      setLastShownPlayerId(playerId);
      setHasShownStatus(false);
    }
    if (auctionResult && !hasShownStatus) {
      setHasShownStatus(true);
      const timer = setTimeout(() => {
        setHasShownStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [player, auctionResult, lastShownPlayerId, hasShownStatus]);

  const highestBidderTeam = teams?.find(t => t._id === highestBidder || t.id === highestBidder);
  const highestBidderName = highestBidderTeam?.name || highestBidderTeam?.shortName || highestBidder;

  const handleBottomTab = (tab) => setActiveBottomTab(prev => prev === tab ? null : tab);

  const PlayerGridItem = ({ player, isIcon, idx }) => {
    const playerPrice = player.soldPrice || player.basePrice || 0;
    const isCaptain = player.iconRole === 'captain';
    const isViceCaptain = player.iconRole === 'viceCaptain';
    const isRetained = player.iconRole === 'retained';
    const hasRoleBadge = isCaptain || isViceCaptain || isRetained;
    
    let roleBadgeText = '';
    let roleBadgeColor = '';
    if (isCaptain) { roleBadgeText = 'C'; roleBadgeColor = '#f59e0b'; } 
    else if (isViceCaptain) { roleBadgeText = 'VC'; roleBadgeColor = '#3b82f6'; } 
    else if (isRetained) { roleBadgeText = 'R'; roleBadgeColor = '#10b981'; }

    const isClicked = squadModal.clickedPlayer?._id === (player._id || player.id);

    return (
      <div
        onClick={() => {
          setSquadModal(prev => ({ 
            ...prev, 
            clickedPlayer: prev.clickedPlayer?._id === (player._id || player.id) ? null : player 
          }));
          const modalBody = document.getElementById('squad-modal-body');
          if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="rounded-xl p-3 text-center relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer"
        style={{ 
          background: isClicked ? C.accentSoft : C.bgMain, 
          border: `1px solid ${isClicked ? C.accent : C.border}`,
          boxShadow: isClicked ? `0 0 15px ${C.accentSoft}` : '0 4px 6px rgba(0,0,0,0.3)'
        }}
      >
        {hasRoleBadge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black z-20 shadow-lg"
            style={{ background: roleBadgeColor, color: '#fff', boxShadow: `0 0 10px ${roleBadgeColor}80`, minWidth: '24px', textAlign: 'center' }}>
            {roleBadgeText}
          </div>
        )}
        <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 border-2 mt-4" style={{ borderColor: C.accent }}>
          <img src={getImgUrl(player)} alt={player.name} className="w-full h-full object-cover" />
        </div>
        <p className="text-xs font-bold truncate mb-1" style={{ color: C.textPrimary }}>{player.name}</p>
        <p className="text-[10px] font-medium mb-1" style={{ color: C.textSecondary }}>{player.role}</p>
        <p className="text-sm font-black" style={{ color: C.accent }}>{formatCurrency(playerPrice, currencyUnit)}</p>
      </div>
    );
  };

  const SquadModal = () => !squadModal ? null : (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={() => { if (squadModal.__fromPlayers) setActiveBottomTab('players'); setSquadModal(null); }}>
      <div className="relative w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: C.bgCard, border: `2px solid ${C.accentBorder}`, maxHeight: '90vh', animation: 'modalSlideUp 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg">
                {squadModal.logoUrl
                  ? <img src={getMediaUrl(squadModal.logoUrl, DEFAULT_ASSETS.DEFAULT_TEAM)} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><Users size={24} color={C.textSecondary} /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black truncate" style={{ color: C.textPrimary }}>{squadModal.name || squadModal.shortName}</h2>
                <p className="text-sm mt-0.5" style={{ color: C.accent }}>Budget: {formatCurrency(squadModal.remainingBudget ?? squadModal.budget ?? 10000, currencyUnit)}</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{(squadModal.players || []).length} Players</p>
              </div>
            </div>
            <button onClick={() => { if (squadModal.__fromPlayers) setActiveBottomTab('players'); setSquadModal(null); }}
              className="p-2 rounded-lg transition-all hover:bg-black/60" style={{ background: 'rgba(0,0,0,0.4)', color: C.textSecondary }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div id="squad-modal-body" className="overflow-y-auto p-6 scroll-smooth" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {squadModal.clickedPlayer && squadModal.clickedPlayer.bidHistory && squadModal.clickedPlayer.bidHistory.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: C.bgMain, border: `1px solid ${C.accentBorder}` }}>
              <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 bg-slate-800" style={{ borderColor: C.accent }}>
                    <img src={getImgUrl(squadModal.clickedPlayer)} className="w-full h-full object-cover" alt="" />
                 </div>
                 <div>
                   <p className="text-base font-black uppercase tracking-tight text-white">{squadModal.clickedPlayer.name}</p>
                   <p className="text-[10px] text-amber-400 uppercase font-bold tracking-[0.2em]">Full Bid History</p>
                 </div>
              </div>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar pr-1">
                {[...squadModal.clickedPlayer.bidHistory].reverse().map((bid, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg transition-all" style={{ background: idx === 0 ? C.accentSoft : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? C.accentBorder : 'rgba(255,255,255,0.05)'}` }}>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold" style={{ color: idx === 0 ? C.accent : C.textSecondary }}>#{squadModal.clickedPlayer.bidHistory.length - idx}</span>
                       <span className="text-xs font-bold text-white uppercase tracking-tight">{bid.teamName || 'Unknown Team'}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: idx === 0 ? C.accent : C.textPrimary }}>{formatCurrency(bid.bidAmount || bid.bid || 0, currencyUnit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {squadModal.squadImageUrl && (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: '3/4', maxWidth: '400px', margin: '0 auto' }}>
                <img src={getMediaUrl(squadModal.squadImageUrl)} alt={`${squadModal.name} Squad`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          )}

          {!squadModal.squadImageUrl && (
            <div>
              {isLoadingSquad ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.accent, borderTopColor: 'transparent' }}></div>
                  <p className="text-sm mt-4" style={{ color: C.textSecondary }}>Loading squad...</p>
                </div>
              ) : squadModal.players && squadModal.players.length > 0 ? (
                (() => {
                  const unique = squadModal.players;
                  const displayIconsPerTeam = iconsPerTeam > 0 ? iconsPerTeam : 2;
                  const teamIcons = unique.filter(p => p.isIcon);
                  const soldPlayers = unique.filter(p => !p.isIcon);
                  const effectiveMaxSlots = Math.max(displayIconsPerTeam, teamIcons.length);

                  return (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center justify-between mb-4 px-2">
                          <div className="flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: C.accent }}>Icons / Retained</h3>
                            <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Assigned Elite Players</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{teamIcons.length} / {effectiveMaxSlots} Slots</span>
                        </div>
                        {teamIcons.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {teamIcons.map((player, idx) => (
                              <PlayerGridItem key={player._id || idx} player={player} isIcon={true} idx={idx} />
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No icons assigned</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-4 px-2">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Squad Members</h3>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{soldPlayers.length} Players</span>
                        </div>
                        {soldPlayers.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {soldPlayers.map((player, idx) => (
                              <PlayerGridItem key={player._id || idx} player={player} isIcon={false} idx={idx} />
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No players purchased yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-12 text-center"><p className="text-sm" style={{ color: C.textSecondary }}>No players in squad yet</p></div>
              )}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes modalSlideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes entryPop { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes bidGlow { 0% { box-shadow: 0 0 0px rgba(0, 212, 163, 0); transform: scale(1); } 50% { box-shadow: 0 0 30px rgba(0, 212, 163, 0.4); transform: scale(1.05); } 100% { box-shadow: 0 0 0px rgba(0, 212, 163, 0); transform: scale(1); } }
        .broadcast-card { animation: entryPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .bid-accent-glow { animation: bidGlow 0.4s ease-out; }
      `}</style>
    </div>
  );

  const TeamCard = ({ team, index, onClick }) => {
    const isBidding = team._id === highestBidder || team.id === highestBidder;
    const teamName = team.name || team.shortName || ('Team ' + (index + 1));
    const playersBought = team.players?.length || 0;
    const remainingMandatory = Math.max(0, maxSlots - playersBought);
    const minPrice = (currencyUnit === '₹' || currencyUnit === 'INR') ? 100 : 2;
    const reserveNeeded = Math.max(0, (remainingMandatory - 1) * minPrice);
    const maxBid = (team.remainingBudget ?? team.budget ?? 10000) - reserveNeeded;
    const isMaxedOut = maxBid <= 0;

    return (
      <div className={`flex flex-col gap-1 p-3 rounded-xl cursor-pointer transition-all ${isMaxedOut ? 'opacity-40 grayscale' : 'hover:scale-[1.02]'}`}
        style={{ background: isBidding ? C.accentSoft : C.bgMain, border: `1px solid ${isBidding ? C.accentBorder : isMaxedOut ? 'rgba(239,68,68,0.2)' : C.border}` }}
        onClick={onClick}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5">
            {team.logoUrl
              ? <img src={getMediaUrl(team.logoUrl, DEFAULT_ASSETS.DEFAULT_TEAM)} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center"><Users size={16} color={C.textSecondary} /></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-tight truncate text-white">{teamName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black text-accent">{formatCurrency(team.remainingBudget ?? team.budget ?? 10000, currencyUnit)}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{playersBought}/{maxSlots} SLOTS</span>
            </div>
          </div>
          <ChevronRight size={14} color={isMaxedOut ? '#ef4444' : C.textSecondary} />
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-1.5 px-0.5">
           <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Max Bid:</span>
           <span className={`text-[10px] font-black ${isMaxedOut ? 'text-red-500' : 'text-amber-400'}`}>{formatCurrency(Math.max(0, maxBid), currencyUnit)}</span>
        </div>
      </div>
    );
  };

  const BottomDrawer = () => {
    if (!activeBottomTab || activeBottomTab === 'focus') return null;

    let title = '';
    let content = null;

    if (activeBottomTab === 'players') {
      title = 'Tournament Players';
      const filteredPlayers = allPlayers.filter(p => {
        if (playerFilter === 'all') return true;
        return p.role?.toLowerCase() === playerFilter.toLowerCase();
      });

      content = (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-none border-b border-white/5 shrink-0">
            {['all', 'batsman', 'bowler', 'all-rounder', 'wicket-keeper'].map(role => (
              <button
                key={role}
                onClick={() => setPlayerFilter(role)}
                className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all"
                style={{
                  background: playerFilter === role ? C.accentSoft : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${playerFilter === role ? C.accent : 'rgba(255,255,255,0.05)'}`,
                  color: playerFilter === role ? C.accent : C.textSecondary
                }}
              >
                {role}
              </button>
            ))}
          </div>

          {/* List of Players */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 no-scrollbar">
            {isLoadingAllPlayers ? (
              <div className="py-12 text-center">
                <div className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.accent }}></div>
                <p className="text-xs mt-3 text-slate-500 uppercase font-bold tracking-widest">Loading players...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <p className="text-center py-12 text-xs text-slate-600 uppercase font-black tracking-widest">No players found</p>
            ) : (
              filteredPlayers.map((p, idx) => {
                const isSold = p.status === 'sold';
                const isUnsold = p.status === 'unsold';
                const isPending = p.status === 'pending' || !p.status;
                const statusColor = isSold ? C.accent : isUnsold ? '#ef4444' : '#6b7280';
                
                return (
                  <div key={p._id || idx} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-900 shrink-0">
                        <img src={getImgUrl(p)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-tight truncate">{p.name}</p>
                        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{p.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black" style={{ color: statusColor }}>
                        {isSold ? `SOLD` : isUnsold ? 'UNSOLD' : 'AVAILABLE'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {isSold ? formatCurrency(p.soldPrice || p.basePrice || 0, currencyUnit) : `Base: ${formatCurrency(p.basePrice || 100, currencyUnit)}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    } else if (activeBottomTab === 'squads') {
      title = 'Team Squads';
      content = (
        <div className="space-y-2 overflow-y-auto h-full pr-1 no-scrollbar py-1">
          {teams?.map((team, i) => (
            <TeamCard 
              key={team._id || i} 
              team={team} 
              index={i} 
              onClick={() => {
                setSquadModal({ ...team, __fromPlayers: false });
                setActiveBottomTab(null);
              }} 
            />
          ))}
        </div>
      );
    } else if (activeBottomTab === 'history') {
      title = 'Live Bid History';
      content = (
        <div className="space-y-2 overflow-y-auto h-full pr-1 no-scrollbar py-1">
          {(!roundHistory || roundHistory.length === 0) ? (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No bids placed yet</p>
            </div>
          ) : (
            [...roundHistory].reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5"
                style={{ background: i === 0 ? C.accentSoft : 'transparent', borderColor: i === 0 ? C.accentBorder : 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: i === 0 ? C.accent : C.textSecondary }}>#{roundHistory.length - i}</span>
                  <span className="text-sm font-black text-white uppercase tracking-tight">{h.team}</span>
                </div>
                <span className="text-sm font-black" style={{ color: i === 0 ? C.accent : C.textPrimary }}>{formatCurrency(h.bid, currencyUnit)}</span>
              </div>
            ))
          )}
        </div>
      );
    }

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setActiveBottomTab(null)} />
        
        {/* Drawer */}
        <div className="fixed bottom-[60px] left-0 right-0 z-40 rounded-t-[32px] px-5 pt-5 pb-6 flex flex-col"
          style={{ 
            background: C.bgCard, 
            borderTop: `2px solid ${C.accentBorder}`, 
            maxHeight: '75vh',
            boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Drag Handle Bar */}
          <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4 shrink-0" onClick={() => setActiveBottomTab(null)} />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">{title}</h2>
            <button onClick={() => setActiveBottomTab(null)} className="p-1.5 rounded-full hover:bg-white/5 transition-all text-slate-400">
              <X size={16} />
            </button>
          </div>
          
          {/* Body */}
          <div className="flex-1 overflow-hidden" id="bottom-drawer-body">
            {content}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="h-screen w-screen text-white overflow-hidden relative flex flex-col" style={{ background: C.bgMain, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,163,0.06) 0%, transparent 60%)' }} />
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 md:px-6" style={{ height: '56px', background: C.bgNav, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#ef4444' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#ef4444' }}></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ef4444' }}>Live</span>
        </div>
        <div className="flex items-center gap-3 px-6 border-x border-white/5 truncate">
          {tournamentLogo && (
            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-white p-1 rounded-lg flex items-center justify-center">
              <img src={getMediaUrl(tournamentLogo)} className="w-full h-full object-contain" alt="" />
            </div>
          )}
          <h1 className="text-xs md:text-base font-black uppercase tracking-[0.3em] truncate" style={{ color: C.textPrimary }}>
            {tournamentName ? (tournamentName.toUpperCase().includes('SEASON') ? tournamentName : `${tournamentName} - SEASON 01`) : 'KOLALA PREMIERE LEAGUE - SEASON 01'}
          </h1>
        </div>
        {!isMobile && (
          <button onClick={() => setFocusMode(!focusMode)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: focusMode ? C.accentSoft : 'rgba(255,255,255,0.05)', border: `1px solid ${focusMode ? C.accentBorder : C.border}`, color: focusMode ? C.accent : C.textSecondary }}>
            <Crosshair size={13} /> {focusMode ? 'Exit Focus' : 'Focus Mode'}
          </button>
        )}
      </header>

      {isMobile ? (
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: '60px' }}>
          {!focusMode ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-2xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="relative w-full bg-black/40" style={{ height: '70vw', maxHeight: '450px' }}>
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={getImgUrl(player)} alt="" className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                  </div>
                  <img src={getImgUrl(player)} alt={player?.name || 'Player'} className="w-full h-full relative z-10 object-cover" loading="eager" />
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl rotate-[-10deg] border-[3px] shadow-2xl backdrop-blur-md"
                        style={{ background: isSold ? 'rgba(0, 212, 163, 0.1)' : 'rgba(239,68,68,0.1)', borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}>
                        <span className={`${isSold ? 'text-2xl' : 'text-3xl'} font-black uppercase tracking-[0.2em]`}>{isSold ? 'Sold' : 'Unsold'}</span>
                        {isSold && highestBidder && (
                          <div className="flex flex-col items-center gap-1 mt-1 border-t border-current/20 pt-2 w-full">
                            <p className="text-white text-[9px] font-black uppercase tracking-widest opacity-80">To Team</p>
                            <p className="text-white text-xs font-black uppercase tracking-tight truncate max-w-[120px]">{highestBidderName}</p>
                            <p className="text-white text-base font-black mt-1">{formatCurrency(soldAmount, currencyUnit)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xl font-black uppercase tracking-tight" style={{ color: C.textPrimary }}>{player?.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                    <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">{player?.role || 'Unknown Role'}</span>
                    {(player?.isWicketkeeper || player?.isWk || player?.role?.toLowerCase().includes('wk')) && <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">🧤 Wicketkeeper</span>}
                    {player?.isIcon && <span className="px-2.5 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider">⭐ Icon</span>}
                    <span className="ml-auto text-amber-400 font-black text-xs tracking-widest">BASE: {formatCurrency(player?.basePrice, currencyUnit)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl bg-[#0f2a3a]/40 border border-white/5">
                    <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Village/Town</span><span className="text-xs font-bold text-slate-300 uppercase tracking-widest truncate">{player?.village || player?.town || 'Unknown'}</span></div>
                    <div className="flex flex-col items-end"><span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Age</span><span className="text-xs font-semibold text-slate-300">{(calculateAge(player?.dob) || player?.age) || 'N/A'} YRS</span></div>
                    <div className="col-span-2 pt-2 mt-1 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">🏏 {player?.battingStyle || '-'}</span>
                      {player?.bowlingStyle && player.bowlingStyle !== '-' && <span className="text-[10px] font-medium text-slate-400">🥎 {player.bowlingStyle}</span>}
                    </div>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                    <p className="text-xs font-medium mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                    <p className="text-3xl font-bold" style={{ color: C.accent }}>{formatCurrency(displayBid, currencyUnit)}</p>
                  </div>
                  {highestBidder && (
                    <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: C.bgMain, border: `1px solid ${C.border}` }}>
                      {highestBidderLogo && <img src={getMediaUrl(highestBidderLogo)} className="w-8 h-8 rounded-full object-cover" alt="" />}
                      <div><p className="text-xs" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p><p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-2xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="relative w-full bg-black/40" style={{ height: '80vw', maxHeight: '500px' }}>
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={getImgUrl(player)} alt="" className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                  </div>
                  <img src={getImgUrl(player)} alt={player?.name || 'Player'} className="w-full h-full relative z-10 object-cover" loading="eager" />
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-xl rotate-[-10deg] border-[3px] shadow-2xl backdrop-blur-md"
                        style={{ background: isSold ? 'rgba(0, 212, 163, 0.1)' : 'rgba(239,68,68,0.1)', borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}>
                        <span className={`${isSold ? 'text-3xl' : 'text-4xl'} font-black uppercase tracking-[0.2em]`}>{isSold ? 'Sold' : 'Unsold'}</span>
                        {isSold && highestBidder && (
                          <div className="flex flex-col items-center gap-1 mt-1 border-t border-current/20 pt-3 w-full">
                            <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">To Team</p>
                            <p className="text-white text-sm font-black uppercase tracking-tight truncate max-w-[150px]">{highestBidderName}</p>
                            <p className="text-white text-xl font-black mt-1">{formatCurrency(soldAmount, currencyUnit)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-2xl font-black uppercase tracking-tight" style={{ color: C.textPrimary }}>{player?.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                    <span className="px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">{player?.role || 'Unknown Role'}</span>
                    {(player?.isWicketkeeper || player?.isWk || player?.role?.toLowerCase().includes('wk')) && <span className="px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider">🧤 Wicketkeeper</span>}
                    {player?.isIcon && <span className="px-3 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider">⭐ Icon</span>}
                    <span className="ml-auto text-amber-400 font-black text-sm tracking-widest">BASE: {formatCurrency(player?.basePrice, currencyUnit)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3.5 rounded-xl bg-[#0f2a3a]/40 border border-white/5">
                    <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Village/Town</span><span className="text-sm font-black text-slate-300 uppercase tracking-widest truncate">{player?.village || player?.town || 'Unknown'}</span></div>
                    <div className="flex flex-col items-end"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Age</span><span className="text-sm font-semibold text-slate-300">{(calculateAge(player?.dob) || player?.age) || 'N/A'} YRS</span></div>
                    <div className="col-span-2 pt-2 mt-1 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">🏏 {player?.battingStyle || '-'}</span>
                      {player?.bowlingStyle && player.bowlingStyle !== '-' && <span className="text-xs font-medium text-slate-400">🥎 {player.bowlingStyle}</span>}
                    </div>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                    <p className="text-xs font-medium mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                    <p className="text-4xl font-bold" style={{ color: C.accent }}>{formatCurrency(displayBid, currencyUnit)}</p>
                  </div>
                  {highestBidder && (
                    <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: C.bgMain, border: `1px solid ${C.border}` }}>
                      {highestBidderLogo && <img src={getMediaUrl(highestBidderLogo)} className="w-10 h-10 rounded-full object-cover" alt="" />}
                      <div><p className="text-xs" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p><p className="text-base font-semibold" style={{ color: C.textPrimary }}>{highestBidderName}</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2" style={{ height: '60px', background: C.bgNav, borderTop: `1px solid ${C.border}` }}>
            {[
              { id: 'players', label: 'Players', icon: <User size={18} /> },
              { id: 'squads', label: 'Squads', icon: <Users size={18} /> },
              { id: 'history', label: 'History', icon: <ClipboardList size={18} /> },
              { id: 'focus', label: focusMode ? 'Exit' : 'Focus', icon: <Crosshair size={18} /> },
            ].map(item => {
              const isActive = item.id === 'focus' ? focusMode : activeBottomTab === item.id;
              return (
                <button key={item.id} onClick={() => item.id === 'focus' ? setFocusMode(f => !f) : handleBottomTab(item.id)} className="flex flex-col items-center gap-1 flex-1 py-2 relative" style={{ color: isActive ? C.accent : C.textSecondary }}>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: C.accent }} />}
                  {item.icon} <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid flex-1 overflow-hidden" style={{ gridTemplateColumns: focusMode ? '1fr' : windowWidth < 1024 ? '200px 1fr 220px' : '260px 1fr 280px', gap: '16px', padding: '16px', height: 'calc(100vh - 56px)' }}>
          {!focusMode && (
            <aside className="flex flex-col overflow-hidden rounded-2xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                <Users size={14} color={C.textSecondary} /><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Squads</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {teams?.map((team, i) => (<TeamCard key={team._id || i} team={team} index={i} onClick={() => setSquadModal(team)} />))}
              </div>
            </aside>
          )}
          <main className="flex items-center justify-center">
            {focusMode ? (
              <div className="flex flex-col items-center justify-center w-full h-full p-4">
                <div className="broadcast-card w-[1000px] h-[580px] p-12 rounded-[50px] flex flex-row items-center gap-12 text-left relative overflow-hidden" 
                  style={{ background: 'rgba(10, 18, 30, 0.8)', backdropFilter: 'blur(40px)', boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(0, 212, 163, 0.2)', border: `1px solid rgba(255,255,255,0.15)` }}>
                  <div className="absolute top-8 right-10 flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 px-4 py-1.5 rounded-full animate-pulse z-30">
                    <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
                    <p className="text-red-500 text-[10px] font-black tracking-[0.3em] uppercase">LIVE AUCTION</p>
                  </div>
                  <div className="relative w-[380px] h-[480px] rounded-[32px] overflow-hidden border-2 border-accent/30 shadow-[0_40px_80px_rgba(0,0,0,0.8)] shrink-0 bg-black/40">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img src={getImgUrl(player)} alt="" className="w-full h-full object-cover blur-3xl opacity-30 scale-125" />
                    </div>
                    <img src={getImgUrl(player)} alt={player?.name || 'Player'} className="w-full h-full relative z-10 object-cover" />
                    {hasShownStatus && (isSold || isUnsold) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-xl z-20">
                        <div className="flex flex-col items-center gap-4 px-10 py-6 rounded-[32px] text-5xl font-black uppercase rotate-[-8deg] border-[6px] shadow-[0_0_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                          style={{ background: isSold ? 'rgba(0, 212, 163, 0.05)' : 'rgba(239,68,68,0.05)', borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}>
                          <span className={`${isSold ? 'text-4xl' : 'text-6xl'} tracking-[0.3em] mb-2`}>{isSold ? 'Sold' : 'Unsold'}</span>
                          {isSold && highestBidder && (
                            <div className="flex flex-col items-center gap-2 border-t-2 border-current/20 pt-6 w-full min-w-[240px]">
                              <p className="text-white text-xs font-black tracking-[0.4em] opacity-60">TO TEAM</p>
                              <p className="text-white text-3xl font-black tracking-tighter truncate max-w-[350px]">{highestBidderName}</p>
                              <p className="text-white text-5xl font-black mt-3 tabular-nums" style={{ textShadow: '0 0-30px rgba(255,255,255,0.3)' }}>{formatCurrency(soldAmount, currencyUnit)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col h-full justify-center space-y-8">
                    <div>
                      <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-[0.9]" style={{ textShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>{player?.name}</h1>
                      <div className="flex items-center gap-4 mb-6">
                        <span className="px-4 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">{player?.role}</span>
                        <span className="text-amber-400 font-black text-lg tracking-[0.15em] uppercase">BASE: {formatCurrency(player?.basePrice, currencyUnit)}</span>
                      </div>
                      <div className="flex items-center gap-6 text-base font-bold text-slate-400 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5 w-fit">
                          <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Village:</span><span className="text-white italic uppercase font-black tracking-widest">{player?.village || 'Unknown'}</span>
                        <span className="opacity-20 text-xl font-light">|</span>
                        <div className="flex items-center gap-3"><span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Age:</span><span className="text-white font-black tracking-widest">{(calculateAge(player?.dob) || player?.age) || 'N/A'} YRS</span></div>
                      </div>
                      <div className="flex gap-3 mb-8">
                        <span className="px-3 py-1 rounded-md bg-slate-800/50 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300">🏏 {player?.battingStyle || 'N/A'}</span>
                        {player?.bowlingStyle && player.bowlingStyle !== '-' && <span className="px-3 py-1 rounded-md bg-slate-800/50 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300">🥎 {player.bowlingStyle}</span>}
                        {(player?.isWicketkeeper || player?.isWk || player?.role?.toLowerCase().includes('wk')) && <span className="px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-500">🧤 Wicketkeeper</span>}
                        {player?.isIcon && <span className="px-3 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-black uppercase tracking-widest text-violet-400">⭐ Icon</span>}
                      </div>
                    </div>
                    <div key={bidAmount} className={`w-full p-6 rounded-[28px] flex flex-row items-center justify-between transition-all ${bidAmount > 0 ? 'bid-accent-glow' : ''}`}
                      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)', boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5)', border: `1px solid ${C.accentBorder}` }}>
                      <div className="flex flex-col">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">{isSold ? 'Sold At' : 'Current Bid'}</p>
                        <div className="relative">
                          <h2 className="text-6xl font-black text-white tabular-nums tracking-tighter" style={{ textShadow: `0 0 40px ${C.accent}50` }}>{formatCurrency(displayBid, currencyUnit)}</h2>
                          {bidAmount > 0 && <div className="absolute -inset-6 bg-accent/10 blur-[50px] rounded-full -z-10 animate-pulse"></div>}
                        </div>
                      </div>
                      {highestBidder && (
                        <div className="flex flex-col items-end gap-3 max-w-[240px]">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{isSold ? 'Purchased by' : 'Leading Bidder'}</p>
                           <div className="flex items-center gap-4 px-5 py-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                              {highestBidderLogo && (
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
                                  <img src={getMediaUrl(highestBidderLogo)} className="w-full h-full object-cover" alt="" />
                                </div>
                              )}
                              <span className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[120px]">{highestBidderName}</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="broadcast-card w-[420px] p-8 rounded-[32px] flex flex-col items-center text-center relative" 
                style={{ background: 'rgba(10, 18, 30, 0.7)', backdropFilter: 'blur(24px)', boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0, 212, 163, 0.2)', border: `1px solid rgba(255,255,255,0.12)` }}>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full animate-pulse z-10">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  <p className="text-red-500 text-[9px] font-black tracking-[0.2em] uppercase">LIVE AUCTION</p>
                </div>
                <div className="mt-6 mb-6 relative w-[220px] h-[220px] rounded-2xl overflow-hidden border-2 border-accent/40 shadow-2xl bg-black/40">
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={getImgUrl(player)} alt="" className="w-full h-full object-cover blur-xl opacity-30 scale-110" />
                  </div>
                  <img src={getImgUrl(player)} alt={player?.name || 'Player'} className="w-full h-full relative z-10 object-cover" loading="eager" />
                  {hasShownStatus && (isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl rotate-[-12deg] border-4 shadow-2xl backdrop-blur-md"
                        style={{ background: isSold ? 'rgba(0, 212, 163, 0.05)' : 'rgba(239,68,68,0.05)', borderColor: isSold ? C.accent : '#ef4444', color: isSold ? C.accent : '#ef4444' }}>
                        <span className="text-2xl font-black uppercase tracking-[0.2em]">{isSold ? 'Sold' : 'Unsold'}</span>
                        {isSold && highestBidder && (
                          <div className="flex flex-col items-center gap-0.5 mt-1 border-t border-current/20 pt-2 w-full">
                            <p className="text-white text-[8px] font-black tracking-[0.2em] opacity-60">TO TEAM</p>
                            <p className="text-white text-xs font-black truncate max-w-[120px]">{highestBidderName}</p>
                            <p className="text-white text-sm font-black mt-1">{formatCurrency(soldAmount, currencyUnit)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tight mb-2" style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>{player?.name}</h1>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">{player?.role}</span>
                  <span className="text-amber-400 font-black text-sm tracking-widest">BASE: {formatCurrency(player?.basePrice)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-2"><span className="italic">{player?.village || 'Unknown'}</span><span className="opacity-30">•</span><span>{(calculateAge(player?.dob) || player?.age) ? `${calculateAge(player?.dob) || player?.age} YRS` : 'N/A'}</span></div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 px-4 py-1 border-t border-white/5">{player?.battingStyle} {player?.bowlingStyle ? `| ${player.bowlingStyle}` : ''}</div>
                <div key={bidAmount} className={`w-full p-6 rounded-2xl flex flex-col items-center transition-all ${bidAmount > 0 ? 'bid-accent-glow' : ''}`}
                  style={{ background: 'radial-gradient(circle at center, #132f3e, #0c2432)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)', border: `1px solid ${C.accentBorder}` }}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">{isSold ? (player?.isIcon ? 'Retained At' : 'Sold At') : 'Current Bid'}</p>
                  <div className="relative">
                    <h2 className="text-5xl font-black text-white tabular-nums tracking-tighter" style={{ textShadow: `0 0 30px ${C.accent}40` }}>{formatCurrency(displayBid)}</h2>
                    {bidAmount > 0 && <div className="absolute -inset-4 bg-accent/20 blur-3xl rounded-full -z-10 animate-pulse"></div>}
                  </div>
                  {highestBidder && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-xl border border-accent/20">
                      {highestBidderLogo && (<div className="w-5 h-5 rounded overflow-hidden border border-white/10"><img src={getMediaUrl(highestBidderLogo)} className="w-full h-full object-cover" alt="" /></div>)}
                      <span className="text-[10px] font-black text-white uppercase tracking-tight">{isSold ? (player?.isIcon ? 'Retained by' : 'Purchased by') : 'Leading:'} {highestBidderName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
          {!focusMode && (
            <aside className="flex flex-col gap-3 overflow-hidden">
              <div className="rounded-2xl p-5 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                <p className="text-5xl font-bold" style={{ color: C.accent }}>{displayBid.toLocaleString()} PTS</p>
              </div>
              {highestBidder && (
                <div className="rounded-2xl p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-2"><TrendingUp size={13} color={C.textSecondary} /><p className="text-xs font-medium" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p></div>
                  <div className="flex items-center gap-3 mt-3">{highestBidderLogo && <img src={getMediaUrl(highestBidderLogo)} className="w-10 h-10 rounded-full object-cover" alt="" />}<p className="font-semibold text-lg" style={{ color: C.textPrimary }}>{highestBidderName}</p></div>
                </div>
              )}
              <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <ClipboardList size={14} color={C.textSecondary} /><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Bid History</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(!roundHistory || roundHistory.length === 0)
                    ? <p className="text-center py-10 text-sm" style={{ color: C.textSecondary }}>No bids yet</p>
                    : roundHistory.slice(0, 8).map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: i === 0 ? C.accentSoft : C.bgMain, border: `1px solid ${i === 0 ? C.accentBorder : C.border}` }}>
                        <div className="flex items-center gap-2"><span className="text-xs" style={{ color: C.textSecondary }}>#{roundHistory.length - i}</span><span className="text-sm font-medium" style={{ color: C.textPrimary }}>{h.team}</span></div>
                        <span className="text-sm font-bold" style={{ color: C.accent }}>{formatCurrency(h.bid, currencyUnit)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {player?.type === 'ROUND' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, #1a0533 0%, #0a0015 60%, #000 100%)', animation: 'fadeInOut 3.5s ease forwards' }}>
          <style jsx>{`
            @keyframes fadeInOut { 0% { opacity: 0; transform: scale(0.95); } 15% { opacity: 1; transform: scale(1); } 85% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
            @keyframes floatGlow { 0%, 100% { text-shadow: 0 0 30px #a855f7, 0 0 60px #7c3aed; } 50% { text-shadow: 0 0 60px #c084fc, 0 0 120px #a855f7; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
          <div className="text-center px-10" style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <p className="text-[12px] font-black uppercase tracking-[0.6em] text-purple-400 mb-6 opacity-80">Auction Phase</p>
            <h1 className="text-7xl sm:text-9xl font-black uppercase tracking-widest text-white mb-6 italic" style={{ animation: 'floatGlow 2s ease-in-out infinite' }}>{player.label}</h1>
            <div className="flex items-center gap-6 justify-center">
              <div className="h-px w-24 bg-linear-to-r from-transparent to-purple-500/50"></div>
              <p className="text-2xl font-black uppercase tracking-[0.5em] text-purple-300/80">{player.subtitle}</p>
              <div className="h-px w-24 bg-linear-to-l from-transparent to-purple-500/50"></div>
            </div>
            <p className="text-[11px] text-purple-500/40 font-black uppercase tracking-[0.4em] mt-12 animate-pulse">Initializing Round...</p>
          </div>
        </div>
      )}

      <SquadModal />
      <BottomDrawer />
      
      {animatingPlayerCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl"
            style={{ background: 'radial-gradient(circle at center, #132f3e, #0c2432)', border: `2px solid ${C.accent}`, boxShadow: `0 0 50px ${C.accentSoft}`, animation: 'cinematicPopAndFade 3.5s forwards cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 mb-4 bg-slate-800 shadow-[0_0_30px_rgba(0,212,163,0.4)]" style={{ borderColor: C.accent }}>
              <img src={getImgUrl(animatingPlayerCard.player)} className="w-full h-full object-cover" alt="" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-2">{animatingPlayerCard.player.name}</h2>
            <p className="text-sm font-bold tracking-[0.3em] uppercase text-slate-400 mb-6">{animatingPlayerCard.player.role}</p>
            <div className="flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${C.accentBorder}` }}>
              {animatingPlayerCard.teamObj.logoUrl && <img src={getMediaUrl(animatingPlayerCard.teamObj.logoUrl, DEFAULT_ASSETS.DEFAULT_TEAM)} className="w-8 h-8 rounded-full" alt="" />}
              <span className="text-xl font-bold text-amber-400">Sold to {animatingPlayerCard.teamObj.name}</span>
            </div>
          </div>
          <style jsx>{`
            @keyframes cinematicPopAndFade {
              0% { transform: scale(0.6) translateY(50px); opacity: 0; filter: blur(10px); }
              15% { transform: scale(1.05) translateY(-10px); opacity: 1; filter: blur(0px); }
              25% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0px); }
              85% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0px); }
              100% { transform: scale(1.3) translateY(-40px); opacity: 0; filter: blur(15px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
