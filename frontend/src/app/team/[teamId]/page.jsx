"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { FaUsers, FaBolt, FaArrowLeft, FaDownload } from "react-icons/fa"
import { MdAttachMoney } from "react-icons/md"
import { GiCricketBat, GiTargetArrows } from "react-icons/gi"
import html2canvas from "html2canvas";
import "./team-squad.css"

const getProxiedUrl = (url) => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;
  return `${process.env.NEXT_PUBLIC_API_URL}/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
};

// Simple Player Display - Profile image with price and name below
const PlayerItem = ({ player }) => {
  if (!player) return null;
  
  return (
    <div className="player-card" style={{ width: '80px', textAlign: 'center' }}>
      <div style={{
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #00ffcc',
        boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)'
      }}>
        <Image
          src={player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
          alt={player.name}
          width={70}
          height={70}
          style={{ objectFit: 'cover' }}
        />
      </div>
      <span style={{
        fontSize: '12px',
        color: '#00ffcc',
        fontWeight: 'bold'
      }}>₹{player.soldPrice?.toLocaleString() || 0}</span>
      <span style={{
        fontSize: '12px',
        color: 'white',
        fontWeight: 'bold',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>{player.name}</span>
    </div>
  );
};

// Player Row Component - Glass card layout
const PlayerRow = ({ title, players, icon }) => {
  return (
    <div className="glass-card">
      <div className="section-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          {title}
        </span>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>
          ({players.length})
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '10px 0',
      }}>
        {players.length === 0 ? (
          <span className="empty-state">No players yet</span>
        ) : (
          players.map((player, index) => (
            <PlayerItem key={player._id || player.id || index} player={player} />
          ))
        )}
      </div>
    </div>
  );
};

function TeamSquadContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const teamId = params.teamId
  const tournamentId = searchParams.get('tournament')
  const [squadBg, setSquadBg] = useState('/backgrounds/squad-bg.jpg')
  const [activeAssets, setActiveAssets] = useState({
    squadBgUrl: "/backgrounds/squad-bg.jpg",
    badges: { leftBadge: "/badges/squad-badge.png", rightBadge: "/badges/badge.png" }
  })

  // Fetch images logic removed in favor of integrated tournament.assets

  const downloadSquad = async () => {
    const element = document.getElementById("squad-download");
    if (!element) return;
    
    // Make visible but keep off-screen for capture
    element.style.display = "block";
    
    try {
      // Slightly lower scale (1.5) for much faster processing while keeping detail
      const canvas = await html2canvas(element, {
        backgroundColor: "#020617",
        scale: 1.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        imageTimeout: 0 // Don't wait too long for images
      });

      const link = document.createElement("a");
      link.download = `${team?.name || 'squad'}.png`;
      link.href = canvas.toDataURL("image/png", 0.8); // 0.8 quality for speed
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      element.style.display = "none";
    }
  };

  // Fetch team and players data from API
  useEffect(() => {
    if (!teamId) return

    const fetchTeamSquad = async () => {
      try {
        // Try the teams API first
        let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${teamId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('Team fetched from API:', data.name, 'Logo:', data.logo || data.logoUrl)
          setTeam({
            ...data,
            logo: data.logo || data.logoUrl, // Ensure logo is set from logoUrl
            purse: data.purse || data.remainingBudget || 0
          })
          setPlayers(data.squad || [])
          setLoading(false)
          return
        }
        
        // Fallback to tournament data if teams API fails
        console.log('Teams API not available, trying tournament data...')
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}`)
        
        if (res.ok) {
          const tournamentData = await res.json()
          
          // Apply Context-Specific Brading
          if (tournamentData.tournament?.assets) {
             const tAssets = tournamentData.tournament.assets;
             setActiveAssets({
                squadBgUrl: tAssets.squadBgUrl || "/backgrounds/squad-bg.jpg",
                badges: tAssets.badges || { leftBadge: "/badges/squad-badge.png", rightBadge: "/badges/badge.png" }
             });
             setSquadBg(tAssets.squadBgUrl || "/backgrounds/squad-bg.jpg");
          }

          const foundTeam = tournamentData.teams?.find(t => t._id === teamId)
          
          if (foundTeam) {
            console.log('Team found in tournament data:', foundTeam.name)
            setTeam({
              ...foundTeam,
              logo: foundTeam.logoUrl || foundTeam.logo,
              purse: foundTeam.remainingBudget || foundTeam.purse || 0
            })
            setPlayers(tournamentData.players?.filter(p => p.team === teamId) || [])
            setLoading(false)
            return
          }
        }
        
        throw new Error('Team not found')
      } catch (err) {
        console.error('Failed to fetch team squad:', err)
        setError('Failed to load team squad')
        setLoading(false)
      }
    }

    fetchTeamSquad()
  }, [teamId, tournamentId])


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading team squad...</div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Team Not Found</h1>
          <p className="text-slate-400 mb-6">{error || "The requested team could not be found."}</p>
          <Link 
            href="/teams" 
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    )
  }

  const squad = team.squad || players || []
  return (
    <div className="page-wrapper" style={{
      background: `linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.5)), url('${squadBg}') center/cover no-repeat fixed`,
      color: 'white'
    }}>

      {/* TOURNAMENT BADGES (EXTREME RIGHT POSITIONING) */}
      <img 
        src={activeAssets.badges?.leftBadge || "/badges/squad-badge.png"}
        crossOrigin="anonymous" 
        alt="Tournament Badge" 
        className="badge-top"
      />
      <img 
        src={activeAssets.badges?.rightBadge || "/badges/badge.png"}
        crossOrigin="anonymous" 
        alt="Creator Logo" 
        className="badge-bottom"
      />

      <div className="page">
        {/* HEADER */}
        <div className="header">
          {/* Top Bar with Navigation and Download */}
          <div className="top-bar">
            {/* Back Button */}
            <Link 
              href={tournamentId ? `/teams?tournament=${tournamentId}` : "/teams"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '10px 16px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
              }}
            >
              <FaArrowLeft /> Back
            </Link>

            <button 
              onClick={downloadSquad}
              className="download-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(0, 255, 204, 0.1)',
                border: '1px solid rgba(0, 255, 204, 0.4)',
                color: '#00ffcc',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 204, 0.2)'
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 204, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <FaDownload /> Download Squad
            </button>
          </div>

          {/* CENTERED TEAM LOGO HEADER */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 20px 20px'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(0, 255, 204, 0.5)',
              boxShadow: '0 0 30px rgba(0, 255, 204, 0.3)',
              marginBottom: '16px'
            }}>
              <Image
                src={team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`}
                alt={team.name}
                width={100}
                height={100}
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            
            <h1>{team.name}</h1>
            
            <p>
              {squad.length} Players • <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{team.purse?.toLocaleString() || team.remainingBudget?.toLocaleString() || 0} Purse</span>
            </p>
          </div>
        </div>

        {/* MAIN CONTENT WITH SIDEBAR */}
        <div className="content">
          {(() => {
            // Use local copies of player groups to avoid recalculating unnecessarily in larger blocks
            // Separate icon players (isIcon = true) from auction players
            const iconPlayers = squad.filter(p => !!p.isIcon)
            const auctionPlayers = squad.filter(p => !p.isIcon && p.status === 'sold')
            
            const batsmen = auctionPlayers.filter(p => p.role?.toLowerCase().includes('bat'))
            const allrounders = auctionPlayers.filter(p => p.role?.toLowerCase().includes('all'))
            const bowlers = auctionPlayers.filter(p => p.role?.toLowerCase().includes('bowl'))
            const others = auctionPlayers.filter(p => 
              !batsmen.includes(p) && !allrounders.includes(p) && !bowlers.includes(p)
            )

            return (
              <>
                {/* LEFT PANEL - Icon Players */}
                <div className="left-panel">
                  <div className="glass-card">
                    <div className="section-header" style={{ justifyContent: 'center', marginBottom: '15px' }}>
                      ⭐ Icon Players
                    </div>
                    
                    {iconPlayers.length === 0 ? (
                      <p className="empty-state" style={{ textAlign: 'center' }}>
                        No icon players
                      </p>
                    ) : (
                      <div className="icon-list">
                        {iconPlayers.map((player, index) => (
                          <div key={player._id || player.id || index} className="player-card">
                            <div style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '3px solid #10b981',
                              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                            }}>
                              <Image
                                src={player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                                alt={player.name}
                                width={80}
                                height={80}
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>RETAINED</span>
                            <span style={{ fontSize: '12px', color: 'white', fontWeight: 'bold', textAlign: 'center', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT PANEL - Auction Players */}
                <div className="right-panel">
                  <PlayerRow title="Batsmen" players={batsmen} icon={<GiCricketBat />} />
                  <PlayerRow title="All-Rounders" players={allrounders} icon={<FaBolt />} />
                  <PlayerRow title="Bowlers" players={bowlers} icon={<GiTargetArrows />} />
                  {others.length > 0 && (
                    <PlayerRow title="Others" players={others} icon={<FaUsers />} />
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {/* HIDDEN EXPORT SECTION (Rendered off-screen for capture) */}
        <div id="squad-download" style={{
          position: 'fixed',
          left: '-5000px',
          top: '0',
          width: '1200px',
          height: 'auto',
          minHeight: '1200px',
          background: `url('${getProxiedUrl(squadBg)}') center/cover no-repeat`,
          backgroundColor: '#020617',
          padding: '60px 40px',
          display: 'none',
          zIndex: -9999,
          fontFamily: 'sans-serif'
        }}>
          {/* Overlay for Export */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(11, 28, 44, 0.6), rgba(11, 28, 44, 0.4))',
            zIndex: 1
          }}></div>

          {/* Team Info in Export */}
          <div style={{ 
            position: 'relative', 
            zIndex: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginBottom: '50px' 
          }}>
            <img 
              src={getProxiedUrl(team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`)} 
              crossOrigin="anonymous" 
              style={{ width: '130px', height: '130px', borderRadius: '50%', border: '6px solid #00ffcc', objectFit: 'cover', marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.1)' }} 
              alt=""
            />
            <h1 style={{ color: 'white', fontSize: '64px', margin: '0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px' }}>{team.name}</h1>
            <div style={{ height: '4px', width: '120px', background: '#00ffcc', margin: '20px auto' }}></div>
            <p style={{ color: '#00ffcc', fontSize: '32px', margin: '0', fontWeight: '500', letterSpacing: '2px' }}>OFFICIAL SQUAD</p>
          </div>

          {/* Player Grid in Export - DYNAMIC SCALING based on squad size */}
          {(() => {
            const squadSize = squad.length;
            let columns = 5;
            let imgSize = '100px';
            let nameSize = '16px';
            let metaSize = '13px';
            let contactSize = '11px';
            let itemWidth = '160px';
            let gap = '30px 20px';

            if (squadSize > 15 && squadSize <= 24) {
              columns = 6;
              imgSize = '85px';
              nameSize = '14px';
              metaSize = '12px';
              contactSize = '10px';
              itemWidth = '140px';
              gap = '25px 15px';
            } else if (squadSize > 24) {
              columns = 7;
              imgSize = '70px';
              nameSize = '12px';
              metaSize = '11px';
              contactSize = '9px';
              itemWidth = '120px';
              gap = '20px 10px';
            }

            return (
              <div style={{ 
                position: 'relative', 
                zIndex: 3, 
                display: 'grid', 
                gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                gap: gap,
                justifyItems: 'center',
                padding: '0 40px',
                width: '100%'
              }}>
                {squad.map((player, idx) => (
                  <div key={idx} style={{ textAlign: 'center', width: itemWidth }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={getProxiedUrl(player.photo?.s3 || player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`)} 
                        crossOrigin="anonymous" 
                        style={{ width: imgSize, height: imgSize, borderRadius: '50%', border: '3px solid white', objectFit: 'cover', background: 'rgba(255,255,255,0.1)' }} 
                        alt=""
                      />
                      {player.isIcon && (
                        <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#10b981', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>ICON</div>
                      )}
                    </div>
                    <div style={{ 
                      color: 'white', 
                      fontWeight: '900', 
                      fontSize: nameSize, 
                      lineHeight: '1.1',
                      marginTop: '8px', 
                      marginBottom: '2px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      textTransform: 'uppercase'
                    }}>{player.name}</div>
                    
                    <div style={{ color: '#00ffcc', fontSize: metaSize, fontWeight: 'bold', marginBottom: '2px' }}>
                      {player.isIcon ? 'RETAINED' : `₹${player.soldPrice?.toLocaleString() || 0}`}
                    </div>
                    
                    <div style={{ color: '#ffffff', fontSize: contactSize, fontWeight: '800', opacity: 0.9, marginBottom: '2px' }}>
                      {player.mobile || player.phone || 'NO CONTACT'}
                    </div>

                    <div style={{ color: '#fbbf24', fontSize: contactSize, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
                      {player.role || 'Player'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}

export default function TeamSquadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <TeamSquadContent />
    </Suspense>
  )
}
