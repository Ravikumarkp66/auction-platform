"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, ClipboardList, Crosshair, X, ChevronRight, TrendingUp, Award } from "lucide-react";
import ResultOverlay from "./ResultOverlay";

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
  roundHistory 
}) {
  const router = useRouter();
  const [focusMode, setFocusMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [squadModal, setSquadModal] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [resultData, setResultData] = useState(null);
  const prevStatusRef = useRef(player?.status);
  const prevPlayerIdRef = useRef(player?._id || player?.id);

  const highestBidderTeam = teams?.find(t => t._id === highestBidder || t.id === highestBidder);
  const highestBidderName = highestBidderTeam?.name || highestBidderTeam?.shortName || highestBidder;

  useEffect(() => {
    const currentStatus = player?.status?.toLowerCase();
    const currentId = player?._id || player?.id;
    const prevStatus = prevStatusRef.current?.toLowerCase();
    const prevId = prevPlayerIdRef.current;

    // Trigger overlay when current player status flips to sold/unsold
    if (currentId === prevId && currentStatus !== prevStatus) {
      if (currentStatus === "sold" || currentStatus === "unsold") {
        const bidAmt = Number(currentBid || 0);
        const baseAmt = Number(player?.basePrice || 0);
        const soldAmt = Number((player?.soldPrice ?? currentBid) || 0);
        const calcBid = currentStatus === "sold" ? soldAmt : bidAmt > 0 ? bidAmt : baseAmt;

        setResultData({
          type: currentStatus.toUpperCase(),
          playerId: currentId,
          playerName: player?.name,
          price: calcBid,
          teamName: highestBidderName,
          teamLogo: highestBidderLogo || highestBidderTeam?.logoUrl,
          playerImage: player?.photo?.s3 || player?.photo?.drive || player?.imageUrl || player?.image
        });
      } else {
        setResultData(null); // Handled "revert sale" edge case
      }
    }

    // Keep the overlay UP until the admin starts bidding on the NEXT player
    if (resultData && Number(currentBid || 0) > 0 && currentId !== resultData.playerId) {
      setResultData(null); // 💥 Drops the overlay exactly when the next bid occurs!
    }

    prevStatusRef.current = player?.status;
    prevPlayerIdRef.current = currentId;
  }, [
    player?.status, player?._id, player?.id, player?.name, player?.basePrice, 
    player?.soldPrice, player?.photo, player?.imageUrl, player?.image,
    currentBid, highestBidderName, resultData
  ]);

  const isMobile = windowWidth < 768;

  const normalizedStatus = (player?.status || "").toString().trim().toLowerCase();
  const isSold = normalizedStatus === "sold";
  const isUnsold = normalizedStatus === "unsold";
  const bidAmount = Number(currentBid || 0);
  const baseAmount = Number(player?.basePrice || 0);
  const soldAmount = Number((player?.soldPrice ?? currentBid) || 0);
  const displayBid = isSold ? soldAmount : bidAmount > 0 ? bidAmount : baseAmount;

  const handleBottomTab = (tab) => setActiveBottomTab(prev => prev === tab ? null : tab);

  // ─── Shared Squad Detail Modal ───────────────────────────────────────────
  const renderSquadModal = () => !squadModal ? null : (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={() => setSquadModal(null)}
    >
      <div
        className="relative w-full md:max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{ background: C.bgCard, border: `1px solid ${C.accentBorder}`, maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: C.border }}></div>
        </div>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
              {squadModal.logoUrl
                ? <img src={squadModal.logoUrl} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center"><Users size={18} color={C.textSecondary} /></div>
              }
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: C.textPrimary }}>{squadModal.name || squadModal.shortName}</p>
              <p className="text-xs" style={{ color: C.accent }}>Budget: ₹{(squadModal.remainingBudget ?? squadModal.budget ?? 10000).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={() => setSquadModal(null)} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>
        {/* player list */}
        <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: '60vh' }}>
          {(!squadModal.players || squadModal.players.length === 0) ? (
            <p className="text-center py-10 text-sm" style={{ color: C.textSecondary }}>No players in squad yet</p>
          ) : squadModal.players.map((p, i) => (
            <div key={p._id || i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.bgMain, border: `1px solid ${C.border}` }}>
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#0f2a3a' }}>
                {(p.image || p.imageUrl)
                  ? <img src={p.image || p.imageUrl} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><Users size={14} color={C.textSecondary} /></div>
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{p.name}</p>
                <p className="text-xs" style={{ color: C.textSecondary }}>{p.role}</p>
              </div>
              {p.soldPrice && <span className="text-xs font-bold" style={{ color: C.accent }}>₹{p.soldPrice.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Team card (shared between sidebar + bottom sheet) ────────────────────
  const renderTeamCard = (team, index, onClick) => {
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
          <p className="text-xs font-bold" style={{ color: C.accent }}>₹{(team.remainingBudget ?? team.budget ?? 10000).toLocaleString()}</p>
        </div>
        <ChevronRight size={14} color={C.textSecondary} />
      </div>
    );
  };

  // ─── Bottom Sheet Backdrop ────────────────────────────────────────────────
  const renderBottomSheetBackdrop = () => (
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
          MOBILE LAYOUT (70 / 30 Split)
      ══════════════════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div className="relative z-10 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px - 60px)', background: C.bgMain }}>
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Player Image (70%) */}
            <div className="h-[70%] w-full relative flex-shrink-0 overflow-hidden" style={{ background: '#000' }}>
              <Image
                src={player?.image || player?.imageUrl || '/players/default.png'}
                alt={player?.name || 'Player'}
                fill 
                className="object-cover" 
                style={{ objectPosition: 'top center' }} 
                unoptimized
              />
              
              {/* Sold/Unsold Status */}
              {(isSold || isUnsold) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div
                    className="px-10 py-4 rounded-3xl text-4xl font-black uppercase tracking-[0.2em] rotate-[-12deg] shadow-2xl scale-110"
                    style={{
                      background: isSold ? 'rgba(0, 212, 163, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: `4px solid ${isSold ? C.accent : '#ef4444'}`,
                      color: isSold ? C.accent : '#ef4444',
                      textShadow: `0 0 20px ${isSold ? C.accent : '#ef4444'}`
                    }}
                  >{isSold ? 'SOLD' : 'UNSOLD'}</div>
                </div>
              )}

              {/* Identity Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,1))' }}>
                <p className="text-3xl font-black italic uppercase tracking-tight text-white drop-shadow-lg leading-tight">
                  {player?.applicationId && <span className="text-sm border border-white/20 px-2 py-0.5 rounded-lg mr-2 align-middle font-black tabular-nums opacity-60">#{player.applicationId}</span>}
                  {player?.name}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-1" style={{ color: C.accent }}>{player?.role}</p>
              </div>
            </div>

            {/* Auction Stats (Remaining 30%) */}
            <div className="flex-1 flex flex-col justify-center px-6 py-4 bg-[#0a1a23] relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00d4a3] to-transparent opacity-30"></div>
              
              <div className="flex items-center justify-between gap-4">
                {highestBidder ? (
                   <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Sold to' : 'Leading'}</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-black/40 border border-white/5 p-1">
                            {highestBidderLogo ? (
                              <img src={highestBidderLogo} className="w-full h-full object-contain" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-black">?</div>
                            )}
                         </div>
                         <p className="text-lg font-black uppercase tracking-tight truncate text-white">{highestBidderName}</p>
                      </div>
                   </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#475569]">Status</p>
                    <p className="text-xl font-black uppercase text-[#475569]">Awaiting Bid</p>
                  </div>
                )}

                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm font-black" style={{ color: C.accent }}>₹</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter" style={{ color: C.accent }}>{displayBid.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
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

          {/* Overlays */}
          {!focusMode && activeBottomTab === 'squads' && (
            <>
              {renderBottomSheetBackdrop()}
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
                    <div key={team._id || i}>
                      {renderTeamCard(team, i, () => router.push(`/team/${team._id || team.id}`))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!focusMode && activeBottomTab === 'history' && (
            <>
              {renderBottomSheetBackdrop()}
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
                        <span className="text-sm font-bold" style={{ color: C.accent }}>₹{h.bid.toLocaleString()}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          )}
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
                  <div key={team._id || i}>
                    {renderTeamCard(team, i, () => router.push(`/team/${team._id || team.id}`))}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Center — Player */}
          <main className="flex items-center justify-center">
            {focusMode ? (
              <div className="flex w-full max-w-5xl gap-10 items-center px-6">
                <div className="flex-1 relative overflow-hidden rounded-2xl" style={{ height: '70vh', border: `1px solid ${C.border}` }}>
                  <Image src={player?.image || player?.imageUrl || '/players/default.png'} alt={player?.name || 'Player'} fill className="object-cover" unoptimized />
                  {(isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="px-8 py-3 rounded-xl text-4xl font-bold uppercase tracking-widest rotate-[-10deg]"
                        style={{ background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)', border: `2px solid ${isSold ? C.accent : '#ef4444'}`, color: isSold ? C.accent : '#ef4444' }}
                      >{isSold ? 'Sold' : 'Unsold'}</div>
                    </div>
                  )}
                </div>
                <div className="w-72 flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-semibold" style={{ color: C.textPrimary }}>{player?.name}</p>
                    <p className="text-sm mt-1" style={{ color: C.textSecondary }}>{player?.role}</p>
                  </div>
                  <div className="rounded-2xl p-6 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                    <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                    <p className="text-5xl font-bold" style={{ color: C.accent }}>₹{displayBid.toLocaleString()}</p>
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
                <div className="relative overflow-hidden rounded-t-2xl" style={{ height: '420px', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
                  <Image src={player?.image || player?.imageUrl || '/players/default.png'} alt={player?.name || 'Player'} fill className="object-cover" unoptimized />
                  {(isSold || isUnsold) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="px-6 py-2 rounded-xl text-3xl font-bold uppercase tracking-widest rotate-[-10deg]"
                        style={{ background: isSold ? C.accentSoft : 'rgba(239,68,68,0.15)', border: `2px solid ${isSold ? C.accent : '#ef4444'}`, color: isSold ? C.accent : '#ef4444' }}
                      >{isSold ? 'Sold' : 'Unsold'}</div>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 rounded-b-2xl" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: 'none' }}>
                  <p className="text-xl font-semibold flex items-center gap-3" style={{ color: C.textPrimary }}>
                    {player?.applicationId && <span className="text-xs border border-white/20 px-1.5 py-0.5 rounded-md opacity-50 font-black tabular-nums">#{player.applicationId}</span>}
                    {player?.name}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>{player?.role}</p>
                </div>
              </div>
            )}
          </main>

          {/* Right — Bid Tracking */}
          {!focusMode && (
            <aside className="flex flex-col gap-3 overflow-hidden">
              <div className="rounded-2xl p-5 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
                <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{isSold ? 'Final Price' : 'Current Bid'}</p>
                <p className="text-5xl font-bold" style={{ color: C.accent }}>₹{displayBid.toLocaleString()}</p>
              </div>

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
                      <span className="text-sm font-bold" style={{ color: C.accent }}>₹{h.bid.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Squad detail modal */}
      {renderSquadModal()}

      {/* Cinematic Result Overlay */}
      {resultData && (
        <ResultOverlay
          type={resultData.type}
          playerName={resultData.playerName}
          price={resultData.price}
          teamName={resultData.teamName}
          teamLogo={resultData.teamLogo}
          playerImage={resultData.playerImage}
        />
      )}
    </div>
  );
}
